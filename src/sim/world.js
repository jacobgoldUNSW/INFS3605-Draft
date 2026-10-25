// The live café: customers, the owner, the barista and the humanised AI workers.
// Everything moves along the 32px grid at a human stroll and every multi-step behaviour
// is a small async "script" driven by simulation time, so Pause really pauses.
import { MAP, T, DIR, CHARS, isSitting } from './assets'
import { makeGrid } from './grid'
import { AGENT_META, OWNER_ALONE, fallbackAgentStep, applicableTemplates } from '../../shared/agentScenarios.js'

const FEET = 4
const TILE = (c, r) => ({ x: c * T + 16, y: r * T + T - FEET })
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

class Cancelled extends Error {}

export const WORKER_IDS = Object.keys(AGENT_META)

/** A 6-minute café day: late morning → midday → golden hour → cosy close, then the next morning. Never night. */
export const DAY_LENGTH = 360
export const CLOSE_AT = 0.95 // after this phase the light eases back to morning
export function clockOf(phase) {
  if (phase >= CLOSE_AT) return { label: 'Next morning', short: '9:30 am', period: 'next morning' }
  const h = 9.5 + (phase / CLOSE_AT) * 8.5
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60 / 5) * 5
  const period = h < 11.5 ? 'morning' : h < 14.5 ? 'midday' : h < 16.8 ? 'golden hour' : 'cosy close'
  const short = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`
  return { label: `${short} · ${period}`, short, period }
}

export const EVENT_INFO = {
  rain: { icon: '🌧️', label: 'Rain' },
  rush: { icon: '🏃', label: 'Morning rush' },
  sick: { icon: '🤒', label: 'Sick call-in' },
  delivery: { icon: '📦', label: 'Delivery drop' },
  review: { icon: '⭐', label: 'New review' },
  tick: { icon: '☕', label: 'Quiet moment' },
}
const ARTIFACT_ICON = {
  promo_poster: '🎨', sms_campaign: '✍️', invoice_check: '🔎', email_draft: '✉️', excel_summary: '📊', shift_sms: '📲', review_reply: '💬',
  catering_order: '🥪', purchase_order: '🧺', payment_batch: '💸', pos_combo: '⚡', sales_report: '📈', roster_plan: '🗓️',
}
const newStats = () => ({ served: 0, walkouts: 0, waitSum: 0, waitN: 0, minutes: 0, dollars: 0, waste: 0, customers: 0, approvalsYou: 0, approvalsAuto: 0, jobs: 0, calls: 0, missed: 0 })

const JOB = {
  copilot: 'the admin & emails', xero: 'the books', dext: 'the delivery dockets', deputy: 'the rosters',
  square: 'the till', lightspeed: 'the coffee pass', marketman: 'stock & waste', ordermentum: 'the supplier orders',
  canva: 'the promos', podium: 'the reviews', slang: 'the phone', mailchimp: 'the regulars',
}
const ROUTINE = {
  copilot: ['Handover notes tidied ✓', 'Milk-order email drafted', 'Food-cost sheet updated'],
  xero: ['Matched 6 bank lines ✓', 'BAS draft up to date', 'Rent bill scheduled'],
  dext: ['2 receipts filed to Xero', 'Docket read in 4 seconds', 'Bread invoice matched ✓'],
  deputy: ['Tomorrow’s roster looks tidy', 'Timesheets checked ✓', 'No overtime this week'],
  square: ['Combo key: flat white + croissant', 'Tap & go — next please!', 'Sales tracking nicely'],
  lightspeed: ['Flat white for Sam!', 'Table 4, brekkie’s up!', 'Two oat lattes, coming up'],
  marketman: ['Croissants restocked', 'Milk fridge counted ✓', 'Waste log: just 2 scrolls'],
  ordermentum: ['Beans: 6 bags left', 'Oat milk at par ✓', 'Order cut-off in 2 hrs'],
  canva: ['Tweaking the specials board', 'Story ready for 3pm', 'Loyalty card refreshed'],
  podium: ['New 5★ review!', '2 review invites sent', 'DM answered: hours ✓'],
  slang: ['“Open till 3!” ☎️', 'Booked a table for 4', 'Answered on the first ring'],
  mailchimp: ['12 new regulars this week', 'Friday offer scheduled', 'Stamp cards updated'],
}
const WORKING = {
  copilot: 'Crunching numbers at the Ops Laptop', xero: 'Reconciling at the Ledger Desk', dext: 'Scanning dockets at the crates',
  deputy: 'Checking the roster board', square: 'Running the till', lightspeed: 'Pacing coffees at the pass',
  marketman: 'Checking the pastry case', ordermentum: 'Counting beans & milk', canva: 'Designing at the computer',
  podium: 'Drafting a reply at the review stand', slang: 'Taking a booking on the phone', mailchimp: 'Writing to the regulars',
}
const IDLE_STATUS = {
  copilot: 'Tidying admin at the Ops Laptop', xero: 'Keeping the books at the Ledger Desk', dext: 'Watching for deliveries',
  deputy: 'Minding the roster', square: 'Serving at the till', lightspeed: 'Running the coffee pass',
  marketman: 'Guarding the pastry case', ordermentum: 'Minding beans & milk', canva: 'Doodling ideas at the computer',
  podium: 'Watching the reviews', slang: 'Ready by the phone', mailchimp: 'Looking after the regulars',
}
// how each worker looks while at their station
const POSE = {
  copilot: { anim: 'idle', bob: true }, xero: { anim: 'idle', bob: true, alt: 'book' }, dext: { anim: 'phone', face: 'down' },
  deputy: { anim: 'book', face: 'down' }, square: { anim: 'idle' }, lightspeed: { anim: 'idle' }, marketman: { anim: 'idle' },
  ordermentum: { anim: 'idle', bob: true }, canva: { anim: 'idle', bob: true }, podium: { anim: 'phone', face: 'down' },
  slang: { anim: 'idle' }, mailchimp: { anim: 'idle', bob: true, alt: 'phone' },
}
// which tools naturally *make* each kind of artifact (first match wins)
const MAKER = {
  promo_poster: ['canva', 'mailchimp'], sms_campaign: ['mailchimp', 'podium', 'deputy'], invoice_check: ['dext', 'xero', 'marketman'],
  email_draft: ['copilot', 'podium'], excel_summary: ['copilot', 'marketman', 'xero'], shift_sms: ['deputy'],
  review_reply: ['podium', 'copilot'], catering_order: ['slang', 'square'], purchase_order: ['ordermentum', 'marketman'],
  payment_batch: ['xero'], pos_combo: ['square', 'lightspeed'], sales_report: ['lightspeed', 'square', 'copilot'], roster_plan: ['deputy'],
}
// the generated crowd (tools/cafe/build_chars.py) — every customer and passer-by is one of these
const CUSTOMERS = Object.keys(CHARS.chars).filter((k) => k.startsWith('cust'))

// the owner's human crew grows with the team size from the survey (they're people, not tools: no outline)
const CREW = [
  { id: 'barista2', sprite: 'barista2', name: 'Ari', spot: { tile: [11, 6], face: 'up' }, loop: 'secondBaristaLoop' },
  { id: 'floor', sprite: 'floor', name: 'Nina', spot: { tile: [5, 10], face: 'down' }, loop: 'floorLoop' },
]
const CREW_SIZE = { '1-2': 0, '3-5': 1, '6-15': 2, '16+': 2 }
// what the café type changes: how many people stay to sit, how busy it is, and the A-frame's everyday message
const CAFE_STYLE = {
  specialty: { sit: 0.72, pace: 1, board: 'SINGLE ORIGIN' },
  bakery: { sit: 0.6, pace: 1, board: 'FRESH BAKED' },
  drive: { sit: 0.22, pace: 0.85, board: 'TAKEAWAY' },
  franchise: { sit: 0.5, pace: 0.8, board: 'NEW MENU' },
}
const DIR_OF = { right: DIR.right, up: DIR.up, left: DIR.left, down: DIR.down }

export class CafeWorld {
  constructor(opts = {}) {
    this.opts = { teaser: false, cafeName: 'your café', requestStep: null, isLive: () => true, onTip: null, sfx: null, fixedPhase: null, ...opts }
    this.grid = makeGrid(MAP.walk)
    this.t = 0
    this.timers = []
    this.waiters = []
    this.actors = new Map()
    this.overlays = new Map()
    this.version = 0
    this.overlayVersion = 0
    this.uid = 0
    this.workers = new Set()
    this.queue = []
    this.tickets = []
    this.ready = new Set()
    this.pos = null
    this.pickup = MAP.spots.pickup.map((t) => ({ tile: t, by: null }))
    this.seats = MAP.seats.map((s) => ({ ...s, by: null }))
    this.rain = 0
    this.rainTarget = 0
    this.rainUntil = 0
    this.rushUntil = 0
    this.phone = { ringing: false, since: 0, next: rand(18, 26), handler: null }
    this.door = { open: 0, hold: 0 }
    this.staffDoor = { open: 0, hold: 0 }
    this.aframe = { text: null, since: -99 }
    this.crates = null
    this.fridgeUntil = 0
    this.impact = { customers: 0, dollars: 0, waste: 0, minutes: 0, promos: 0, reviews: 0, calls: 0, served: 0, walkouts: 0, approvals: 0 }
    this.log = []
    this.artifacts = {}
    this.status = {}
    this.workflows = new Map()
    this.approvals = new Map()
    this.recent = []
    this.pending = 0
    this.nextSpawn = 3
    this.nextPedestrian = 1.5
    this.nextTick = this.opts.teaser ? 6 : 16
    this.nextTeaserEvent = 10
    this.nextRoutine = 6
    this.destroyed = false
    this.ownerStress = 0
    this.innerDoor = { open: 0, hold: 0 }
    // the light cycle (seconds into the café day); the Home teaser parks at golden hour
    // (the day opens around 11 am, so golden hour arrives a few minutes into a visit)
    this.dayT = this.opts.fixedPhase != null ? this.opts.fixedPhase * DAY_LENGTH : 0.18 * DAY_LENGTH
    // the café log: every event, hand-off, ask and result, grouped into incidents
    this.journal = []
    this.incidents = new Map()
    this.eventState = {}
    // the day's running totals: what the team got done, and what that saved the owner
    this.stats = newStats()
    // each café day ends with a wrap-up of those totals
    this.day = 1
    this.dayStart = newStats()
    this.wrap = null
    this.wrappedDay = 0
    this.jobs = {}
    this.profile = { employees: null, cafeType: null }
    this.highlightId = null
    this.nextCatNap = 18

    this.owner = this.spawn({ id: 'owner', sprite: 'owner', kind: 'owner', name: 'You', tile: MAP.spots.ownerPos.tile, dir: DIR.down })
    this.barista = this.spawn({ id: 'barista', sprite: 'barista', kind: 'barista', name: 'Bea', tile: MAP.spots.barista.tile, dir: DIR.up })
    this.addOverlay({ id: 'you-tag', type: 'tag', actorId: 'owner', text: 'YOU' })
    this.run(this.barista, (ctx) => this.baristaLoop(ctx))
    this.run(this.owner, (ctx) => this.ownerLoop(ctx))
    // a few customers already enjoying their coffee so the café never starts empty
    for (let i = 0; i < 3; i++) this.spawnSeatedCustomer()
  }

  // =========================================================================== basics
  emit() { this.version++ }
  bumpOverlays() { this.overlayVersion++; this.version++ }
  sfx(name) { if (!this.opts.teaser) this.opts.sfx?.(name) }

  spawn({ id, sprite, kind, name, tile, px, dir = DIR.down }) {
    const p = px || TILE(...tile)
    const a = {
      id: id || `a${++this.uid}`, sprite, kind, name: name || '', x: p.x, y: p.y, dir, anim: 'idle', animT: Math.random() * 2,
      path: null, pathI: 0, arrive: null, speed: 2.4 * T, token: 0, busy: false, state: 'idle', seat: null, bob: false,
      arrived: kind !== 'worker', alpha: 1,
    }
    this.actors.set(a.id, a)
    return a
  }

  despawn(a) {
    this.interrupt(a)
    this.actors.delete(a.id)
    for (const [id, o] of this.overlays) if (o.actorId === a.id) this.overlays.delete(id)
    this.bumpOverlays()
  }

  tileOf(a) { return [Math.floor(a.x / T), Math.floor((a.y + FEET - 1) / T)] }

  sleep(sec) { return new Promise((resolve) => this.timers.push({ at: this.t + sec, resolve })) }

  waitFor(pred, actor, timeout = Infinity) {
    return new Promise((resolve) => this.waiters.push({ pred, resolve, actor, tok: actor?.token, until: this.t + timeout }))
  }

  /** Walk along the grid. Resolves true on arrival, false if interrupted. */
  walk(a, tile, speedTiles) {
    const [tc, tr] = tile
    const from = this.tileOf(a)
    const clamp = ([c, r]) => [Math.max(0, Math.min(this.grid.cols - 1, c)), r]
    const start = clamp(from)
    const end = clamp([tc, tr])
    let path = this.grid.path(start, end)
    if (!path) path = [end]
    if (path.length && path[0][0] === start[0] && path[0][1] === start[1]) path = path.slice(1)
    if (tc !== end[0]) path.push([tc, tr]) // off-canvas street edge
    // a natural human stroll: 2.2–2.6 tiles per second, never faster or slower
    a.speed = Math.max(2.2, Math.min(2.6, speedTiles || (a.kind === 'customer' || a.kind === 'pedestrian' ? 2.25 : 2.45))) * T
    if (a.arrive) a.arrive(false)
    if (!path.length) {
      const p = TILE(tc, tr)
      a.x = p.x; a.y = p.y
      return Promise.resolve(true)
    }
    a.path = path
    a.pathI = 0
    a.seat = null
    return new Promise((resolve) => { a.arrive = resolve })
  }

  face(a, dir) { a.dir = typeof dir === 'string' ? DIR_OF[dir] : dir }

  interrupt(a) {
    a.token++
    if (a.arrive) { const r = a.arrive; a.arrive = null; r(false) }
    a.path = null
    for (const [id, ap] of this.approvals) {
      if (ap.workerId === a.id) { this.approvals.delete(id); this.overlays.delete(id); ap.resolve('cancelled') }
    }
    this.bumpOverlays()
  }

  /** Run an async script for an actor; starting a new one cancels the old. */
  run(a, fn) {
    a.token++
    const tok = a.token
    const ctx = {
      check: () => { if (a.token !== tok || this.destroyed || !this.actors.has(a.id)) throw new Cancelled() },
      go: async (tile, speed) => { const ok = await this.walk(a, tile, speed); ctx.check(); return ok },
      sleep: async (s) => { await this.sleep(s); ctx.check() },
      until: async (pred, timeout) => { const r = await this.waitFor(pred, a, timeout); ctx.check(); return r },
    }
    return fn(ctx).catch((e) => { if (!(e instanceof Cancelled)) console.error('[cafe]', e) })
  }

  // =========================================================================== overlays
  addOverlay(o) {
    o.id = o.id || `ov${++this.uid}`
    o.born = this.t
    this.overlays.set(o.id, o)
    this.bumpOverlays()
    return o.id
  }

  removeOverlay(id) { if (this.overlays.delete(id)) this.bumpOverlays() }

  /**
   * Speech bubble. The café never shows more than two at once: a new line bumps a less
   * important one (prio 0 small talk < 1 normal < 2 workflow), otherwise it is dropped and
   * only the café log keeps it. Returns whether the bubble was shown.
   */
  say(a, text, sec = 3.4, kind = 'say', prio = 1) {
    if (!text) return false
    for (const [id, o] of this.overlays) if (o.actorId === a.id && (o.type === 'say' || o.type === 'think')) this.overlays.delete(id)
    const talking = [...this.overlays.values()].filter((o) => o.type === 'say' || o.type === 'think')
    if (talking.length >= 2) {
      const low = talking.filter((o) => (o.prio ?? 1) < prio).sort((x, y) => (x.prio ?? 1) - (y.prio ?? 1))[0]
      if (!low) { this.bumpOverlays(); return false }
      this.overlays.delete(low.id)
    }
    this.addOverlay({ type: kind, actorId: a.id, text, until: this.t + sec, prio })
    return true
  }
  think(a, text, sec = 3.6, prio = 2) { return this.say(a, text, sec, 'think', prio) }
  emote(a, emoji, sec = 1.7) {
    for (const [id, o] of this.overlays) if (o.actorId === a.id && o.type === 'emote') this.overlays.delete(id)
    this.addOverlay({ type: 'emote', actorId: a.id, text: emoji, until: this.t + sec })
  }
  badge(x, y, text) { this.addOverlay({ type: 'badge', x, y, text, until: this.t + 2 }) }
  note(x, y, text, sec = 6, tone = '') { return this.addOverlay({ type: 'note', x, y, text, tone, until: this.t + sec }) }

  overlayAnchor(o) {
    if (o.actorId) {
      const a = this.actors.get(o.actorId)
      if (!a) return null
      return { x: a.x, y: a.y - (isSitting(a.anim) ? 42 : 50) }
    }
    return { x: o.x, y: o.y }
  }

  logLine(text, kind = 'chat') {
    this.log.push({ t: this.t, text, kind })
    if (this.log.length > 60) this.log.shift()
    this.emit()
  }

  // =========================================================================== café log & totals
  dayPhase() { return (this.dayT % DAY_LENGTH) / DAY_LENGTH }
  clock() { return clockOf(this.dayPhase()) }

  /** One line in the café log. */
  jot(entry) {
    const e = { id: ++this.uid, t: this.t, clock: this.clock().short, tags: [], actors: [], ...entry }
    this.journal.push(e)
    if (this.journal.length > 300) this.journal.shift()
    this.emit()
    return e
  }

  /** An incident groups one event (or quiet-moment idea) with everything the team did about it. */
  openIncident(event, extra = {}) {
    const info = EVENT_INFO[event] || EVENT_INFO.tick
    const inc = { id: `in${++this.uid}`, event, icon: info.icon, title: extra.title || info.label, status: extra.status || 'noticed', startedAt: this.t, clock: this.clock().short, steps: [], outcome: null, by: [] }
    this.incidents.set(inc.id, inc)
    if (event !== 'tick') this.eventState[event] = inc.id
    if (this.incidents.size > 80) this.incidents.delete(this.incidents.keys().next().value)
    this.emit()
    return inc
  }

  stepIncident(inc, status, entry) {
    if (!inc) return null
    if (status) inc.status = status
    let e = null
    if (entry) {
      e = this.jot({ ...entry, incident: inc.id })
      inc.steps.push(e.id)
      for (const id of e.actors || []) if (!inc.by.includes(id) && AGENT_META[id]) inc.by.push(id)
    }
    this.emit()
    return e
  }

  closeIncident(inc, outcome = null, status = 'done') {
    if (!inc || inc.endedAt) return
    inc.status = status
    inc.endedAt = this.t
    inc.outcome = outcome
    // the docket stays "done" for a moment, then the rail frees up
    this.timers.push({ at: this.t + 7, resolve: () => { if (this.eventState[inc.event] === inc.id) delete this.eventState[inc.event]; this.emit() } })
    this.emit()
  }

  stat(key, n = 1) { if (key in this.stats) this.stats[key] += n }

  /** every AI worker wears their name above their head, the whole time they're in the café */
  nameTag(w) { this.addOverlay({ id: `tag-${w.id}`, type: 'tag', actorId: w.id, text: w.name }) }

  // =========================================================================== the team
  presentWorkers() {
    return [...this.workers].filter((id) => this.actors.get(id)?.arrived)
  }

  /** Who's on the team. New hires walk in through the front door (or appear at once with `instant`). */
  setWorkers(ids, { instant = false } = {}) {
    const next = new Set(ids.filter((id) => AGENT_META[id]))
    const added = [...next].filter((id) => !this.workers.has(id))
    const removed = [...this.workers].filter((id) => !next.has(id))
    this.workers = next
    added.forEach((id, i) => this.enterWorker(id, instant ? 0 : 0.2 + i * 0.7, instant))
    removed.forEach((id) => this.exitWorker(id))
    // the owner steps out to welcome new arrivals, and moves to the hub only once Sienna has the till
    if (added.length && !instant) this.welcomeUntil = this.t + 8 + added.length * 0.9
    this.run(this.owner, (ctx) => this.ownerLoop(ctx))
    this.emit()
  }

  enterWorker(id, delay = 0, instant = false) {
    const meta = AGENT_META[id]
    const st = MAP.stations[id]
    if (!meta || !st) return
    let w = this.actors.get(id)
    if (w && w.leaving) { this.despawn(w); w = null }
    if (w) return
    if (instant) {
      w = this.spawn({ id, sprite: id, kind: 'worker', name: meta.name, tile: st.tile, dir: DIR_OF[POSE[id]?.face || st.face] })
      this.nameTag(w)
      w.arrived = true
      this.status[id] = IDLE_STATUS[id]
      this.run(w, (ctx) => this.workerLoop(w, ctx))
      return
    }
    const fromLeft = MAP.stations[id].tile[0] < 15
    w = this.spawn({ id, sprite: id, kind: 'worker', name: meta.name, tile: fromLeft ? [-1, 1] : [30, 1], dir: fromLeft ? DIR.right : DIR.left })
    this.nameTag(w)
    w.arrived = false
    w.alpha = 0
    this.status[id] = 'Walking in through the front door…'
    this.run(w, async (ctx) => {
      await ctx.sleep(delay)
      w.alpha = 1
      await ctx.go([15, 2])
      await ctx.go([15, 5])
      this.sfx('bell')
      // say hello to the owner on the way in
      const spot = this.approachSpot(w)
      if (spot) {
        await ctx.go(spot.tile)
        this.face(w, spot.face)
        this.say(w, `Morning! I’m ${meta.name} — I’ll handle ${JOB[id]}.`, 2.6, 'say', 1)
        this.emote(this.owner, pick(['👋', '😊', '🙌']), 1.6)
        await ctx.sleep(2.2)
      }
      w.arrived = true
      this.logLine(`${meta.name} (${meta.tool}) joined the team at the ${st.label}.`, 'join')
      this.jot({ kind: 'join', icon: '👋', text: `${meta.name} (${meta.tool}) started a shift at the ${st.label}`, actors: [id], tags: ['staff'] })
      this.emit()
      await this.workerLoop(w, ctx)
    })
  }

  exitWorker(id) {
    const w = this.actors.get(id)
    if (!w || w.leaving) return
    w.leaving = true
    w.arrived = false
    w.busy = false
    this.status[id] = 'Heading home'
    this.jot({ kind: 'leave', icon: '👋', text: `${AGENT_META[id]?.name || 'A worker'} headed home (taken off the team)`, actors: [id], tags: ['staff'] })
    this.run(w, async (ctx) => {
      this.say(w, pick(['See you tomorrow!', 'Catch you later!', 'Off I go — call me anytime!']), 1.8)
      await ctx.go([16, 5])
      await ctx.go([16, 2])
      await ctx.go([w.x < 480 ? -1 : 30, 1])
      this.despawn(w)
      this.emit()
    })
  }

  // =========================================================================== owner
  ownerAtPos() {
    const [c, r] = this.tileOf(this.owner)
    const [pc, pr] = MAP.spots.ownerPos.tile
    return c === pc && r === pr && !this.owner.path
  }

  hasWorker(id) { const w = this.actors.get(id); return !!(w && w.arrived && !w.leaving) }

  async answerPhone(a, ctx) {
    const spot = MAP.spots.ownerPhone
    await ctx.go(spot.tile, 2.6)
    this.face(a, spot.face)
    if (!this.phone.ringing) return
    this.phone.ringing = false
    this.phone.handler = null
    a.anim = 'phone'
    this.say(a, pick(['Hello? Sorry, can you hold—', 'Little café, hold on one sec…', 'Hi! Uh, can I call you back?']), 2.6)
    this.jot({ kind: 'solo', icon: '☎️', text: 'You left the till to grab the phone and the queue waited (Sunny from Slang.ai would have answered)', tags: ['customers'] })
    await ctx.sleep(3)
    a.anim = 'idle'
  }

  async ownerLoop(ctx) {
    const o = this.owner
    o.anim = 'idle'
    while (true) {
      if (this.approvals.size || this.ownerPinned) { await ctx.sleep(0.4); continue }
      if (this.phone.ringing && !this.hasWorker('slang') && (!this.phone.handler || this.phone.handler === 'owner')) {
        this.phone.handler = 'owner'
        await this.answerPhone(o, ctx)
        continue
      }
      // put your feet up in the lounge once Sienna runs the till (or while welcoming new arrivals), otherwise keep serving
      if (this.hasWorker('square') || this.t < (this.welcomeUntil || 0)) {
        const hub = MAP.spots.ownerHub
        const [hc, hr] = this.tileOf(o)
        if (hc !== hub.tile[0] || hr !== hub.tile[1] || o.path) await ctx.go(hub.tile)
        this.face(o, hub.face)
        if (hub.sit) o.anim = 'sit2'
        if (Math.random() < 0.18) this.emote(o, pick(['☕', '😌', '🙂']), 1.8)
        await ctx.sleep(2.5)
      } else {
        const pos = MAP.spots.ownerPos
        await ctx.go(pos.tile)
        this.face(o, pos.face)
        await ctx.sleep(1.5)
      }
    }
  }

  /** A free tile beside the owner for a worker to stand on (and which way to face). */
  approachSpot(worker) {
    const [oc, or] = this.tileOf(this.owner)
    const taken = new Set([...this.actors.values()].filter((a) => a !== worker && a.kind !== 'owner').map((a) => this.tileOf(a).join(',')))
    const opts = [[oc + 1, or, 'left'], [oc - 1, or, 'right'], [oc, or + 1, 'up'], [oc, or - 1, 'down'], [oc + 2, or, 'left'], [oc - 2, or, 'right']]
    for (const [c, r, face] of opts) {
      if (this.grid.walkable(c, r) && !taken.has(`${c},${r}`) && r >= 5) return { tile: [c, r], face }
    }
    return { tile: MAP.spots.approach[0].tile, face: MAP.spots.approach[0].face }
  }

  // =========================================================================== barista & till
  async baristaLoop(ctx) {
    const b = this.barista
    const spot = MAP.spots.barista
    while (true) {
      await ctx.until(() => this.tickets.length > 0)
      const cid = this.tickets.shift()
      if (cid == null) continue // the other barista took it
      this.face(b, spot.face)
      b.bob = true
      if (Math.random() < 0.5) this.sfx('steam')
      await ctx.sleep(this.rushUntil > this.t ? 2.2 : 2.8)
      b.bob = false
      this.ready.add(cid)
      if (this.hasWorker('lightspeed') && Math.random() < 0.45) {
        this.say(this.actors.get('lightspeed'), pick(ROUTINE.lightspeed), 1.6)
      }
    }
  }

  /** The café as the owner described it: team size sets the human crew, café type the everyday rhythm. */
  setProfile({ employees = null, cafeType = null } = {}) {
    this.profile = { employees, cafeType }
    const want = CREW.slice(0, CREW_SIZE[employees] ?? 0)
    for (const c of CREW) {
      const a = this.actors.get(c.id)
      if (a && !want.includes(c)) this.despawn(a)
    }
    for (const c of want) {
      if (this.actors.has(c.id)) continue
      const a = this.spawn({ id: c.id, sprite: c.sprite, kind: 'crew', name: c.name, tile: c.spot.tile, dir: DIR_OF[c.spot.face] })
      this.run(a, (ctx) => this[c.loop](a, c.spot, ctx))
    }
    const style = CAFE_STYLE[cafeType]
    if (style && !this.aframe.text) this.aframe = { text: style.board, since: -99, everyday: true }
    this.emit()
  }

  style() { return CAFE_STYLE[this.profile.cafeType] || { sit: 0.6, pace: 1 } }

  // a second barista on the second machine: drinks come out twice as fast
  async secondBaristaLoop(b, spot, ctx) {
    await ctx.go(spot.tile)
    while (true) {
      this.face(b, spot.face)
      await ctx.until(() => this.tickets.length > 0)
      const cid = this.tickets.shift()
      if (cid == null) continue
      this.face(b, spot.face)
      b.bob = true
      if (Math.random() < 0.4) this.sfx('steam')
      await ctx.sleep(this.rushUntil > this.t ? 2.4 : 3)
      b.bob = false
      this.ready.add(cid)
    }
  }

  // a floor hand clears cups and checks on tables
  async floorLoop(a, spot, ctx) {
    while (true) {
      const taken = this.seats.filter((st) => st.by)
      const seat = taken.length && Math.random() < 0.55 ? pick(taken) : null
      if (seat) {
        const [tc, tr] = seat.table
        const side = this.grid.walkable(tc, tr + 1) ? [tc, tr + 1] : [tc, tr - 1]
        await ctx.go(side)
        this.face(a, side[1] > tr ? 'up' : 'down')
        a.anim = 'gift'
        await ctx.sleep(1.2)
        a.anim = 'idle'
        if (Math.random() < 0.2) this.say(a, pick(['Can I grab that cup?', 'Everything good here?', 'Top-up on water?']), 1.8, 'say', 0)
      } else {
        await ctx.go(spot.tile)
        this.face(a, spot.face)
        await ctx.sleep(rand(3, 6))
      }
      await ctx.sleep(rand(1.5, 3))
    }
  }

  posServer() {
    const s = this.actors.get('square')
    if (s && s.arrived && !s.busy && !s.path) return { actor: s, dur: this.rushUntil > this.t ? 1.6 : 2.1 }
    if (this.ownerAtPos() && !this.approvals.size) return { actor: this.owner, dur: this.rushUntil > this.t ? 3.4 : 4.2 }
    return null
  }

  updateTill() {
    if (!this.pos && this.queue.length) {
      const c = this.actors.get(this.queue[0])
      const server = this.posServer()
      if (c && c.state === 'front' && server) {
        this.pos = { cid: c.id, until: this.t + server.dur, server: server.actor }
        c.state = 'ordering'
        if (c.queuedAt != null) { this.stat('waitSum', this.t - c.queuedAt); this.stat('waitN') }
        if (Math.random() < 0.55) this.say(server.actor, pick(['What can I get you?', 'Morning! The usual?', 'Flat white?', 'Hi! For here or takeaway?']), 1.5, 'say', 0)
      }
    }
    if (this.pos && this.t >= this.pos.until) {
      const c = this.actors.get(this.pos.cid)
      this.queue = this.queue.filter((id) => id !== this.pos.cid)
      if (c) { c.state = 'ordered'; this.tickets.push(c.id) }
      this.impact.served++
      this.stat('served')
      const served = this.stats.served
      if (served % 10 === 0) this.jot({ kind: 'served', icon: '☕', text: `${served} coffees out the door today`, tags: ['customers'] })
      this.sfx('cash')
      this.pos = null
      this.emit()
    }
    if (this.pos && !this.actors.has(this.pos.cid)) this.pos = null
  }

  // =========================================================================== customers
  spawnCustomer({ promo = false, rush = false } = {}) {
    if ([...this.actors.values()].filter((a) => a.kind === 'customer').length >= 14) return
    const left = Math.random() < 0.5
    const c = this.spawn({ sprite: pick(CUSTOMERS), kind: 'customer', tile: left ? [-1, 1] : [30, 1], dir: left ? DIR.right : DIR.left })
    c.promo = promo
    this.run(c, (ctx) => this.customerScript(c, ctx, { rush }))
  }

  spawnSeatedCustomer() {
    const seat = this.seats.find((s) => !s.by && Math.random() < 0.5) || this.seats.find((s) => !s.by)
    if (!seat) return
    const c = this.spawn({ sprite: pick(CUSTOMERS), kind: 'customer', tile: seat.tile, dir: DIR_OF[seat.face] })
    seat.by = c.id
    c.seat = seat
    c.anim = seat.lounge ? 'sit2' : 'sit'
    this.run(c, async (ctx) => {
      await ctx.sleep(rand(8, 26))
      seat.by = null
      c.seat = null
      c.anim = 'idle'
      await this.leave(c, ctx)
    })
  }

  queueTile(i) {
    const q = MAP.spots.queue
    return q[Math.min(i, q.length - 1)]
  }

  async customerScript(c, ctx, { rush }) {
    const doorCol = Math.random() < 0.5 ? 15 : 16
    await ctx.go([doorCol, 2])
    if (c.promo) this.emote(c, pick(['✨', '😍', '🥐']), 1.5)
    await ctx.go([doorCol, 5])
    this.sfx('bell')
    // a long queue with you alone on the till? some people just turn around (Sienna from Square keeps it moving)
    if (!this.hasWorker('square') && this.queue.length >= 5 && Math.random() < 0.5) return this.walkout(c, ctx)
    this.queue.push(c.id)
    c.state = 'queue'
    c.queuedAt = this.t
    this.emit()
    while (true) {
      const idx = this.queue.indexOf(c.id)
      if (idx < 0) break
      await ctx.go(this.queueTile(idx))
      this.face(c, idx === 0 ? 'up' : idx >= 8 ? 'up' : 'left')
      if (idx === 0) { c.state = c.state === 'queue' ? 'front' : c.state; break }
      await ctx.until(() => this.queue.indexOf(c.id) !== idx || (!this.hasWorker('square') && this.t - c.queuedAt > 30))
      if (!this.hasWorker('square') && this.t - c.queuedAt > 30 && this.queue.indexOf(c.id) > 0) {
        this.queue = this.queue.filter((id) => id !== c.id)
        return this.walkout(c, ctx)
      }
    }
    if (c.state === 'queue') c.state = 'front'
    await ctx.until(() => c.state === 'ordered')
    // wait at the pass
    const slot = this.pickup.find((s) => !s.by) || this.pickup[this.pickup.length - 1]
    slot.by = c.id
    await ctx.go(slot.tile)
    this.face(c, 'up')
    await ctx.until(() => this.ready.has(c.id))
    if (!this.hasWorker('lightspeed')) await ctx.sleep(1.4)
    this.ready.delete(c.id)
    if (slot.by === c.id) slot.by = null
    // served quickly? a little heart; a long wait gets nothing
    if (c.queuedAt == null || this.t - c.queuedAt < 16) c.mood = { kind: 'love', until: this.t + 1.8 }
    const seat = !rush && Math.random() < this.style().sit ? this.seats.filter((s) => !s.by)[0] : null
    if (seat) {
      seat.by = c.id
      await ctx.go(seat.tile)
      c.seat = seat
      this.face(c, seat.face)
      c.anim = seat.lounge ? 'sit2' : 'sit'
      await ctx.sleep(rand(16, 30))
      seat.by = null
      c.seat = null
      c.anim = 'idle'
    }
    await this.leave(c, ctx)
  }

  async walkout(c, ctx) {
    this.impact.walkouts++
    this.stat('walkouts')
    this.jot({ kind: 'walkout', icon: '😤', text: 'A customer gave up on the queue and walked out (about $6 gone). You’re on the till alone; Sienna from Square would keep it moving', tags: ['customers', 'money'] })
    c.mood = { kind: 'angry', until: this.t + 2.2 }
    this.emit()
    await this.leave(c, ctx)
  }

  async leave(c, ctx) {
    await ctx.go([16, 5])
    await ctx.go([16, 2])
    await ctx.go([Math.random() < 0.5 ? -1 : 30, 1])
    this.despawn(c)
  }

  spawnPedestrian() {
    const left = Math.random() < 0.5
    const p = this.spawn({ sprite: pick(CUSTOMERS), kind: 'pedestrian', tile: left ? [-1, 1] : [30, 1], dir: left ? DIR.right : DIR.left })
    this.run(p, async (ctx) => {
      await ctx.go([left ? 30 : -1, 1], this.rain > 0.3 ? 2.6 : rand(2.2, 2.5))
      this.despawn(p)
    })
  }

  // =========================================================================== workers at work
  async workerLoop(w, ctx) {
    const st = MAP.stations[w.id]
    const pose = POSE[w.id] || { anim: 'idle' }
    await ctx.go(st.tile)
    while (true) {
      if (w.busy) { await ctx.sleep(0.5); continue }
      const [c, r] = this.tileOf(w)
      if (c !== st.tile[0] || r !== st.tile[1]) await ctx.go(st.tile)
      this.face(w, pose.face || st.face)
      w.anim = pose.anim
      w.bob = !!pose.bob
      this.status[w.id] = IDLE_STATUS[w.id]
      // Sunny answers the phone the moment it rings
      if (w.id === 'slang' && this.phone.ringing && this.phone.handler !== 'owner') {
        this.phone.ringing = false
        this.phone.handler = null
        w.anim = 'phone'
        this.face(w, 'up')
        this.say(w, pick([`${this.opts.cafeName}, Sunny speaking! ☎️`, 'Good morning, how can I help? ☎️', 'Hi there! Open till 3 today ☎️']), 2.4, 'say', 1)
        this.status[w.id] = 'On a call at the booking stand'
        this.impact.calls++
        this.stat('calls')
        this.jot({ kind: 'call', icon: '☎️', text: pick(['Sunny answered a call: booking for 4 at 12:30', 'Sunny answered a call: “are you open Sunday?”', 'Sunny took a catering enquiry and logged it for you', 'Sunny answered on the first ring: opening hours']), actors: ['slang'], tags: ['customers'] })
        this.emit()
        await ctx.sleep(3.2)
        continue
      }
      // little bits of life between bigger jobs
      if (w.id === 'marketman' && Math.random() < 0.06) {
        this.status[w.id] = 'Checking the coolroom'
        await ctx.go(MAP.spots.coolroom.tile)
        this.face(w, 'up')
        w.anim = 'pickup'
        await ctx.sleep(1.6)
        w.anim = 'idle'
        continue
      }
      if (w.id === 'lightspeed' && Math.random() < 0.05) {
        const seat = this.seats.find((s) => s.by)
        if (seat) {
          this.status[w.id] = 'Running a coffee to a table'
          const [tc, tr] = seat.table
          const side = this.grid.walkable(tc, tr + 1) ? [tc, tr + 1] : [tc, tr - 1]
          await ctx.go(side)
          this.face(w, side[1] > tr ? 'up' : 'down')
          w.anim = 'gift'
          await ctx.sleep(1.1)
          w.anim = 'idle'
          continue
        }
      }
      if (pose.alt && Math.random() < 0.25) {
        w.anim = pose.alt
        this.face(w, 'down')
        await ctx.sleep(3)
        continue
      }
      await ctx.sleep(rand(1.6, 2.6))
    }
  }

  routineChatter() {
    const free = this.presentWorkers().map((id) => this.actors.get(id)).filter((w) => w && !w.busy)
    if (!free.length) return
    const w = pick(free)
    if ([...this.overlays.values()].some((o) => o.actorId === w.id)) return
    const line = pick(ROUTINE[w.id])
    // small talk only gets a bubble when the café is quiet; the log always keeps it
    this.say(w, line, 2.4, 'say', 0)
    this.jot({ kind: 'chatter', icon: '💬', text: `${AGENT_META[w.id].name}: ${line}`, actors: [w.id], tags: ['staff'] })
  }

  catSpot() { const c = MAP.cat; return { x: c.x + c.w / 2 + 4, y: c.y + 8 } }

  /** Little life: the café cat dozes in the lounge and now and then stretches. */
  catNap() {
    const c = MAP.cat
    if (!c) return
    this.addOverlay({ type: 'emote', x: c.x + c.w / 2 + 6, y: c.y + 6, text: pick(['💤', '💤', '😺']), until: this.t + 2.4 })
  }

  petCat() {
    const c = MAP.cat
    if (!c) return
    this.addOverlay({ type: 'emote', x: c.x + c.w / 2 + 6, y: c.y + 4, text: pick(['💕', '😻', '🐾']), until: this.t + 1.8 })
    this.jot({ kind: 'cat', icon: '🐈', text: 'You gave the café cat a scratch. Purring intensifies.', tags: [] })
  }

  // =========================================================================== events
  triggerEvent(ev) {
    const roster = MAP.roster
    const fromLabel = { rain: '🌧️ Rain', rush: '🏃 Morning rush', sick: '🤒 Sick call-in', delivery: '📦 Delivery drop', review: '⭐ New review' }[ev]
    if (fromLabel) this.logLine(`${fromLabel} hit the café.`, 'event')
    const what = {
      rain: 'It started pouring — fewer people walking in', rush: 'A morning rush hit: six people at once and the phone ringing',
      sick: 'Josh texted: sick, can’t do his 6am shift', delivery: 'The dairy delivery arrived with a paper docket',
      review: 'A new Google review landed, with an allergy question in the DMs',
    }[ev]
    const inc = this.openIncident(ev)
    this.stepIncident(inc, null, { kind: 'event', icon: EVENT_INFO[ev]?.icon || '❗', text: what || 'Something happened', tags: ev === 'review' ? ['customers', 'needs'] : ev === 'sick' ? ['staff'] : ev === 'delivery' ? ['money'] : ['customers'] })
    if (ev === 'rain') {
      this.rainTarget = 1
      this.rainUntil = this.t + 60
      this.opts.onRain?.(true)
    }
    if (ev === 'rush') {
      this.rushUntil = this.t + 24
      for (let i = 0; i < 6; i++) this.timers.push({ at: this.t + i * 0.7, resolve: () => this.spawnCustomer({ rush: true }) })
      this.ringPhone()
    }
    if (ev === 'sick') {
      this.note(roster[0] + roster[2] / 2, roster[1] - 6, '📱 “So sorry — sick, can’t do 6am 🤒” — Josh', 7, 'sms')
      this.sfx('pop')
    }
    if (ev === 'review') {
      const st = MAP.stations.podium.tile
      this.note(st[0] * T + 16, st[1] * T - 40, '⭐⭐⭐⭐ New Google review · 💬 allergy question in the DMs', 7, 'review')
      this.sfx('pop')
    }
    // a clicked event takes priority over the background heartbeat
    this.nextTick = Math.max(this.nextTick, this.t + 22)
    const respond = async () => {
      if (this.destroyed) return
      // a team that's still walking in gets a moment to arrive — until someone who can actually handle
      // this curveball is on shift (or everyone is) — before you're left on your own
      const covered = () => {
        const present = this.presentWorkers()
        return present.length >= this.workers.size || applicableTemplates(ev, present).length > 0
      }
      if (this.workers.size && !covered()) await this.waitFor(covered, null, 30)
      if (this.destroyed) return
      if (!this.presentWorkers().length) return this.ownerAlone(ev, inc)
      this.requestAndRun(ev, inc)
    }
    if (ev === 'delivery') this.courier(respond)
    else this.timers.push({ at: this.t + (ev === 'rain' ? 2.2 : 1.2), resolve: respond })
    this.emit()
  }

  courier(done) {
    const c = this.spawn({ sprite: 'courier', kind: 'courier', name: 'Courier', tile: [30, 1], dir: DIR.left })
    this.run(c, async (ctx) => {
      await ctx.go(MAP.spots.staffOut.tile)
      await ctx.go(MAP.spots.staffIn.tile)
      await ctx.go(MAP.spots.deliveryDrop.tile)
      this.face(c, 'down')
      c.anim = 'gift'
      await ctx.sleep(1.2)
      c.anim = 'idle'
      this.crates = { until: this.t + 80 }
      const [dc, dr] = MAP.spots.deliveryDrop.tile
      this.note(dc * T + 16, dr * T - 18, '🧾 Paper docket: Riverside Dairy', 5, 'docket')
      this.say(c, 'Delivery! Docket’s on top 👍', 2)
      done()
      await ctx.sleep(1)
      await ctx.go(MAP.spots.staffIn.tile)
      await ctx.go(MAP.spots.staffOut.tile)
      await ctx.go([30, 1])
      this.despawn(c)
    })
  }

  ringPhone() {
    if (this.phone.ringing) return
    this.phone.ringing = true
    this.phone.since = this.t
    this.phone.handler = null
    this.sfx('ring')
    this.emit()
  }

  ownerAlone(ev, inc = null) {
    const info = OWNER_ALONE[ev] || OWNER_ALONE.tick
    this.think(this.owner, info.thought, 4.6)
    this.emote(this.owner, '💦', 2)
    this.opts.onTip?.(info.tip)
    if (inc) {
      this.stepIncident(inc, 'solo', { kind: 'solo', icon: '😮‍💨', text: `Nobody on your team covers this, so it’s on you: “${info.thought}”`, tags: ['needs'] })
      this.closeIncident(inc, { solo: true }, 'solo')
    }
  }

  async requestAndRun(event, inc = null) {
    const active = this.presentWorkers()
    const busy = active.filter((id) => this.actors.get(id)?.busy)
    if (!active.length) return
    this.pending++
    if (inc) inc.status = 'thinking'
    this.emit()
    let step = null
    try {
      // the Home teaser is always scripted: it never reaches for the network, whatever it's given
      const req = (!this.opts.teaser && this.opts.requestStep) || ((o) => Promise.resolve(fallbackAgentStep({ ...o, cafeName: this.opts.cafeName })))
      step = await req({ event, active, busy, recent: this.recent.slice(-4), log: this.log.slice(-4).map((l) => l.text) })
    } catch {
      step = fallbackAgentStep({ event, active: active.filter((id) => !busy.includes(id)), cafeName: this.opts.cafeName, recent: this.recent })
    } finally {
      this.pending = Math.max(0, this.pending - 1)
      this.emit()
    }
    if (this.destroyed) { if (inc) this.closeIncident(inc, { stopped: true }, 'stopped'); return }
    if (!step) {
      if (event !== 'tick') this.ownerAlone(event, inc)
      return
    }
    this.recent.push(step.scenarioId || event)
    // quiet-moment ideas get their own incident so the log can group them
    const incident = inc || this.openIncident('tick', { title: step.artifactTitle || 'A quiet-moment idea', status: 'noticed' })
    this.runWorkflow(step, incident)
  }

  // =========================================================================== the agentic workflow
  setArtifact(id, data) {
    this.artifacts[id] = { ...(this.artifacts[id] || {}), ...data, at: this.t }
    this.emit()
  }

  async runWorkflow(step, inc = null) {
    let P = this.actors.get(step.primaryAgentId)
    if (!P || !P.arrived) { this.closeIncident(inc, { stopped: true }, 'stopped'); return }
    if (P.busy) {
      // never drop a request on the floor: wait for them to finish their current job
      this.say(P, pick(['One sec — finishing this first!', 'On it right after this!', 'Got it, coming up next!']), 2.2, 'say', 2)
      if (inc) inc.status = 'queued'
      const ok = await this.waitFor(() => !P.busy || !this.actors.has(P.id), null, 25)
      if (!ok || !this.actors.has(P.id) || P.busy || !P.arrived) { this.closeIncident(inc, { stopped: true }, 'stopped'); return }
    }
    let C = step.collaboratorAgentId ? this.actors.get(step.collaboratorAgentId) : null
    if (C && (!C.arrived || C.busy || C === P)) C = null
    const wf = { id: `wf${++this.uid}`, step, cancelled: false }
    this.workflows.set(wf.id, wf)
    P.busy = true
    if (C) C.busy = true
    // whoever's tool actually makes this kind of thing does the making (Canva makes posters, Dext reads dockets…)
    const makers = MAKER[step.artifactType] || []
    const W = C ? (makers.indexOf(P.id) > -1 && (makers.indexOf(C.id) === -1 || makers.indexOf(P.id) < makers.indexOf(C.id)) ? P : C) : P
    const other = W === P ? C : P
    const pm = AGENT_META[P.id]
    const cm = C ? AGENT_META[C.id] : null
    const aframeSpot = MAP.spots.aframe
    const alive = () => !wf.cancelled && this.workflows.has(wf.id) && this.actors.has(P.id)
    const go = async (a, tile) => { const ok = await this.walk(a, tile); if (!ok || !alive()) throw new Cancelled(); }
    const wait = async (s) => { await this.sleep(s); if (!alive()) throw new Cancelled() }
    try {
      // 1 · perceive
      this.status[P.id] = 'Noticed something…'
      this.setArtifact(W.id, {
        type: step.artifactType, title: step.artifactTitle, body: step.artifactBody, meta: step.artifactMeta,
        lines: step.artifactLines || [], question: step.ownerCheckInQuestion, status: 'thinking', by: W.id, event: step.event, figures: step.figures,
        aframe: !!step.worldEffect?.aframeUpdated,
      })
      const st = MAP.stations[P.id]
      const [pc, pr] = this.tileOf(P)
      if (pc !== st.tile[0] || pr !== st.tile[1]) await go(P, st.tile)
      this.face(P, POSE[P.id]?.face || st.face)
      this.think(P, step.thought, 3.8)
      this.sfx('pop')
      this.logLine(`${pm.name} (${pm.tool}) noticed: ${step.thought}`, 'think')
      this.stepIncident(inc, 'working', { kind: 'notice', icon: '👀', text: `${pm.name} (${pm.tool}) noticed: ${step.thought}`, actors: [P.id], tags: ['staff'] })
      await wait(3.6)

      // 2 · hand-off
      if (C) {
        this.status[P.id] = `Walking over to ${cm.name}`
        this.status[C.id] = `${pm.name} is coming over`
        const [cc, cr] = this.tileOf(C)
        const side = [[cc + 1, cr, 'left'], [cc - 1, cr, 'right'], [cc, cr + 1, 'up'], [cc, cr - 1, 'down']].find(([c, r]) => this.grid.walkable(c, r)) || [cc, cr + 1, 'up']
        await go(P, [side[0], side[1]])
        this.face(P, side[2])
        this.face(C, { left: 'right', right: 'left', up: 'down', down: 'up' }[side[2]])
        C.anim = 'idle'
        P.anim = 'gift'
        this.say(P, step.handoffDialogue, 3.8, 'say', 2)
        this.logLine(`${pm.name} → ${cm.name}: “${step.handoffDialogue}”`, 'handoff')
        this.stepIncident(inc, null, { kind: 'handoff', icon: '🤝', text: `${pm.name} → ${cm.name}: “${step.handoffDialogue}”`, actors: [P.id, C.id], tags: ['staff'] })
        await wait(3.4)
        P.anim = 'idle'
        this.say(C, step.collaboratorReply, 3.2, 'say', 2)
        this.logLine(`${cm.name} → ${pm.name}: “${step.collaboratorReply}”`, 'handoff')
        this.stepIncident(inc, null, { kind: 'handoff', icon: '💬', text: `${cm.name}: “${step.collaboratorReply}”`, actors: [C.id], tags: ['staff'] })
        await wait(2.6)
        // whoever isn't making the thing heads back to their own station
        if (other) {
          this.status[other.id] = IDLE_STATUS[other.id]
          other.busy = false
        }
      }

      // 3 · make the thing
      const wst = MAP.stations[W.id]
      this.status[W.id] = WORKING[W.id]
      const [wc, wr] = this.tileOf(W)
      if (wc !== wst.tile[0] || wr !== wst.tile[1]) await go(W, wst.tile)
      this.face(W, wst.face)
      W.anim = W.id === 'dext' || W.id === 'podium' || W.id === 'slang' ? 'phone' : 'idle'
      W.bob = true
      this.setArtifact(W.id, { status: 'drafting' })
      this.addOverlay({ type: 'emote', actorId: W.id, text: ARTIFACT_ICON[step.artifactType] || '✨', until: this.t + 3.2 })
      this.stepIncident(inc, 'working', { kind: 'make', icon: ARTIFACT_ICON[step.artifactType] || '✨', text: `${AGENT_META[W.id].name} drafted “${step.artifactTitle}”`, actors: [W.id], tags: ['staff'], artifact: W.id })
      await wait(3.4)
      W.bob = false

      // 4 · owner check-in
      if (step.ownerCheckInQuestion) {
        this.setArtifact(W.id, { status: 'awaiting' })
        this.status[W.id] = 'Walking to you for a quick yes…'
        const spot = this.approachSpot(W)
        this.ownerPinned = true
        await go(W, spot.tile)
        this.face(W, spot.face)
        if (!isSitting(this.owner.anim)) this.face(this.owner, { left: 'right', right: 'left', up: 'down', down: 'up' }[spot.face])
        this.status[W.id] = 'Waiting for your OK'
        this.sfx('marimba')
        this.stepIncident(inc, 'needs-you', { kind: 'ask', icon: '🙋', text: `${AGENT_META[W.id].name} asked you: “${step.ownerCheckInQuestion}”`, actors: [W.id], tags: ['needs'] })
        const how = await this.askOwner(W, step)
        this.ownerPinned = false
        if (how === 'cancelled' || !alive()) throw new Cancelled()
        this.impact.approvals++
        this.stat(how === 'auto' ? 'approvalsAuto' : 'approvalsYou')
        this.sfx('chime')
        this.emote(this.owner, how === 'auto' ? '👍' : pick(['✅', '❤️', '🙌']), 1.8)
        this.say(W, pick(['Legend, thanks!', 'On it!', 'Too easy — doing it now.', 'Thanks boss!']), 1.8, 'say', 2)
        this.logLine(`You ${how === 'auto' ? 'let' : 'approved'} ${AGENT_META[W.id].name}’s “${step.artifactTitle}”${how === 'auto' ? ' (auto-OK after 15s)' : ''}.`, 'approve')
        this.stepIncident(inc, 'working', how === 'auto'
          ? { kind: 'auto', icon: '⏱️', text: 'Auto-approved after 15 s — you didn’t need to stop what you were doing', tags: ['needs'] }
          : { kind: 'approved', icon: '✅', text: `You approved “${step.artifactTitle}”`, tags: ['needs'] })
        this.setArtifact(W.id, { status: 'approved' })
        await wait(1.2)
      } else {
        this.setArtifact(W.id, { status: 'done' })
        this.logLine(`${AGENT_META[W.id].name} handled it: ${step.artifactTitle}.`, 'done')
      }

      // 5 · act on it & show the impact
      const we = step.worldEffect || {}
      if (we.aframeUpdated) {
        this.status[W.id] = 'Updating the street A-frame'
        await go(W, [16, 5])
        await go(W, [16, 2])
        await go(W, aframeSpot.tile)
        this.face(W, aframeSpot.face)
        W.anim = 'gift'
        await wait(1.4)
        W.anim = 'idle'
        this.aframe = { text: we.aframeText || step.artifactTitle, since: this.t }
        this.sfx('pop')
      } else if (W.id === 'marketman') {
        this.fridgeUntil = this.t + 1.4
      }
      const gained = this.applyEffect(W, step)
      this.setArtifact(W.id, { status: 'done' })
      this.status[W.id] = IDLE_STATUS[W.id]
      for (const a of new Set([P.id, W.id])) this.jobs[a] = (this.jobs[a] || 0) + 1
      this.stat('jobs')
      const bits = []
      if (gained.customers) bits.push(`+${gained.customers} customers`)
      if (gained.dollars) bits.push(`+$${gained.dollars}`)
      if (gained.waste) bits.push(`$${gained.waste} waste saved`)
      if (gained.minutes) bits.push(`${gained.minutes} min of your time back`)
      const tags = [gained.dollars || gained.waste ? 'money' : null, gained.customers ? 'customers' : null].filter(Boolean)
      this.stepIncident(inc, null, { kind: 'effect', icon: '✨', text: bits.length ? `Done — ${bits.join(' · ')}` : `Done — ${step.artifactTitle}`, actors: [W.id], tags: tags.length ? tags : ['staff'] })
      this.closeIncident(inc, gained)
    } catch (e) {
      if (!(e instanceof Cancelled)) console.error('[cafe workflow]', e)
      this.ownerPinned = false
      this.closeIncident(inc, { stopped: true }, 'stopped')
    } finally {
      this.workflows.delete(wf.id)
      P.busy = false
      if (C) C.busy = false
      this.emit()
    }
  }

  askOwner(W, step) {
    return new Promise((resolve) => {
      const id = `ap${++this.uid}`
      const dur = this.opts.teaser ? 3.6 : 15
      this.approvals.set(id, { id, workerId: W.id, question: step.ownerCheckInQuestion, start: this.t, dur, resolve })
      this.addOverlay({ id, type: 'ask', actorId: W.id, text: step.ownerCheckInQuestion, approvalId: id, start: this.t, dur, interactive: !this.opts.teaser })
      this.emit()
    })
  }

  approve(id, how = 'click') {
    const ap = this.approvals.get(id)
    if (!ap) return
    this.approvals.delete(id)
    this.removeOverlay(id)
    ap.resolve(how)
    this.emit()
  }

  approvalFor(workerId) {
    for (const ap of this.approvals.values()) if (ap.workerId === workerId) return ap
    return null
  }

  applyEffect(W, step) {
    const we = step.worldEffect || {}
    const n = Math.max(0, Math.min(6, we.spawnCustomers || 0))
    const at = we.aframeUpdated ? { x: MAP.aframeBoard[0] + MAP.aframeBoard[2] / 2, y: MAP.aframeBoard[1] - 6 } : { x: W.x, y: W.y - 58 }
    if (we.floatingBadgeText) this.badge(at.x, at.y, we.floatingBadgeText)
    // the Home page narrates the teaser with these
    this.opts.onMoment?.({
      icon: EVENT_INFO[step.event]?.icon || '☕',
      big: we.floatingBadgeText || step.artifactTitle,
      small: step.ownerCheckInQuestion ? `${AGENT_META[W.id]?.name || 'Your team'} asked you first ✓` : `${AGENT_META[W.id]?.name || 'Your team'} · ${step.artifactTitle}`,
    })
    for (let i = 0; i < n; i++) this.timers.push({ at: this.t + 1.2 + i * 0.9, resolve: () => this.spawnCustomer({ promo: true }) })
    const imp = we.impact || {}
    const gained = {}
    const add = (k, v) => {
      if (!Number.isFinite(v) || v <= 0) return
      const n2 = Math.round(v)
      this.impact[k] += n2
      gained[k] = n2
      if (k in this.stats) this.stat(k, n2)
    }
    add('customers', imp.customers ?? n)
    add('dollars', imp.dollars)
    add('waste', imp.waste)
    add('minutes', imp.minutes)
    add('promos', imp.promos ?? (step.artifactType === 'promo_poster' || step.artifactType === 'sms_campaign' ? 1 : 0))
    add('reviews', imp.reviews)
    add('calls', imp.calls)
    this.emit()
    return gained
  }

  // =========================================================================== main loop
  update(dt) {
    if (this.destroyed) return
    dt = Math.max(0, Math.min(dt || 0, 0.05))
    this.t += dt
    if (this.opts.fixedPhase == null) this.dayT = (this.dayT + dt) % DAY_LENGTH
    if (this.opts.fixedPhase == null && !this.opts.teaser) this.updateDay()

    // timers & waiters
    if (this.timers.length) {
      const due = this.timers.filter((tm) => tm.at <= this.t)
      if (due.length) {
        this.timers = this.timers.filter((tm) => tm.at > this.t)
        due.forEach((tm) => tm.resolve(true))
      }
    }
    if (this.waiters.length) {
      const keep = []
      for (const w of this.waiters) {
        if (w.actor && (w.actor.token !== w.tok || !this.actors.has(w.actor.id))) { w.resolve(false); continue }
        let ok = false
        try { ok = w.pred() } catch { ok = false }
        if (ok) w.resolve(true)
        else if (this.t >= w.until) w.resolve(false)
        else keep.push(w)
      }
      this.waiters = keep
    }

    // movement & animation
    let nearDoor = false
    let nearStaff = false
    let nearInner = false
    const [idc, idr] = MAP.spots.innerDoor?.tile || [-9, -9]
    for (const a of this.actors.values()) {
      a.animT += dt
      if (a.path) {
        const [c, r] = a.path[a.pathI]
        const tgt = TILE(c, r)
        const dx = tgt.x - a.x
        const dy = tgt.y - a.y
        const dist = Math.hypot(dx, dy)
        const stepLen = a.speed * dt
        a.anim = 'walk'
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR.right : DIR.left) : (dy > 0 ? DIR.down : DIR.up)
        if (dist <= stepLen) {
          a.x = tgt.x
          a.y = tgt.y
          a.pathI++
          if (a.pathI >= a.path.length) {
            a.path = null
            a.anim = 'idle'
            const r2 = a.arrive
            a.arrive = null
            r2?.(true)
          }
        } else {
          a.x += (dx / dist) * stepLen
          a.y += (dy / dist) * stepLen
        }
        const [tc, tr] = this.tileOf(a)
        if ((tc === 15 || tc === 16) && tr >= 2 && tr <= 5) nearDoor = true
        if (tc === 27 && tr >= 2 && tr <= 5) nearStaff = true
        if (Math.abs(tc - idc) <= 1 && tr === idr) nearInner = true
      }
    }
    for (const [d, near] of [[this.door, nearDoor], [this.staffDoor, nearStaff], [this.innerDoor, nearInner]]) {
      if (near) d.hold = this.t + 0.6
      const target = this.t < d.hold ? 1 : 0
      d.open += Math.sign(target - d.open) * Math.min(Math.abs(target - d.open), dt * 4.5)
    }

    // systems
    this.updateTill()
    if (this.t >= this.nextSpawn) {
      const busy = this.rushUntil > this.t
      if (!busy) this.spawnCustomer()
      const base = this.rain > 0.3 ? 15 : 8
      this.nextSpawn = this.t + rand(base, base * 1.5) * this.style().pace
    }
    if (this.t >= this.nextPedestrian) {
      this.spawnPedestrian()
      this.nextPedestrian = this.t + (this.rain > 0.3 ? rand(9, 15) : rand(4, 8))
    }
    if (!this.phone.ringing && this.t >= this.phone.next) {
      this.ringPhone()
      this.phone.next = this.t + (this.rushUntil > this.t ? rand(10, 14) : rand(32, 50))
    }
    if (this.phone.ringing && this.t - this.phone.since > 12) {
      // nobody picked up
      this.phone.ringing = false
      this.phone.handler = null
      this.note(17 * T + 16, 3 * T + 4, '📵 Missed call', 2.5, 'missed')
      this.stat('missed')
      this.jot({ kind: 'missed', icon: '📵', text: 'Missed a call — nobody free to pick up (maybe a booking)', tags: ['customers', 'money'] })
      this.emit()
    }
    if (!this.opts.teaser && this.t >= this.nextCatNap) {
      this.catNap()
      this.nextCatNap = this.t + rand(35, 60)
    }
    if (this.phone.ringing && Math.floor(this.t * 1.2) !== Math.floor((this.t - dt) * 1.2)) this.sfx('ring')

    // weather
    if (this.rainTarget && this.t > this.rainUntil) { this.rainTarget = 0; this.opts.onRain?.(false); this.emit() }
    this.rain += Math.sign(this.rainTarget - this.rain) * Math.min(Math.abs(this.rainTarget - this.rain), dt * 0.6)
    if (this.crates && this.t > this.crates.until) this.crates = null

    // overlays expiry + approvals countdown
    let changed = false
    for (const [id, o] of this.overlays) if (o.until && this.t >= o.until) { this.overlays.delete(id); changed = true }
    if (changed) this.bumpOverlays()
    for (const ap of [...this.approvals.values()]) if (this.t - ap.start >= ap.dur) this.approve(ap.id, 'auto')

    // the agentic heartbeat (only while someone is watching the café)
    if (this.t >= this.nextTick && !this.opts.clip) {
      if (this.opts.isLive() && this.pending === 0 && this.workflows.size < 2 && this.presentWorkers().length) {
        this.requestAndRun('tick')
        this.nextTick = this.t + (this.opts.teaser ? rand(7, 10) : rand(18, 22))
      } else {
        this.nextTick = this.t + 3
      }
    }
    if (this.opts.teaser && !this.opts.clip && this.t >= this.nextTeaserEvent) {
      const ev = pick(['rain', 'rush', 'review', 'rain'])
      if (ev !== 'rain' || !this.rainTarget) this.triggerEvent(ev)
      this.nextTeaserEvent = this.t + rand(22, 30)
    }
    if (this.t >= this.nextRoutine) {
      this.routineChatter()
      this.nextRoutine = this.t + rand(6, 10)
    }
  }

  /** Closing time: total up what the team did today for the wrap-up; next morning starts a fresh tally. */
  updateDay() {
    const ph = this.dayPhase()
    if (ph >= CLOSE_AT && this.wrappedDay < this.day) {
      this.wrappedDay = this.day
      const today = Object.fromEntries(Object.keys(this.stats).map((k) => [k, this.stats[k] - (this.dayStart[k] || 0)]))
      this.wrap = { day: this.day, today }
      this.jot({ kind: 'served', icon: '🌙', text: `Closing time: day ${this.day} wrapped up`, tags: ['customers'] })
      this.emit()
    } else if (ph < CLOSE_AT && this.wrappedDay === this.day) {
      this.day++
      this.dayStart = { ...this.stats }
      this.emit()
    }
  }

  // =========================================================================== queries
  hitTest(wx, wy) {
    let best = null
    for (const a of this.actors.values()) {
      if (a.kind !== 'worker' && a.kind !== 'owner' && a.kind !== 'crew' && a.kind !== 'barista') continue
      if (wx >= a.x - 11 && wx <= a.x + 11 && wy >= a.y - 46 && wy <= a.y + 2) {
        if (!best || a.y > best.y) best = a
      }
    }
    if (best) return best.id
    // clicking a station also opens its worker
    for (const id of this.workers) {
      const st = MAP.stations[id]
      if (!st) continue
      const sx = st.tile[0] * T + 16
      const sy = st.tile[1] * T
      if (Math.abs(wx - sx) < 26 && wy > sy - 52 && wy < sy + 10 && this.actors.get(id)) return id
    }
    const cat = MAP.cat
    if (cat && wx > cat.x + 24 && wx < cat.x + cat.w - 24 && wy > cat.y + 4 && wy < cat.y + cat.h) return 'cat'
    return null
  }

  /** Light-weight state for React (bars, team panel, dockets, log badge). */
  snapshot() {
    const workers = {}
    for (const id of this.workers) {
      const a = this.actors.get(id)
      const ap = this.approvalFor(id)
      workers[id] = {
        here: !!a?.arrived && !a?.leaving, busy: !!a?.busy, needsYou: !!ap, jobs: this.jobs[id] || 0,
        status: ap ? 'Waiting for your OK' : !a ? 'Heading in…' : this.status[id] || 'Walking in…',
      }
    }
    const events = {}
    for (const [ev, incId] of Object.entries(this.eventState)) {
      const inc = this.incidents.get(incId)
      if (inc) events[ev] = { status: inc.status, by: inc.by.slice(), startedAt: inc.startedAt, endedAt: inc.endedAt || null, outcome: inc.outcome }
    }
    return {
      v: this.version, t: this.t, present: this.presentWorkers(), queue: this.queue.length,
      thinking: this.pending > 0, rain: this.rainTarget > 0, approvals: this.approvals.size,
      impact: { ...this.impact }, stats: { ...this.stats },
      clock: this.clock(), phase: this.dayPhase(), workers, events, journalN: this.journal.length, wrap: this.wrap, day: this.day,
    }
  }

  workerInfo(id) {
    const a = this.actors.get(id)
    const meta = AGENT_META[id]
    if (!meta) return null
    const ap = this.approvalFor(id)
    const name = meta.name
    return {
      id, ...meta,
      present: !!a?.arrived,
      onTeam: this.workers.has(id),
      status: this.workers.has(id) ? this.status[id] || 'On their way' : 'Not on your team yet',
      busy: !!a?.busy,
      artifact: this.artifacts[id] || null,
      approvalId: ap?.id || null,
      jobs: this.jobs[id] || 0,
      log: this.log.filter((l) => l.text.includes(name)).slice(-3).reverse(),
    }
  }

  destroy() {
    this.destroyed = true
    for (const a of this.actors.values()) a.token++
    this.timers = []
    this.waiters.forEach((w) => w.resolve(false))
    this.waiters = []
  }
}
