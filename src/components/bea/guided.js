// Bea's guided check-up, for when the AI isn't reachable: the same questions as the quick form, understood from
// everyday answers (typed or spoken), ending in a shortlist worked out with the plan's own formulas.
import { EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, PAIN_TOOLS, TECH_LEVELS, RANT_CHIPS, recommendProducts, buildDashboard } from '../../data/mockDashboard'
import { getProduct } from '../../data/products'

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, twenty: 20, thirty: 30 }
const SKIP = /^(no|nope|nah|skip|skip this one|nothing|none|pass|not really|rather not)\b/i
const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
const firstNumber = (t) => {
  const d = t.replace(/,/g, '').match(/\d+(\.\d+)?/)
  if (d) return Number(d[0])
  const w = Object.keys(NUM_WORDS).find((k) => new RegExp(`\\b${k}\\b`, 'i').test(t))
  return w ? NUM_WORDS[w] : null
}
const byLabel = (opts, t) => opts.find((o) => t.toLowerCase().includes(String(o.label).toLowerCase().replace(/[–-]/g, '-')) || t.toLowerCase().replace(/[–]/g, '-').includes(String(o.label).toLowerCase().replace(/[–]/g, '-')))

const PARSE = {
  name: (t) => {
    const n = t.replace(/^(we('re| are)|it'?s|it is|my caf[eé] is|our caf[eé] is|called|the name is|i run)\s+(called\s+)?/i, '').replace(/[.!]+$/, '').trim()
    return n.length >= 2 ? { name: n.slice(0, 40) } : null
  },
  employees: (t) => {
    if (/just me|only me|on my own|by myself|solo/i.test(t)) return { employees: '1-2' }
    const opt = byLabel(EMPLOYEE_OPTIONS, t)
    if (opt) return { employees: opt.id }
    const n = firstNumber(t)
    if (n == null) return null
    return { employees: n <= 2 ? '1-2' : n <= 5 ? '3-5' : n <= 15 ? '6-15' : '16+' }
  },
  revenue: (t) => {
    if (/rather not|don'?t know|not sure|no idea|skip|private/i.test(t)) return { revenue: 'unsure' }
    const opt = byLabel(REVENUE_OPTIONS, t)
    if (opt) return { revenue: opt.id }
    let n = firstNumber(t)
    if (n == null) return /million/i.test(t) ? { revenue: '1m+' } : /half a mil/i.test(t) ? { revenue: '500-1m' } : null
    if (/\b(m|mil|million)\b/i.test(t) || /\dm\b/i.test(t)) n *= 1e6
    else if (/\b(k|thousand|grand)\b/i.test(t) || /\dk\b/i.test(t)) n *= 1e3
    if (/week/i.test(t)) n *= 52
    else if (/month/i.test(t)) n *= 12
    if (n < 1000) n *= 1000 // "about 400" means $400k
    return { revenue: n < 250000 ? 'under250' : n < 500000 ? '250-500' : n < 1000000 ? '500-1m' : '1m+' }
  },
  cafeType: (t) => {
    const opt = byLabel(CAFE_TYPES, t)
    if (opt) return { cafeType: opt.id }
    if (/franchise|chain|sites|locations|stores/i.test(t)) return { cafeType: 'franchise' }
    if (/drive|takeaway|take-away|window|grab|kiosk|cart/i.test(t)) return { cafeType: 'drive' }
    if (/bak|pastr|bread|brunch|cake|croissant|kitchen|food/i.test(t)) return { cafeType: 'bakery' }
    if (/special|coffee|espresso|roast|latte|single.origin|caf[eé]/i.test(t)) return { cafeType: 'specialty' }
    return null
  },
  goal: (t) => {
    const opt = byLabel(PRIMARY_GOALS, t)
    if (opt) return { goal: opt.id }
    if (/waste|bin|throw|stock|leftover/i.test(t)) return { goal: 'waste' }
    if (/rush|queue|line|faster|speed|wait|morning/i.test(t)) return { goal: 'speed' }
    if (/sales|grow|customers|busier|revenue|more people|covers|quiet/i.test(t)) return { goal: 'revenue' }
    if (/time|evening|admin|paper|hours|weekend|family|sleep|life/i.test(t)) return { goal: 'hours' }
    return null
  },
  pains: (t) => {
    const out = new Set()
    PAIN_POINTS.forEach((p) => { if (t.toLowerCase().includes(p.label.toLowerCase())) out.add(p.id) })
    if (/paper|admin|invoice|books|bas|tax|receipt|bookkeep|payroll|accounts/i.test(t)) out.add('admin')
    if (/waste|bin|stock|leftover|throw|spoil|order/i.test(t)) out.add('waste')
    if (/quiet|slow|new (faces|customers)|empty|marketing|social/i.test(t)) out.add('quiet')
    if (/queue|rush|wait|line|busy|till/i.test(t)) out.add('queues')
    if (/roster|staff|shift|sick|cover|team/i.test(t)) out.add('staff')
    if (/review|message|phone|email|question|call|enquir/i.test(t)) out.add('reviews')
    return out.size ? { pains: [...out] } : null
  },
  tech: (t) => {
    const opt = byLabel(TECH_LEVELS, t)
    if (opt) return { tech: opt.id }
    if (/savvy|love|great|nerd|early adopter|very good|expert/i.test(t)) return { tech: 4 }
    if (/comfortable|good|confident|fine with|pretty good|no problem/i.test(t)) return { tech: 3 }
    if (/shy|hate|terrible|scared|not good|bad|struggle|hopeless|nervous/i.test(t)) return { tech: 1 }
    if (/ok|okay|getting by|average|alright|so.so|manage|fine/i.test(t)) return { tech: 2 }
    return null
  },
}

const QUESTIONS = {
  name: () => ({ text: 'What’s your café called?', quickReplies: [] }),
  employees: () => ({ text: 'How many people are on your team, you included?', quickReplies: EMPLOYEE_OPTIONS.map((o) => `${o.label} people`) }),
  revenue: () => ({ text: 'Roughly what are your sales in a year? A ballpark is fine, or tell me you’d rather not say.', quickReplies: REVENUE_OPTIONS.map((o) => o.label) }),
  cafeType: () => ({ text: 'What kind of café is it?', quickReplies: CAFE_TYPES.map((o) => o.label) }),
  goal: () => ({ text: 'What matters most to you right now?', quickReplies: PRIMARY_GOALS.map((o) => o.label) }),
  pains: () => ({ text: 'What eats most of your week? Pick as many as you like, or just tell me.', quickReplies: PAIN_POINTS.map((o) => o.label), multiSelect: true }),
  tech: () => ({ text: 'And how are you with new tech?', quickReplies: TECH_LEVELS.map((o) => o.label) }),
  rant: () => ({ text: 'Last one, and it’s optional: in a sentence, what’s the biggest headache in your week?', quickReplies: ['Skip this one', ...RANT_CHIPS.slice(0, 3)] }),
}

const ACK = {
  name: (s) => `Lovely, ${s.name}.`,
  employees: (s) => `Got it, ${EMPLOYEE_OPTIONS.find((o) => o.id === s.employees)?.label} people.`,
  revenue: (s) => (s.revenue === 'unsure' ? 'No worries, I’ll use a typical small café.' : 'Thanks, that helps me size things.'),
  cafeType: (s) => `A ${CAFE_TYPES.find((o) => o.id === s.cafeType)?.label.toLowerCase()}, lovely.`,
  goal: (s) => `${PRIMARY_GOALS.find((o) => o.id === s.goal)?.label}: that’s a good one to aim for.`,
  pains: (s) => `Noted: ${list((s.pains || []).map((p) => PAIN_POINTS.find((x) => x.id === p)?.label.toLowerCase()).filter(Boolean))}.`,
  tech: () => 'Thanks, I’ll pace the setup to suit.',
  rant: (s) => (s.rant ? 'Thanks for telling me. I’ll keep that front of mind.' : 'No problem.'),
}

const ORDER = ['name', 'employees', 'revenue', 'cafeType', 'goal', 'pains', 'tech', 'rant']
const missing = (s, k) => (k === 'pains' ? !(s.pains || []).length : k === 'rant' ? false : !s[k] && s[k] !== 0)

/** The next thing Bea needs to ask, or null when she has enough. */
export function nextQuestion(survey, askedRant) {
  const k = ORDER.find((key) => (key === 'rant' ? !askedRant : missing(survey, key)))
  return k ? { key: k, ...QUESTIONS[k]() } : null
}

/** A shortlist in the same shape the AI returns, worked out with the plan's own formulas. */
export function shortlistFor(survey, { cheaper = false, fewer = false } = {}) {
  let recs = recommendProducts(survey).slice(0, 5)
  if (cheaper) recs = [...recs].sort((a, b) => a.cost - b.cost)
  const pick = recs.slice(0, fewer || cheaper ? 2 : 3)
  const pains = (survey.pains || []).map((id) => PAIN_POINTS.find((p) => p.id === id)).filter(Boolean)
  // each tool's reason names the headache it's built for, and no two tools give the same reason
  const used = new Set()
  const tools = pick
    .map((p) => ({ p, direct: pains.some((pp) => PAIN_TOOLS[pp.id]?.includes(p.id)) }))
    .sort((a, b) => b.direct - a.direct)
    .map(({ p }) => {
      const cands = [
        pains.find((pp) => PAIN_TOOLS[pp.id]?.includes(p.id) && !used.has(pp.id)),
        pains.find((pp) => pp.use.includes(p.useCases[0]) && !used.has(pp.id)),
        pains.find((pp) => pp.use.some((u) => p.useCases.includes(u)) && !used.has(pp.id)),
      ]
      const pain = cands.find(Boolean)
      if (pain) used.add(pain.id)
      return { id: p.id, reason: pain ? `Helps with “${pain.label.toLowerCase()}”.` : `${p.tagline}.` }
    })
  tools.sort((a, b) => pick.findIndex((p) => p.id === a.id) - pick.findIndex((p) => p.id === b.id))
  const d = buildDashboard(survey, tools.map((t) => t.id))
  return { kind: 'shortlist', tools, bill: d.toolCost, hours: d.hoursSaved, net: d.netGain, range: d.range }
}

/**
 * One turn of the guided check-up. Returns the survey update and Bea's reply (with a shortlist once she has
 * everything). `state.askedRant` tracks the optional last question; `state.proposed` the shortlist.
 */
export function guidedTurn(text, survey, state) {
  const t = String(text || '').trim()
  // after a shortlist: understand "cheaper" or "fewer", otherwise point to the buttons
  if (state.proposed) {
    const cheaper = /cheap|less|budget|afford|cost|price/i.test(t)
    const fewer = /fewer|less tools|all (of )?th|need all|too many|just one|simpler/i.test(t)
    if (cheaper || fewer) {
      const p = shortlistFor(survey, { cheaper, fewer })
      return { update: {}, reply: { text: cheaper ? 'Here’s a leaner version, starting with the cheapest tools that still fit.' : 'Fair enough. Here are just the two that would make the biggest difference.', proposal: p } }
    }
    return { update: {}, reply: { text: 'I can make it cheaper or trim it to fewer tools. Or, if these look right, build your plan with them and you can change anything later.', quickReplies: ['Something cheaper', 'Do I need all of these?'] } }
  }
  const q = nextQuestion(survey, state.askedRant)
  if (!q) {
    state.proposed = true
    return { update: {}, reply: { text: 'Here’s what I’d suggest.', proposal: shortlistFor(survey) } }
  }
  let update = null
  if (q.key === 'rant') {
    state.askedRant = true
    update = { rant: SKIP.test(t) ? '' : t.slice(0, 300) }
  } else {
    update = PARSE[q.key](t)
  }
  if (!update) return { update: {}, reply: { text: `Sorry, I didn’t quite catch that. ${q.text}`, quickReplies: q.quickReplies, multiSelect: !!q.multiSelect } }
  const next = { ...survey, ...update }
  const after = nextQuestion(next, state.askedRant)
  if (after) return { update, reply: { text: `${ACK[q.key](next)} ${after.text}`, quickReplies: after.quickReplies, multiSelect: !!after.multiSelect } }
  state.proposed = true
  const p = shortlistFor(next)
  const names = p.tools.map((x) => getProduct(x.id)?.name).filter(Boolean)
  return { update, reply: { text: `${ACK[q.key](next)} That’s everything I need. For ${next.name || 'your café'}, I’d start with ${list(names)}. Here’s what that would look like:`, proposal: p } }
}
