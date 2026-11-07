// "Talk to Bea" on a finished plan, when the AI isn't available: the everyday asks (cheaper, fewer tools, setup
// dates, explain the numbers) answered with the plan's own formulas, as the same proposal cards the AI makes.
import { buildDashboard } from '../../data/mockDashboard'
import { getProduct, overlapsIn } from '../../data/products'

const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
const money = (n) => `$${Math.round(n).toLocaleString('en-AU')}`
const snap = (survey, ids) => {
  const d = buildDashboard(survey, ids)
  return { bill: d.toolCost, hours: d.hoursSaved, ownHours: d.ownerHours, range: d.range, net: d.netGain, payback: d.paybackMonths }
}
const change = (survey, chosen, remove, add = []) => {
  const next = [...chosen.filter((id) => !remove.includes(id)), ...add]
  return { kind: 'change', add, remove, selected: next, before: snap(survey, chosen), after: snap(survey, next), overlaps: overlapsIn(next).map((o) => o.note) }
}
const MENU = ['Is this the cheapest way?', 'Do I need all of these?', 'Plan my setup around my week', 'Explain my numbers']
const PHASE_WEEK = { 'Week 1 · Quick win': 1, 'Weeks 2–3 · Core habit': 2, 'Month 2 · Upgrade': 5 }

export function planTurn(text, { survey, selected, setupCards = [] }) {
  const t = String(text || '').toLowerCase()
  const tools = selected.map(getProduct).filter(Boolean)
  const bill = tools.reduce((s, p) => s + (p.cost || 0), 0)

  if (/cheap|under \$?\d|less money|budget|cost less|too expensive|afford/.test(t)) {
    if (tools.length <= 1) return { text: `${tools[0]?.name || 'That'} is already the leanest version of your plan.` }
    const target = Number(t.match(/under \$?(\d+)/)?.[1]) || null
    // drop the tools that cost the most for the hours they give back, until it fits (always keep one)
    const ranked = [...tools].sort((a, b) => b.cost / Math.max(1, b.hrs) - a.cost / Math.max(1, a.hrs))
    const remove = []
    let left = bill
    for (const p of ranked) {
      if (target ? left <= target : remove.length >= 1) break
      if (tools.length - remove.length <= 1 || !p.cost) continue
      remove.push(p.id)
      left -= p.cost
    }
    if (!remove.length) return { text: target ? `You’re already under ${money(target)} a month.` : 'Everything on your plan is already good value for the time it gives back.' }
    const names = remove.map((id) => getProduct(id).name)
    const note = target && left > target ? ` That’s as low as it goes while keeping the rest: about ${money(left)} a month.` : ` That brings the bill to about ${money(left)} a month.`
    return { text: `How about leaving out ${list(names)} for now?${note} Here’s what changes:`, proposal: change(survey, selected, remove) }
  }

  if (/need all|fewer|too many|simpler|just one|cut back|start small/.test(t)) {
    if (tools.length <= 1) return { text: 'There’s only one tool on your plan, so it’s as simple as it gets.' }
    const weakest = [...tools].sort((a, b) => a.hrs - b.hrs || b.cost - a.cost)[0]
    return { text: `Not necessarily. ${weakest.name} gives back the least time for its cost, so it’s the one I’d leave for later. Here’s your plan without it:`, proposal: change(survey, selected, [weakest.id]) }
  }

  if (/plan my setup|schedule|calendar|when should|around my week|setup dates/.test(t)) {
    const perWeek = {}
    const sessions = setupCards.map((c) => {
      let week = PHASE_WEEK[c.phase] || 1
      while ((perWeek[week] || 0) >= 2) week++
      const day = perWeek[week] ? 'Thu' : 'Tue'
      perWeek[week] = (perWeek[week] || 0) + 1
      return { week, day, toolId: c.toolId, tool: getProduct(c.toolId)?.name || c.toolId, minutes: c.minutes || 30, what: c.steps?.[0] || 'Get it set up' }
    })
    if (!sessions.length) return { text: 'Add a tool first, and I’ll plan when to set it up.' }
    return { text: 'Here’s a gentle setup calendar: one tool at a time on a quiet afternoon, quick wins first. Want it on your plan?', proposal: { kind: 'schedule', timeOfDay: 'afternoon', sessions } }
  }

  if (/explain|how did you|numbers|where.*from|work(ed)? (it|this) out|why/.test(t)) {
    const d = buildDashboard(survey, selected)
    return { text: `In short: ${d.why.hours[1]} ${d.why.money[d.why.money.length - 1]} The Costs tab shows every step, and you can change the wage there.`, quickReplies: ['Show me the costs', 'Is this the cheapest way?'] }
  }

  return { text: 'I can make your plan cheaper, trim it to fewer tools, plan your setup dates, explain the numbers, or show you any part of your plan.', quickReplies: MENU }
}
