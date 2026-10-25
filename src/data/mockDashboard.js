import { PRODUCTS, getProduct, RANT_KEYWORDS } from './products.js'

export const EMPLOYEE_OPTIONS = [
  { id: '1-2', label: '1–2', sub: 'Just me & a mate', icon: '🙋', mid: 1.5 },
  { id: '3-5', label: '3–5', sub: 'A cosy crew', icon: '👥', mid: 4 },
  { id: '6-15', label: '6–15', sub: 'A busy team', icon: '🧑‍🤝‍🧑', mid: 10 },
  { id: '16+', label: '16+', sub: 'Multi-site buzz', icon: '🏢', mid: 20 },
]

export const REVENUE_OPTIONS = [
  { id: 'under250', label: 'Under $250k', sub: 'Just getting going', icon: '🌱', mid: 150000 },
  { id: '250-500', label: '$250k – $500k', sub: 'Steady regulars', icon: '☕', mid: 375000 },
  { id: '500-1m', label: '$500k – $1M', sub: 'Growing nicely', icon: '📈', mid: 750000 },
  { id: '1m+', label: '$1M +', sub: 'Big & bustling', icon: '🚀', mid: 1400000 },
  // keeps sceptics in the flow: the numbers use a typical small café instead
  { id: 'unsure', label: 'Rather not say', sub: 'We’ll use a typical café', icon: '🤐', mid: 375000, typical: true },
]

export const CAFE_TYPES = [
  { id: 'specialty', label: 'Specialty café', sub: 'Single-origin & latte art', icon: '☕' },
  { id: 'bakery', label: 'Bakery-café', sub: 'Pastries & brunch', icon: '🥐' },
  { id: 'drive', label: 'Drive-thru / takeaway', sub: 'Fast & grab-n-go', icon: '🚗' },
  { id: 'franchise', label: 'Franchise-style', sub: 'Several sites', icon: '🏪' },
]

export const PAIN_POINTS = [
  { id: 'admin', label: 'Too much paperwork', icon: '📚', use: ['bookkeeping', 'scheduling'] },
  { id: 'waste', label: 'Wasted food & stock', icon: '🗑️', use: ['inventory'] },
  { id: 'quiet', label: 'Quiet days / few new faces', icon: '😴', use: ['marketing', 'content'] },
  { id: 'queues', label: 'Long queues at the rush', icon: '⏳', use: ['ordering'] },
  { id: 'staff', label: 'Rostering headaches', icon: '🗓️', use: ['scheduling'] },
  { id: 'reviews', label: 'Customer questions & reviews', icon: '⭐', use: ['service', 'marketing'] },
]

/** The tool each headache points to most directly (on top of the use-case match). */
export const PAIN_TOOLS = {
  admin: ['dext', 'xero'], waste: ['marketman'], quiet: ['mailchimp', 'canva'],
  queues: ['square'], staff: ['deputy'], reviews: ['podium'],
}

export const PRIMARY_GOALS = [
  { id: 'hours', label: 'Win back my evenings', sub: 'Less admin & paperwork', icon: '⏱️', use: ['bookkeeping', 'scheduling'] },
  { id: 'revenue', label: 'Grow daily sales & covers', sub: 'Fill quiet hours & boost spend', icon: '📈', use: ['marketing', 'content', 'ordering'] },
  { id: 'waste', label: 'Cut food & stock waste', sub: 'Protect your coffee & kitchen margin', icon: '🥐', use: ['inventory'] },
  { id: 'speed', label: 'Smoother morning rushes', sub: 'Speed up orders & queues', icon: '⚡', use: ['ordering', 'service'] },
]

export const TECH_LEVELS = [
  { id: 1, icon: '😅', label: 'Tech-shy' },
  { id: 2, icon: '🙂', label: 'Getting by' },
  { id: 3, icon: '😎', label: 'Comfortable' },
  { id: 4, icon: '🤓', label: 'Tech-savvy' },
]

/** Quick-tap headaches for the optional "in your own words" question. */
export const RANT_CHIPS = [
  'Doing supplier invoices at 9pm',
  'Staff calling in sick at 5:30am',
  'Throwing out unsold pastries when it rains',
  'Missing phone calls during the morning rush',
]

export const DEFAULT_SURVEY = {
  name: '',
  employees: null,
  revenue: null,
  cafeType: null,
  goal: null,
  pains: [],
  tech: null,
  rant: '',
}

/** Tools whose job matches the owner's own words. */
export function rantMatches(rant = '') {
  const hits = new Map()
  for (const k of RANT_KEYWORDS) {
    if (k.re.test(rant)) k.tools.forEach((t, i) => hits.set(t, (hits.get(t) || 0) + (i === 0 ? 2 : 1)))
  }
  return hits
}

/** The part of the owner's own words that a tool answers (e.g. "doing supplier invoices at 9pm"). */
export function rantClauseFor(rant = '', toolId) {
  const clauses = String(rant).split(/[,.;!?]|\band\b|\balso\b/i).map((c) => c.trim()).filter((c) => c.length > 3)
  const res = RANT_KEYWORDS.filter((k) => k.tools.includes(toolId)).map((k) => k.re)
  const hit = clauses.find((c) => res.some((re) => re.test(c)))
  return hit ? hit.charAt(0).toLowerCase() + hit.slice(1) : null
}

/** Score products against the owner's pain points (+ their own words). */
export function recommendProducts(survey) {
  const goalUses = PRIMARY_GOALS.find((g) => g.id === survey.goal)?.use ?? []
  const wanted = new Set([
    ...goalUses,
    ...(survey.pains || []).flatMap((id) => PAIN_POINTS.find((p) => p.id === id)?.use ?? []),
  ])
  const type = CAFE_TYPES.find((c) => c.id === survey.cafeType)?.label
  const rant = rantMatches(survey.rant)
  const direct = new Set((survey.pains || []).flatMap((id) => PAIN_TOOLS[id] || []))
  return PRODUCTS.map((p) => {
    // a tool's main job counts double its side jobs (ticking "waste" should find MarketMan, not a till)
    let score = p.useCases.reduce((sum, u, i) => sum + (wanted.has(u) ? (i === 0 ? 3 : 1.5) : 0), 0)
    if (direct.has(p.id)) score += 2
    if (type && p.bestFor.includes(type)) score += 1
    if (p.metrics.setup >= 80) score += 0.5
    score += (rant.get(p.id) || 0) * 1.5
    return { p, score }
  })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p)
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// how much of the café's admin the owner does personally, by team size (the rest is paid staff time)
const OWNER_SHARE = { '1-2': 0.85, '3-5': 0.7, '6-15': 0.5, '16+': 0.35 }
export const DEFAULT_HOURLY = 32 // a casual's hourly cost with on-costs, roughly (Hospitality Award)
const WEEKS = 4.33
const FOOD_COST = 0.3 // share of sales spent on stock
const MARGIN = 0.35 // what an extra dollar of sales leaves after stock and wages

/**
 * Build the whole dashboard payload (illustrative estimates).
 * Only paid staff hours count as cash; the owner's own hours are "time back" unless they ask to count
 * them. Extra sales count at margin, not in full. Gains are capped relative to the café's size and
 * shown as a range. `why` keeps every step of the sums for "How we worked this out".
 */
export function buildDashboard(survey, selectedIds, { hourly = DEFAULT_HOURLY, countOwnTime = false } = {}) {
  const picked = selectedIds.map(getProduct).filter(Boolean)
  const empOpt = EMPLOYEE_OPTIONS.find((e) => e.id === survey.employees)
  const emp = empOpt?.mid ?? 4
  const revOpt = REVENUE_OPTIONS.find((r) => r.id === survey.revenue)
  const annual = revOpt?.mid ?? 375000
  const monthlyRev = annual / 12
  const scale = monthlyRev / 31000
  const money = (n) => `$${Math.round(n).toLocaleString()}`

  // ---- Baseline ("before")
  const adminHours = Math.round(12 + emp * 0.9)
  const labourPct = 34
  const wastePct = 12
  const waitSec = 240

  // ---- Impact ("after")
  const sum = (k) => picked.reduce((s, p) => s + (p[k] || 0), 0)
  const hoursClaimed = sum('hrs')
  const hoursSaved = Math.min(hoursClaimed, Math.round(adminHours * 0.7))
  const ownerShare = OWNER_SHARE[survey.employees] ?? 0.7
  const ownerHours = Math.round(hoursSaved * ownerShare)
  const staffHours = hoursSaved - ownerHours
  const wasteCut = Math.min(sum('waste'), 5)
  const revBoost = Math.min(Math.round((sum('rev') * scale) / 10) * 10, Math.round((monthlyRev * 0.06) / 10) * 10)
  const waitCut = Math.min(sum('wait'), 110)
  const toolCost = sum('cost')
  const labourSaving = Math.round(staffHours * hourly * WEEKS)
  const ownTimeValue = Math.round(ownerHours * hourly * WEEKS)
  const wasteSaving = Math.round(monthlyRev * FOOD_COST * (wasteCut / 100))
  const salesGain = Math.round(revBoost * MARGIN)
  const rawGain = labourSaving + wasteSaving + salesGain + (countOwnTime ? ownTimeValue : 0) - toolCost
  const cap = Math.round(monthlyRev * (countOwnTime ? 0.2 : 0.12))
  const netGain = Math.min(rawGain, cap)
  const range = netGain > 0 ? [Math.round((netGain * 0.6) / 10) * 10, Math.round((netGain * 1.25) / 10) * 10] : [netGain, netGain]
  const firstCost = toolCost * 2
  const payback = netGain > 0 ? Math.max(1, Math.ceil(firstCost / netGain)) : null

  const why = {
    hours: [
      `Admin today: about ${adminHours} hrs a week (12 hrs, plus about an hour for each of your ~${Math.round(emp)} team members).`,
      `Your ${picked.length} tool${picked.length === 1 ? '' : 's'} claim up to ${hoursClaimed} hrs a week; we cap that at 70% of your admin, so ${hoursSaved} hrs.`,
      `With a ${empOpt?.label || '3–5'} team, about ${Math.round(ownerShare * 100)}% of that is your own time: ${ownerHours} hrs for you and ${staffHours} hrs of paid staff time.`,
    ],
    money: [
      `Paid staff time: ${staffHours} hrs × $${hourly}/hr × ${WEEKS} weeks = ${money(labourSaving)} a month.`,
      `Less waste: ${wasteCut}% of your ~${money(monthlyRev * FOOD_COST)} monthly stock spend = ${money(wasteSaving)}.`,
      `Extra sales: about ${money(revBoost)} a month, but only ~${Math.round(MARGIN * 100)}% of that is profit = ${money(salesGain)}.`,
      countOwnTime
        ? `Your own ${ownerHours} hrs, valued at $${hourly}/hr = ${money(ownTimeValue)} (you asked us to count it).`
        : `Your own ${ownerHours} hrs a week aren’t counted as cash (they’d be worth ${money(ownTimeValue)} at $${hourly}/hr).`,
      `Minus the tools: ${money(toolCost)} a month.`,
      rawGain > cap
        ? `That comes to ${money(rawGain)}, which we cap at ${countOwnTime ? 20 : 12}% of your sales: ${money(netGain)}. Real results vary, so we show ${money(range[0])}–${money(range[1])}.`
        : `About ${money(netGain)} a month. Real results vary, so we show ${money(range[0])}–${money(range[1])}.`,
    ],
    payback: payback
      ? [`Allow two months of subscriptions while you set up: ${money(firstCost)}.`, `${money(firstCost)} ÷ ${money(netGain)} a month ≈ ${payback} month${payback > 1 ? 's' : ''} to pay for themselves.`]
      : ['In cash terms these tools cost more than they save; the payoff is your time back.'],
    revenue: revOpt?.typical ? 'You’d rather not say your revenue, so we used a typical small café ($250k–$500k a year).' : null,
  }

  const before = {
    adminHours,
    labourPct,
    wastePct,
    waitSec,
    monthlyRev: Math.round(monthlyRev),
    profit: Math.round(monthlyRev * 0.08),
  }
  const after = {
    adminHours: adminHours - hoursSaved,
    labourPct: Math.max(24, +(labourPct - (labourSaving / monthlyRev) * 100).toFixed(0)),
    wastePct: wastePct - wasteCut,
    waitSec: waitSec - waitCut,
    monthlyRev: Math.round(monthlyRev + revBoost),
    profit: Math.round(monthlyRev * 0.08 + netGain),
  }

  // ---- Time allocation (hours / week of owner+team admin-type time)
  const allocBefore = [
    { label: 'Paperwork & finance', hours: Math.round(adminHours * 0.38), color: '#8B5E3C' },
    { label: 'Rostering & ordering', hours: Math.round(adminHours * 0.27), color: '#D9772B' },
    { label: 'Marketing & posts', hours: Math.round(adminHours * 0.2), color: '#F2B46D' },
    { label: 'Customer messages', hours: Math.round(adminHours * 0.15), color: '#7A9A6B' },
  ]
  const ratio = after.adminHours / before.adminHours
  const allocAfter = allocBefore.map((a) => ({ ...a, hours: Math.max(1, Math.round(a.hours * ratio)) }))

  // ---- Weekly admin hours by day
  const dayShape = [1.2, 1.0, 1.0, 1.1, 1.3, 0.7, 0.5]
  const dayTotal = dayShape.reduce((a, b) => a + b, 0)
  const weekBefore = dayShape.map((d) => +((d / dayTotal) * adminHours).toFixed(1))
  const weekAfter = dayShape.map((d) => +((d / dayTotal) * after.adminHours).toFixed(1))

  // ---- Monthly profit trend (the next 12 months from now, ramping up as rollout completes)
  const SEASON = [0.9, 0.92, 0.97, 1.0, 1.03, 1.0, 0.95, 0.97, 1.02, 1.05, 1.1, 1.18] // Jan..Dec
  const m0 = new Date().getMonth()
  const months = Array.from({ length: 12 }, (_, i) => MONTHS[(m0 + i) % 12])
  const season = Array.from({ length: 12 }, (_, i) => SEASON[(m0 + i) % 12])
  const profitBefore = season.map((s) => Math.round(before.profit * s))
  const ramp = [0, 0.1, 0.3, 0.55, 0.8, 0.95, 1, 1, 1, 1, 1, 1]
  const profitAfter = season.map((s, i) => Math.round(before.profit * s + netGain * ramp[i]))

  // ---- Recommendations per product
  const saidIt = rantMatches(survey.rant)
  const recs = picked
    .map((p) => {
      // a tool that answers the headache the owner described in their own words jumps the queue
      const impact = p.hrs * 2 + p.rev / 100 + p.waste * 3 + p.wait / 10 + (saidIt.get(p.id) ? 4 : 0)
      const priority = impact >= 12 ? 'High' : impact >= 7 ? 'Medium' : 'Nice-to-have'
      const headline =
        p.hrs >= 3 ? `Saves ~${p.hrs} hrs a week`
          : p.rev >= 250 ? `Could add ~$${Math.round((p.rev * scale) / 10) * 10}/mo in sales`
            : p.waste ? `Cuts waste by ~${p.waste}%`
              : p.wait ? `Shaves ~${p.wait}s off the queue`
                : `Saves ~${Math.max(p.hrs, 1)} hrs a week`
      return { product: p, priority, impact, headline }
    })
    .sort((a, b) => b.impact - a.impact)

  // ---- Suggested extras the owner didn't pick
  const unpicked = recommendProducts(survey).filter((p) => !selectedIds.includes(p.id)).slice(0, 3)

  // ---- Risks
  const risks = []
  risks.push({ id: 'privacy', icon: '🔒', title: 'Customer data & privacy', level: 3, note: 'Tools store customer & sales info. Check privacy settings and let customers know.', fix: 'Review each tool’s privacy page; never paste customer details into free chatbots.' })
  if (emp >= 4 || (survey.tech ?? 3) <= 2) risks.push({ id: 'training', icon: '🎓', title: 'Staff training & buy-in', level: (survey.tech ?? 3) <= 2 ? 4 : 3, note: 'New tools only help if the team actually uses them.', fix: 'Run two 15-minute huddles and nominate one “tech champion”.' })
  risks.push({ id: 'cost', icon: '💸', title: 'Stacking subscriptions', level: toolCost > 250 ? 4 : 2, note: `Your tools total roughly $${toolCost}/mo — small bills add up.`, fix: 'Start with free trials and review every 3 months.' })
  risks.push({ id: 'overreliance', icon: '🧑‍⚖️', title: 'Letting tools answer for you', level: 3, note: 'Software can be confidently wrong, especially with numbers and allergens.', fix: 'Keep a human “yes” on invoices, allergen replies and anything public.' })
  if (picked.some((p) => p.risk === 'Medium' && p.weeks >= 3)) risks.push({ id: 'integration', icon: '🔌', title: 'Switch-over hiccups', level: 3, note: 'Till and stock changes can disrupt trade during switch-over.', fix: 'Switch on a quiet Tuesday and keep a paper backup for a week.' })

  return {
    picked, recs, unpicked, risks,
    before, after, hoursSaved, wasteCut, revBoost, waitCut, toolCost, labourSaving, wasteSaving, netGain,
    allocBefore, allocAfter, weekBefore, weekAfter, profitBefore, profitAfter,
    days: DAYS, months,
    paybackMonths: payback,
    ownerHours, staffHours, ownTimeValue, salesGain, range, hourly, countOwnTime, why,
  }
}
