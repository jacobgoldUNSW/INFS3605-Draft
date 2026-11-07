import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { openStore, publicUser } from './store/index.js'
import { agentStep, geminiReady, personaliseDashboard, transcribeAudio, PRIMARY_MODEL, FALLBACK_MODEL } from './gemini.js'
import { beaCheckup, beaPlan, cleanTranscript } from './bea.js'
import { DEFAULT_SURVEY } from '../src/data/mockDashboard.js'
import { PRODUCTS } from '../src/data/products.js'
import { EVENTS, fallbackAgentStep } from '../shared/agentScenarios.js'
import { fallbackPersonalisation } from '../shared/personalise.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const TOOL_IDS = new Set(PRODUCTS.map((p) => p.id))

// JWT secret: env, else generated once and kept next to the database.
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET.trim()
  const dir = process.env.BREWMIND_DATA_DIR || path.join(here, 'data')
  const f = path.join(dir, '.jwt_secret')
  try { return fs.readFileSync(f, 'utf8').trim() } catch {
    const s = crypto.randomBytes(48).toString('hex')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(f, s)
    return s
  }
}

const bad = (res, status, error, extra) => res.status(status).json({ error, ...extra })
const sha = (s) => crypto.createHash('sha256').update(s).digest()

/** Keep only fields we know about, so the DB never stores junk. */
function cleanSurvey(s) {
  if (!s || typeof s !== 'object') return undefined
  const out = { ...DEFAULT_SURVEY }
  if (typeof s.name === 'string') out.name = s.name.slice(0, 60)
  for (const k of ['employees', 'revenue', 'cafeType', 'goal']) if (typeof s[k] === 'string') out[k] = s[k].slice(0, 20)
  if (Array.isArray(s.pains)) out.pains = s.pains.filter((p) => typeof p === 'string').slice(0, 8)
  if (Number.isInteger(s.tech)) out.tech = Math.max(1, Math.min(4, s.tech))
  if (typeof s.rant === 'string') out.rant = s.rant.slice(0, 400)
  return out
}
const cleanSelected = (sel) => (Array.isArray(sel) ? [...new Set(sel.filter((id) => TOOL_IDS.has(id)))] : undefined)
/** Bea's two conversations, kept with the plan so they pick up where they left off. */
const DAY_IDS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function cleanSchedule(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.sessions)) return null
  const sessions = s.sessions
    .filter((x) => x && TOOL_IDS.has(x.toolId) && DAY_IDS.includes(x.day))
    .slice(0, 20)
    .map((x) => ({ week: Math.max(1, Math.min(12, Math.round(Number(x.week) || 1))), day: x.day, toolId: x.toolId, tool: String(x.tool || '').slice(0, 40), minutes: Math.max(5, Math.min(240, Math.round(Number(x.minutes) || 30))), what: String(x.what || '').slice(0, 140) }))
  return sessions.length ? { timeOfDay: ['morning', 'afternoon', 'evening'].includes(s.timeOfDay) ? s.timeOfDay : 'afternoon', sessions } : null
}
// setup steps the owner has ticked off, as "toolId:stepIndex"
const cleanDone = (d) => (Array.isArray(d) ? [...new Set(d.filter((x) => typeof x === 'string' && /^[a-z]{2,20}:\d{1,2}$/.test(x)))].slice(0, 120) : [])
const cleanChat = (c) => (c && typeof c === 'object' ? { checkup: cleanTranscript(c.checkup), plan: cleanTranscript(c.plan), schedule: cleanSchedule(c.schedule), done: cleanDone(c.done) } : undefined)

/**
 * The whole API as an Express app, without listening: server/index.js runs it locally, and the hosted
 * build hands it to Cloud Run. With GATE_PASSWORD set, everything but /api/health and /api/gate needs the
 * group password first (case doesn't matter), so nobody else can make accounts or spend Gemini tokens.
 */
export async function createApp() {
  const store = await openStore()
  const SECRET = jwtSecret()
  const sign = (u) => jwt.sign({ sub: u.id }, SECRET, { expiresIn: '30d' })

  // ---------------------------------------------------------------- the group password
  const GATE = (process.env.GATE_PASSWORD || '').trim().toLowerCase()
  const gateOn = GATE.length > 0
  // changing the password locks everyone out again: passes carry a fingerprint of the password they opened
  const gatePrint = gateOn ? crypto.createHmac('sha256', SECRET).update(GATE).digest('hex').slice(0, 16) : ''
  const gatePass = (req) => {
    if (!gateOn) return true
    const t = req.headers['x-brewmind-gate']
    if (typeof t !== 'string' || !t) return false
    try { return jwt.verify(t, SECRET).gate === gatePrint } catch { return false }
  }
  // slow down guessing: a few tries per visitor, and a ceiling for everyone together
  const tries = new Map()
  let allTries = { n: 0, reset: 0 }
  const mayGuess = (ip) => {
    const now = Date.now()
    if (now > allTries.reset) allTries = { n: 0, reset: now + 60 * 60 * 1000 }
    if (allTries.n >= 300) return false
    const t = tries.get(ip)
    if (!t || now > t.reset) { tries.set(ip, { n: 0, reset: now + 10 * 60 * 1000 }); return true }
    return t.n < 12
  }
  const missed = (ip) => {
    allTries.n += 1
    const t = tries.get(ip)
    if (t) t.n += 1
    if (tries.size > 5000) tries.clear()
  }

  async function requireAuth(req, res, next) {
    const h = req.headers.authorization || ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : null
    if (!token) return bad(res, 401, 'Please sign in first.')
    let sub
    try { ({ sub } = jwt.verify(token, SECRET)) } catch { return bad(res, 401, 'Your session has expired — please sign in again.') }
    const user = sub != null ? await store.findUserById(sub) : null
    if (!user) return bad(res, 401, 'Your session has expired — please sign in again.')
    req.user = user
    next()
  }

  // tiny in-memory rate limiter: per user + bucket, min gap & daily cap
  const buckets = new Map()
  function allow(userId, name, minGapMs, perDay) {
    const key = `${userId}:${name}`
    const now = Date.now()
    const b = buckets.get(key) || { last: 0, day: new Date().toDateString(), count: 0 }
    if (b.day !== new Date().toDateString()) { b.day = new Date().toDateString(); b.count = 0 }
    if (now - b.last < minGapMs || b.count >= perDay) { buckets.set(key, b); return false }
    b.last = now; b.count += 1
    buckets.set(key, b)
    return true
  }

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', true) // behind Firebase Hosting and Cloud Run, the visitor's address is forwarded
  app.use(express.json({ limit: '200kb' }))
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

  // ---------------------------------------------------------------- routes
  app.get('/api/health', (_req, res) => res.json({ ok: true, gemini: geminiReady, models: [PRIMARY_MODEL, FALLBACK_MODEL], store: store.kind, gate: gateOn }))

  app.get('/api/gate', (req, res) => res.json({ required: gateOn, ok: gatePass(req) }))
  app.post('/api/gate', (req, res) => {
    if (!gateOn) return res.json({ ok: true, token: null })
    const ip = req.ip || 'unknown'
    if (!mayGuess(ip)) return bad(res, 429, 'Too many tries. Have a breather and try again in a few minutes.')
    const guess = String(req.body?.password ?? '').trim().toLowerCase().slice(0, 200)
    if (!guess || !crypto.timingSafeEqual(sha(guess), sha(GATE))) {
      missed(ip)
      return bad(res, 401, 'That’s not it. Check the group chat for the password.')
    }
    res.json({ ok: true, token: jwt.sign({ gate: gatePrint }, SECRET, { expiresIn: '30d' }) })
  })
  app.use('/api', (req, res, next) => (gatePass(req) ? next() : bad(res, 401, 'This preview is password protected.', { gate: true })))

  app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password, cafeName } = req.body || {}
    const u = String(username || '').trim()
    const e = String(email || '').trim().toLowerCase()
    const c = String(cafeName || '').trim()
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(u)) return bad(res, 400, 'Pick a username of 3–30 letters or numbers.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return bad(res, 400, 'That email doesn’t look quite right.')
    if (String(password || '').length < 6) return bad(res, 400, 'Passwords need at least 6 characters.')
    if (!c || c.length > 60) return bad(res, 400, 'What’s your café called?')
    const clash = await store.findConflict(u, e)
    if (clash) return bad(res, 409, clash.username.toLowerCase() === u.toLowerCase() ? 'That username is taken.' : 'That email already has an account — try signing in.')
    const passwordHash = await bcrypt.hash(String(password), 10)
    let user
    try {
      user = await store.createUser({ username: u, email: e, passwordHash, cafeName: c, survey: { ...DEFAULT_SURVEY, name: c } })
    } catch (err) {
      if (err.status === 409) return bad(res, 409, err.message)
      throw err
    }
    res.status(201).json({ token: sign(user), user: publicUser(user), plan: await store.planFor(user.id) })
  })

  app.post('/api/auth/login', async (req, res) => {
    const { identifier, username, email, password } = req.body || {}
    const login = String(identifier || username || email || '').trim()
    if (!login || !password) return bad(res, 400, 'Enter your username (or email) and password.')
    const user = await store.findUserByLogin(login)
    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) return bad(res, 401, 'Hmm, that username and password don’t match.')
    res.json({ token: sign(user), user: publicUser(user), plan: await store.planFor(user.id) })
  })

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ user: publicUser(req.user), plan: await store.planFor(req.user.id) })
  })

  app.put('/api/plan', requireAuth, async (req, res) => {
    const { survey, selected, geminiPlan, chat } = req.body || {}
    const plan = await store.savePlan(req.user.id, {
      survey: cleanSurvey(survey),
      selected: cleanSelected(selected),
      geminiPlan: geminiPlan === undefined ? undefined : (geminiPlan && typeof geminiPlan === 'object' ? geminiPlan : null),
      chat: cleanChat(chat),
    })
    res.json({ ok: true, updatedAt: plan.updatedAt })
  })

  app.post('/api/gemini/personalise-dashboard', requireAuth, async (req, res) => {
    const survey = cleanSurvey(req.body?.survey) || (await store.planFor(req.user.id)).survey || DEFAULT_SURVEY
    const selected = cleanSelected(req.body?.selected) || []
    if (!allow(req.user.id, 'personalise', 4000, 60)) {
      return res.json({ plan: { ...fallbackPersonalisation(survey, selected), tools: [...selected].sort() }, source: 'fallback', limited: true })
    }
    const result = await personaliseDashboard(survey, selected)
    await store.savePlan(req.user.id, { survey, selected, geminiPlan: result.plan })
    res.json(result)
  })

  app.post('/api/gemini/agent-step', requireAuth, async (req, res) => {
    const b = req.body || {}
    const event = EVENTS.includes(b.event) ? b.event : 'tick'
    const active = cleanSelected(b.activeAgents) || []
    const busy = cleanSelected(b.busy) || []
    const recent = Array.isArray(b.recent) ? b.recent.filter((x) => typeof x === 'string').slice(-6) : []
    const log = Array.isArray(b.log) ? b.log.filter((x) => typeof x === 'string').slice(-4).map((x) => x.slice(0, 160)) : []
    const cafeName = String(b.cafeName || req.user.cafe_name || 'your café').slice(0, 60)
    const survey = (await store.planFor(req.user.id)).survey || undefined
    // events the user clicked get a slightly looser limit than background ticks
    const live = allow(req.user.id, event === 'tick' ? 'tick' : 'event', event === 'tick' ? 12000 : 2500, 400)
    if (!live) {
      return res.json({ step: fallbackAgentStep({ event, active: active.filter((a) => !busy.includes(a)), cafeName, recent }), source: 'fallback', limited: true })
    }
    const out = await agentStep({ event, active, busy, recent, cafeName, survey, log })
    res.json(out)
  })

  // ---------------------------------------------------------------- Bea, the host (server/bea.js)
  const beaRoute = (job) => async (req, res) => {
    if (!allow(req.user.id, 'bea', 700, 400)) return bad(res, 429, 'Bea needs a quick breather. Try again in a moment.')
    try {
      res.json(await job(req.body || {}))
    } catch (e) {
      console.warn('[bea] unavailable:', String(e.message || e).slice(0, 160))
      bad(res, 503, 'Bea has stepped away for a moment.', { offline: true })
    }
  }
  app.post('/api/bea/checkup', requireAuth, beaRoute(beaCheckup))
  app.post('/api/bea/plan', requireAuth, beaRoute(beaPlan))

  // a voice note for Bea, from browsers without built-in speech recognition
  app.post('/api/bea/transcribe', requireAuth, async (req, res) => {
    const audio = String(req.body?.audio || '')
    const mime = String(req.body?.mime || 'audio/webm').split(';')[0].trim()
    if (!/^audio\/(webm|ogg|mp4|mpeg|wav|aac|x-m4a)$/.test(mime) || !audio || audio.length > 190000) return bad(res, 400, 'That recording didn’t come through. Try a shorter one?')
    if (!geminiReady) return bad(res, 503, 'Voice notes need our AI switched on. You can type to Bea instead.')
    if (!allow(req.user.id, 'voice', 1500, 200)) return bad(res, 429, 'One moment, then try again.')
    try {
      res.json({ text: (await transcribeAudio(audio, mime)) || '' })
    } catch {
      bad(res, 502, 'Bea couldn’t make that out. Try again, or type instead.')
    }
  })

  // ---------------------------------------------------------------- production: serve the built app
  const dist = path.join(here, '..', 'dist')
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use('/infs3605', express.static(dist, { index: false, maxAge: '1h' }))
    app.get(/^\/infs3605(\/.*)?$/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
    app.get('/', (_req, res) => res.redirect('/infs3605/'))
  }

  app.use('/api', (_req, res) => bad(res, 404, 'Not found'))
  app.use((err, _req, res, _next) => {
    console.error('[server]', err)
    bad(res, 500, 'Something went wrong on our side — please try again.')
  })

  return app
}

export { geminiReady, PRIMARY_MODEL, FALLBACK_MODEL }
