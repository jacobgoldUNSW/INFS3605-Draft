// Bea, Cafinity's café advisor: a Gemini agent that acts through our own functions.
// Two jobs: the chat check-up (get to know the café, then propose a shortlist of tools) and "Ask Bea"
// on the plan page (compare tools, explain numbers, propose changes to the plan or a setup schedule).
// Gemini only ever *proposes*: every change waits for the owner's Accept in the browser.
import { Type, FunctionCallingConfigMode } from '@google/genai'
import { genai, MODELS, VOICE, withTimeout } from './gemini.js'
import { auDeep } from '../shared/auEnglish.js'
import { fallbackPersonalisation } from '../shared/personalise.js'
import { PRODUCTS, getProduct, overlapsIn } from '../src/data/products.js'
import {
  EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS, DEFAULT_SURVEY,
  recommendProducts, buildDashboard,
} from '../src/data/mockDashboard.js'

const MAX_ROUNDS = 5
const TOOL_IDS = PRODUCTS.map((p) => p.id)
const PHASES = ['Week 1 · Quick win', 'Weeks 2–3 · Core habit', 'Month 2 · Upgrade']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PERSONA = `You are Bea, Cafinity's café advisor: a warm, down-to-earth Australian ex-barista who has helped lots of
small cafés get their paperwork under control. You are chatting with a café owner inside the Cafinity web app.
${VOICE}
Talk like a friendly text message: 1 to 3 short sentences, no lists, no headings, no emoji spam (one is fine).
Call each tool by its product name (Dext, Xero, Square…) or simply "tools"; never give them people's names. Be honest about costs and limits; never oversell.
Never say you have signed anyone up, paid, emailed, messaged or contacted anyone: you only suggest, the owner decides.
When you propose something, word it as a suggestion ("How about…", "I'd swap…"), never as done ("I've swapped…"):
nothing changes until the owner presses Accept.`

/* ------------------------------------------------------------------------------ the agent loop */

class AgentError extends Error {}

/**
 * Runs Gemini with function calling forced on: every reply is one or more function calls. Non-final calls
 * run here and their results go back to Gemini; a final call (say / propose_…) ends the turn.
 * Falls back to the second model if the first fails.
 */
async function runAgent({ system, contents, tools, handlers, finals, ctx, temperature = 0.8 }) {
  if (!genai) throw new AgentError('Gemini key not configured')
  let lastErr
  for (const { model, thinkingConfig } of MODELS) {
    const t0 = Date.now()
    const convo = [...contents]
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await withTimeout(genai.models.generateContent({
          model,
          contents: convo,
          config: {
            systemInstruction: system,
            tools: [{ functionDeclarations: tools }],
            toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
            thinkingConfig,
            temperature,
            maxOutputTokens: 1400,
          },
        }), 14000)
        const calls = res.functionCalls || []
        const content = res.candidates?.[0]?.content
        if (!calls.length || !content) throw new Error('no function call')
        convo.push(content) // keeps Gemini's thought signatures for the next round
        const responses = []
        let done = false
        for (const c of calls) {
          const fn = handlers[c.name]
          let result
          try { result = fn ? await fn(c.args || {}, ctx) : { error: `unknown function ${c.name}` } } catch (e) { result = { error: String(e.message || e) } }
          if (finals.includes(c.name) && !result?.error) done = true
          responses.push({ functionResponse: { name: c.name, id: c.id, response: result && typeof result === 'object' ? result : { result } } })
        }
        if (done) {
          console.log(`[bea] ${model} ✓ ${round + 1} round${round ? 's' : ''} ${Date.now() - t0}ms`)
          return { model, ms: Date.now() - t0 }
        }
        convo.push({ role: 'user', parts: responses })
      }
      throw new Error('too many rounds without a reply')
    } catch (e) {
      lastErr = e
      console.warn(`[bea] ${model} failed (${Date.now() - t0}ms): ${String(e.message || e).slice(0, 160)}`)
      ctx.reset?.()
    }
  }
  throw lastErr
}

/** The chat so far, as Gemini turns. Earlier turns are plain text; only this turn's calls carry signatures. */
function toContents(transcript, message) {
  const turns = []
  for (const m of transcript.slice(-24)) {
    const role = m.from === 'bea' ? 'model' : 'user'
    const last = turns[turns.length - 1]
    if (last && last.role === role) last.parts[0].text += `\n${m.text}`
    else turns.push({ role, parts: [{ text: m.text }] })
  }
  if (message) {
    const last = turns[turns.length - 1]
    if (last && last.role === 'user') last.parts[0].text += `\n${message}`
    else turns.push({ role: 'user', parts: [{ text: message }] })
  }
  if (!turns.length || turns[0].role !== 'user') turns.unshift({ role: 'user', parts: [{ text: '(The owner has just opened the chat.)' }] })
  return turns
}

export function cleanTranscript(t) {
  if (!Array.isArray(t)) return []
  return t
    .filter((m) => m && (m.from === 'bea' || m.from === 'owner') && typeof m.text === 'string' && m.text.trim())
    .slice(-40)
    .map((m) => ({ from: m.from, text: m.text.slice(0, 800) }))
}

/* ------------------------------------------------------------------------------ shared pieces */

const label = (arr, id) => arr.find((x) => x.id === id)?.label
const optionList = (arr) => arr.map((o) => `${o.id} = "${o.label}"`).join(', ')

function describeProfile(s) {
  return [
    `name: ${s.name || '(not yet)'}`,
    `employees: ${s.employees ? `${s.employees} (${label(EMPLOYEE_OPTIONS, s.employees)})` : '(not yet)'}`,
    `revenue: ${s.revenue ? `${s.revenue} (${label(REVENUE_OPTIONS, s.revenue)})` : '(not yet)'}`,
    `cafeType: ${s.cafeType ? `${s.cafeType} (${label(CAFE_TYPES, s.cafeType)})` : '(not yet)'}`,
    `goal: ${s.goal ? `${s.goal} (${label(PRIMARY_GOALS, s.goal)})` : '(not yet)'}`,
    `pains: ${s.pains?.length ? s.pains.map((p) => `${p} (${label(PAIN_POINTS, p)})`).join(', ') : '(not yet)'}`,
    `tech: ${s.tech ? `${s.tech} (${label(TECH_LEVELS, s.tech)})` : '(not yet)'}`,
    `rant (their words): ${s.rant ? `"${s.rant}"` : '(not yet, optional)'}`,
  ].join('\n')
}

const missing = (s) => [
  !s.name?.trim() && 'name', !s.employees && 'employees', !s.revenue && 'revenue', !s.cafeType && 'cafeType',
  !s.goal && 'goal', !s.pains?.length && 'pains', !s.tech && 'tech',
].filter(Boolean)

export function cleanProfile(p) {
  const s = { ...DEFAULT_SURVEY }
  if (!p || typeof p !== 'object') return s
  if (typeof p.name === 'string') s.name = p.name.trim().slice(0, 60)
  if (EMPLOYEE_OPTIONS.some((o) => o.id === p.employees)) s.employees = p.employees
  if (REVENUE_OPTIONS.some((o) => o.id === p.revenue)) s.revenue = p.revenue
  if (CAFE_TYPES.some((o) => o.id === p.cafeType)) s.cafeType = p.cafeType
  if (PRIMARY_GOALS.some((o) => o.id === p.goal)) s.goal = p.goal
  if (Array.isArray(p.pains)) s.pains = [...new Set(p.pains.filter((x) => PAIN_POINTS.some((o) => o.id === x)))]
  const tech = Number(p.tech)
  if (TECH_LEVELS.some((o) => o.id === tech)) s.tech = tech
  if (typeof p.rant === 'string') s.rant = p.rant.trim().slice(0, 300)
  return s
}

const toolCard = (p, inPlan) => ({
  id: p.id, name: p.name, inPlan, job: p.worker.job, price: p.priceLabel, monthly: p.cost,
  freeOption: !!p.pricing?.free, hoursBackPerWeek: p.hrs, setupWeeks: p.weeks, bestFor: p.bestFor,
})

function estimateFor(survey, ids) {
  const d = buildDashboard(survey, ids)
  return {
    tools: ids.map((id) => getProduct(id)?.name),
    monthlyBill: d.toolCost,
    hoursBackPerWeek: d.hoursSaved,
    ownHoursBackPerWeek: d.ownerHours,
    monthlyGainRange: d.netGain > 0 ? `$${d.range[0]}–$${d.range[1]}` : 'no cash gain; the payoff is time back',
    paybackMonths: d.paybackMonths,
    overlaps: overlapsIn(ids).map((o) => o.note),
  }
}

const numbersSnap = (survey, ids) => {
  const d = buildDashboard(survey, ids)
  return { bill: d.toolCost, hours: d.hoursSaved, ownHours: d.ownerHours, range: d.range, net: d.netGain, payback: d.paybackMonths }
}

const validIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).filter((id) => TOOL_IDS.includes(id)))]

const sayDecl = (extra = '') => ({
  name: 'say',
  description: `Send your next chat message to the owner. This ends your turn.${extra}`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: { type: Type.STRING, description: '1–3 short, warm sentences' },
      quickReplies: { type: Type.ARRAY, items: { type: Type.STRING }, description: '0–6 short tap-to-answer options (max 5 words each)' },
      multiSelect: { type: Type.BOOLEAN, description: 'true if the owner may pick several quick replies' },
    },
    required: ['message'],
  },
})

// a proposal hasn't happened yet, so "I've swapped…" becomes "I'd swap…"
const SUGGEST = { swapped: 'swap', added: 'add', removed: 'remove', dropped: 'drop', changed: 'change', replaced: 'replace', cut: 'cut', moved: 'move', planned: 'plan', scheduled: 'schedule', booked: 'book', put: 'put' }
const asSuggestion = (t) => t.replace(/\b(I|We)['’]ve (also )?(swapped|added|removed|dropped|changed|replaced|cut|moved|planned|scheduled|booked|put)\b/gi,
  (_, who, also, verb) => `${who}'d ${also || ''}${SUGGEST[verb.toLowerCase()]}`)

const reply = (args, proposal = false) => auDeep({
  text: (proposal ? asSuggestion : (x) => x)(String(args.message || '').trim()).slice(0, 600),
  quickReplies: (Array.isArray(args.quickReplies) ? args.quickReplies : []).filter((q) => typeof q === 'string' && q.trim()).slice(0, 6).map((q) => q.trim().slice(0, 48)),
  multiSelect: !!args.multiSelect,
})

/* ------------------------------------------------------------------------------ job 1: the check-up */

const checkupTools = [
  {
    name: 'set_profile',
    description: 'Record what the owner has told you about their café. Only include fields you learned; use the exact ids.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'the café’s name' },
        employees: { type: Type.STRING, enum: EMPLOYEE_OPTIONS.map((o) => o.id), description: 'team size, owner included' },
        revenue: { type: Type.STRING, enum: REVENUE_OPTIONS.map((o) => o.id), description: 'yearly sales band ("unsure" if they would rather not say)' },
        cafeType: { type: Type.STRING, enum: CAFE_TYPES.map((o) => o.id) },
        goal: { type: Type.STRING, enum: PRIMARY_GOALS.map((o) => o.id), description: 'their number one goal' },
        pains: { type: Type.ARRAY, items: { type: Type.STRING, enum: PAIN_POINTS.map((o) => o.id) }, description: 'everything that eats their time (replaces the list)' },
        tech: { type: Type.INTEGER, description: 'comfort with tech: 1 tech-shy, 2 getting by, 3 comfortable, 4 tech-savvy' },
        rant: { type: Type.STRING, description: 'their biggest headache in their own words (keep their wording, max 2 sentences)' },
      },
    },
  },
  {
    name: 'recommend_tools',
    description: 'Look up which of the 12 Cafinity tools best fit this café, best first, using our matching rules.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'estimate',
    description: 'Work out the monthly bill, hours back and likely monthly gain for a set of tools, using our formulas.',
    parameters: { type: Type.OBJECT, properties: { toolIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['toolIds'] },
  },
  {
    name: 'propose_shortlist',
    description: 'Suggest 2–4 tools for this café. The owner sees them with your reasons and decides. This ends your turn.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING, description: '1–2 sentences introducing the shortlist' },
        tools: {
          type: Type.ARRAY,
          items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, reason: { type: Type.STRING, description: 'max 16 words, refers to what they told you' } }, required: ['id', 'reason'] },
        },
      },
      required: ['message', 'tools'],
    },
  },
  sayDecl(),
]

function checkupSystem(profile) {
  const need = missing(profile)
  return `${PERSONA}

YOUR JOB RIGHT NOW: a relaxed check-up to get to know their café, then suggest a small team of tools.
WHAT YOU KNOW SO FAR:
${describeProfile(profile)}
STILL NEEDED: ${need.length ? need.join(', ') : 'nothing: you have enough to suggest tools'}

HOW TO WORK (always through functions):
- Whenever the owner tells you something useful, call set_profile with it in the same turn, using these exact ids:
  employees: ${optionList(EMPLOYEE_OPTIONS)}
  revenue: ${optionList(REVENUE_OPTIONS)}
  cafeType: ${optionList(CAFE_TYPES)}
  goal: ${optionList(PRIMARY_GOALS)}
  pains: ${optionList(PAIN_POINTS)}
  tech: 1 = "Tech-shy", 2 = "Getting by", 3 = "Comfortable", 4 = "Tech-savvy"
  Put their biggest headache, in their own words, in rant. One message can fill several fields.
- Then call say with your next message: react warmly to what they said in a few words, then ask about ONE still-needed thing.
  Offer quickReplies using the labels above (for pains set multiSelect true and add "That's about it").
  Ask about sales gently ("a ballpark is fine, or skip it").
- You may ask one short follow-up when an answer is vague or interesting, but keep the whole chat to about 8 questions.
- When nothing is still needed: call recommend_tools, then estimate for the 2–4 tools you would pick (fewer for tech-shy owners,
  keep the bill sensible for small cafés), then propose_shortlist with a reason for each that echoes what they told you.
- If they ask you something, answer briefly and honestly, then carry on. Never invent tools or prices.`
}

export async function beaCheckup({ transcript = [], message = '', profile = {} }) {
  const out = { profile: cleanProfile(profile), reply: null, proposal: null }
  const start = JSON.stringify(out.profile)
  const ctx = { reset: () => { out.profile = JSON.parse(start); out.reply = null; out.proposal = null } }
  const handlers = {
    set_profile: (a) => {
      const next = cleanProfile({ ...out.profile, ...a, pains: Array.isArray(a.pains) ? a.pains : out.profile.pains })
      out.profile = next
      return { saved: Object.keys(a), stillNeeded: missing(next) }
    },
    recommend_tools: () => ({ tools: recommendProducts(out.profile).slice(0, 7).map((p) => toolCard(p, false)) }),
    estimate: (a) => {
      const ids = validIds(a.toolIds)
      if (!ids.length) return { error: 'use tool ids from recommend_tools' }
      return estimateFor(out.profile, ids)
    },
    propose_shortlist: (a) => {
      const picks = []
      for (const t of Array.isArray(a.tools) ? a.tools : []) {
        if (TOOL_IDS.includes(t?.id) && !picks.some((x) => x.id === t.id)) picks.push({ id: t.id, reason: String(t.reason || '').slice(0, 160) })
      }
      if (!picks.length) return { error: 'propose at least one tool id from recommend_tools' }
      const ids = picks.slice(0, 5).map((t) => t.id)
      out.proposal = auDeep({ kind: 'shortlist', tools: picks.slice(0, 5), ...numbersSnap(out.profile, ids) })
      out.reply = reply({ message: a.message }, true)
      return { shown: true }
    },
    say: (a) => { out.reply = reply(a); return { shown: true } },
  }
  const meta = await runAgent({
    system: checkupSystem(out.profile),
    contents: toContents(cleanTranscript(transcript), String(message || '').slice(0, 500)),
    tools: checkupTools, handlers, finals: ['say', 'propose_shortlist'], ctx,
  })
  return { ...out, missing: missing(out.profile), source: 'gemini', ...meta }
}

/* ------------------------------------------------------------------------------ job 2: Ask Bea on the plan */

const planTools = [
  {
    name: 'estimate',
    description: 'Work out the monthly bill, hours back and likely monthly gain for any set of tools, using our formulas.',
    parameters: { type: Type.OBJECT, properties: { toolIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['toolIds'] },
  },
  {
    name: 'list_tools',
    description: 'All 12 Cafinity tools with their job, price and fit for this café (inPlan marks the ones already chosen).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'compare_tools',
    description: 'Look up the details of 1–3 tools side by side: price, plan, trial, pros, cons, what they won’t do, and their real risks.',
    parameters: { type: Type.OBJECT, properties: { toolIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['toolIds'] },
  },
  {
    name: 'explain_numbers',
    description: 'Get the working behind one of the plan’s numbers.',
    parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING, enum: ['hours', 'money', 'payback'] } }, required: ['topic'] },
  },
  {
    name: 'propose_tool_change',
    description: 'Propose adding and/or removing tools. The owner sees the before-and-after and decides. This ends your turn.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING, description: '1–2 sentences, worded as a suggestion, describing exactly this add/remove and the trade-off (e.g. "How about swapping MarketMan for Ordermentum? It’s free and still sorts your ordering.")' },
        add: { type: Type.ARRAY, items: { type: Type.STRING } },
        remove: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['message'],
    },
  },
  {
    name: 'propose_schedule',
    description: 'Plan setup sessions for the tools in the plan around the owner’s free days. The owner sees it and decides. This ends your turn.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING },
        freeDays: { type: Type.ARRAY, items: { type: Type.STRING, enum: DAYS } },
        timeOfDay: { type: Type.STRING, enum: ['morning', 'afternoon', 'evening'] },
        maxMinutes: { type: Type.INTEGER, description: 'longest session they can manage, in minutes (default 60)' },
      },
      required: ['message', 'freeDays'],
    },
  },
  sayDecl(' Use this for answers that don’t change the plan.'),
]

function planSystem(survey, selected) {
  const est = estimateFor(survey, selected)
  const tools = selected.map((id) => getProduct(id)).filter(Boolean)
  return `${PERSONA}

YOUR JOB RIGHT NOW: you are sitting beside the owner on their Cafinity plan page, helping them fine-tune it.
You can look things up and PROPOSE changes; nothing changes unless the owner presses Accept.
THEIR CAFÉ:
${describeProfile(survey)}
THEIR PLAN: ${tools.map((p) => `${p.id} (${p.name}, ${p.priceLabel})`).join('; ') || 'no tools yet'}
Monthly bill about $${est.monthlyBill}. About ${est.hoursBackPerWeek} hrs a week back (${est.ownHoursBackPerWeek} of them the owner's own).
Likely monthly gain: ${est.monthlyGainRange}. Payback: ${est.paybackMonths ? `about ${est.paybackMonths} months` : 'n/a'}.${est.overlaps.length ? ` Overlap: ${est.overlaps.join(' ')}` : ''}

HOW TO WORK (always through functions):
- To change which tools are in the plan (cheaper, simpler, something new), check options with estimate, list_tools or
  compare_tools as needed, then call propose_tool_change with tool ids. Explain the trade-off honestly in the message.
- When they give a budget, check candidate sets with estimate and only propose one that is strictly within it
  ("under $200" means less than $200). If nothing sensible fits, say so kindly and offer the closest option.
- To plan when they'll set things up, call propose_schedule with their free days (ask first if you don't know them).
- To compare tools, use compare_tools; to explain a number, use explain_numbers; then answer with say.
- Finish every turn with say or a propose_ function. Keep it short. Never invent tools, prices or numbers.`
}

function buildSchedule(survey, selected, cards, { freeDays, timeOfDay = 'afternoon', maxMinutes = 60 }) {
  const days = DAYS.filter((d) => (freeDays || []).includes(d))
  if (!days.length) return null
  const cap = Math.max(20, Math.min(180, Math.round(Number(maxMinutes) || 60)))
  const fb = fallbackPersonalisation(survey, selected).setupCards
  const list = selected.map((id) => (cards || []).find((c) => c?.toolId === id) || fb.find((c) => c.toolId === id)).filter(Boolean)
  const startWeek = { [PHASES[0]]: 1, [PHASES[1]]: 2, [PHASES[2]]: 5 }
  list.sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase))
  const sessions = []
  const used = new Map() // "week-day" → minutes booked
  for (const c of list) {
    const minutes = Math.max(10, Math.min(180, Math.round(Number(c.minutes) || 30)))
    let week = startWeek[c.phase] || 1
    let placed = false
    while (!placed && week < 12) {
      for (const day of days) {
        const k = `${week}-${day}`
        const booked = used.get(k) || 0
        if (booked === 0 || booked + minutes <= cap) {
          used.set(k, booked + minutes)
          sessions.push({ week, day, toolId: c.toolId, tool: getProduct(c.toolId)?.name, minutes, what: String(c.steps?.[0] || 'Set up').slice(0, 120) })
          placed = true
          break
        }
      }
      week++
    }
  }
  return { timeOfDay: ['morning', 'afternoon', 'evening'].includes(timeOfDay) ? timeOfDay : 'afternoon', sessions }
}

export async function beaPlan({ transcript = [], message = '', survey = {}, selected = [], setupCards = [] }) {
  const profile = cleanProfile(survey)
  const chosen = validIds(selected)
  const out = { reply: null, proposal: null }
  const ctx = { reset: () => { out.reply = null; out.proposal = null } }
  const handlers = {
    estimate: (a) => {
      const ids = validIds(a.toolIds)
      return ids.length ? estimateFor(profile, ids) : { error: 'no valid tool ids' }
    },
    list_tools: () => {
      const fit = recommendProducts(profile).map((p) => p.id)
      return { tools: PRODUCTS.map((p) => ({ ...toolCard(p, chosen.includes(p.id)), goodFitRank: fit.includes(p.id) ? fit.indexOf(p.id) + 1 : null })) }
    },
    compare_tools: (a) => ({
      tools: validIds(a.toolIds).slice(0, 3).map((id) => {
        const p = getProduct(id)
        return { id, name: p.name, price: p.priceLabel, plan: p.pricing?.plan, trial: p.pricing?.trial, freeOption: !!p.pricing?.free, job: p.worker.job, pros: p.pros, cons: p.cons, wontDo: p.wont, risks: (p.risks || []).map((r) => `${r.title}: ${r.detail}`), hoursBackPerWeek: p.hrs, setupWeeks: p.weeks, bestFor: p.bestFor }
      }),
    }),
    explain_numbers: (a) => {
      const d = buildDashboard(profile, chosen)
      return { lines: d.why[a.topic] || d.why.money }
    },
    propose_tool_change: (a) => {
      const add = validIds(a.add).filter((id) => !chosen.includes(id))
      const remove = validIds(a.remove).filter((id) => chosen.includes(id))
      if (!add.length && !remove.length) return { error: 'add or remove at least one tool (use ids)' }
      const next = [...chosen.filter((id) => !remove.includes(id)), ...add]
      if (!next.length) return { error: 'the plan needs at least one tool' }
      // the message has to match the change: a tool it names must be added, removed or already in the plan
      const said = String(a.message || '').toLowerCase()
      const stray = PRODUCTS.filter((p) => [p.name, p.name.replace(/^Microsoft\s+/, '')].some((n) => said.includes(n.toLowerCase())) && !next.includes(p.id) && !remove.includes(p.id))
      if (stray.length) return { error: `Your message mentions ${stray.map((p) => p.name).join(', ')}, which this change doesn't add. Add ${stray.length > 1 ? 'them' : 'it'} to "add", or reword the message to match exactly what you propose.` }
      out.proposal = { kind: 'change', add, remove, selected: next, before: numbersSnap(profile, chosen), after: numbersSnap(profile, next), overlaps: overlapsIn(next).map((o) => o.note) }
      out.reply = reply({ message: a.message }, true)
      return { shown: true }
    },
    propose_schedule: (a) => {
      const sched = buildSchedule(profile, chosen, setupCards, a)
      if (!sched || !sched.sessions.length) return { error: 'give at least one free day (Mon–Sun) and make sure the plan has tools' }
      out.proposal = { kind: 'schedule', ...sched }
      out.reply = reply({ message: a.message }, true)
      return { shown: true, sessions: sched.sessions.length }
    },
    say: (a) => { out.reply = reply(a); return { shown: true } },
  }
  const meta = await runAgent({
    system: planSystem(profile, chosen),
    contents: toContents(cleanTranscript(transcript), String(message || '').slice(0, 500)),
    tools: planTools, handlers, finals: ['say', 'propose_tool_change', 'propose_schedule'], ctx, temperature: 0.55,
  })
  return { ...out, source: 'gemini', ...meta }
}

// exported for tests
export const _internals = { buildSchedule, cleanProfile, missing, estimateFor, toContents }
