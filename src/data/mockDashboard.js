import { PRODUCTS, getProduct } from './products'

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

export const DEFAULT_SURVEY = {
  name: '',
  employees: null,
  revenue: null,
  cafeType: null,
  goal: null,
  pains: [],
  tech: null,
}

/** Score products against the owner's pain points (mock "AI" logic). */
export function recommendProducts(survey) {
  const goalUses = PRIMARY_GOALS.find((g) => g.id === survey.goal)?.use ?? []
  const wanted = new Set([
    ...goalUses,
    ...survey.pains.flatMap((id) => PAIN_POINTS.find((p) => p.id === id)?.use ?? []),
  ])
  const type = CAFE_TYPES.find((c) => c.id === survey.cafeType)?.label
  return PRODUCTS.map((p) => {
    let score = p.useCases.filter((u) => wanted.has(u)).length * 2
    if (type && p.bestFor.includes(type)) score += 1
    if (p.metrics.setup >= 80) score += 0.5
    return { p, score }
  })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p)
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Build the whole mock dashboard payload. */
export function buildDashboard(survey, selectedIds) {
  const picked = selectedIds.map(getProduct).filter(Boolean)
  const emp = EMPLOYEE_OPTIONS.find((e) => e.id === survey.employees)?.mid ?? 4
  const annual = REVENUE_OPTIONS.find((r) => r.id === survey.revenue)?.mid ?? 375000
  const monthlyRev = annual / 12
  const scale = monthlyRev / 31000

  // ---- Baseline ("before")
  const adminHours = Math.round(12 + emp * 0.9)
  const labourPct = 34
  const wastePct = 12
  const waitSec = 240
  const hourly = 32

  // ---- Impact ("after")
  const sum = (k) => picked.reduce((s, p) => s + (p[k] || 0), 0)
  const hoursSaved = Math.min(sum('hrs'), Math.round(adminHours * 0.7))
  const wasteCut = Math.min(sum('waste'), 8)
  const revBoost = Math.round((sum('rev') * scale) / 10) * 10
  const waitCut = Math.min(sum('wait'), 110)
  const toolCost = sum('cost')
  const labourSaving = Math.round(hoursSaved * hourly * 4.3)
  const wasteSaving = Math.round((monthlyRev * 0.3 * (wasteCut / 100)))
  const netGain = revBoost + labourSaving + wasteSaving - toolCost

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

  // ---- Monthly profit trend (12 months, ramping up as rollout completes)
  const season = [0.9, 0.92, 0.97, 1.0, 1.03, 1.0, 0.95, 0.97, 1.02, 1.05, 1.1, 1.18]
  const profitBefore = season.map((s) => Math.round(before.profit * s))
  const ramp = [0, 0.1, 0.3, 0.55, 0.8, 0.95, 1, 1, 1, 1, 1, 1]
  const profitAfter = season.map((s, i) => Math.round(before.profit * s + netGain * ramp[i]))

  // ---- Implementation timeline
  const phaseDefs = [
    { id: 'p0', title: 'Warm-up', weeks: 'Week 0', blurb: 'Brief your team, pick a champion & back up your data.', items: [] },
    { id: 'p1', title: 'Quick wins', weeks: 'Weeks 1–2', blurb: 'Free-or-cheap tools that pay off almost immediately.', items: picked.filter((p) => p.weeks <= 1) },
    { id: 'p2', title: 'Core systems', weeks: 'Weeks 3–5', blurb: 'Tools that connect to your bank, till and rosters.', items: picked.filter((p) => p.weeks === 2 || p.weeks === 3) },
    { id: 'p3', title: 'Big upgrades', weeks: 'Weeks 6–10', blurb: 'Hardware or deeper setups, rolled out once the basics are humming.', items: picked.filter((p) => p.weeks >= 4) },
  ]
  const timeline = phaseDefs.filter((p) => p.id === 'p0' || p.items.length)
  timeline.push({ id: 'p4', title: 'Review & tune', weeks: 'Ongoing', blurb: 'Monthly 20-min check-in: what’s working, what to drop.', items: [] })

  // ---- Recommendations per product
  const recs = picked
    .map((p) => {
      const impact = p.hrs * 2 + p.rev / 100 + p.waste * 3 + p.wait / 10
      const priority = impact >= 12 ? 'High' : impact >= 7 ? 'Medium' : 'Nice-to-have'
      const headline =
        p.hrs >= 3 ? `Saves ~${p.hrs} hrs a week`
          : p.rev >= 250 ? `Could add ~$${Math.round((p.rev * scale) / 10) * 10}/mo in sales`
            : p.waste ? `Cuts waste by ~${p.waste}%`
              : `Saves ~${Math.max(p.hrs, 1)} hrs a week`
      return { product: p, priority, impact, headline }
    })
    .sort((a, b) => b.impact - a.impact)

  // ---- Suggested extras the owner didn't pick
  const unpicked = recommendProducts(survey).filter((p) => !selectedIds.includes(p.id)).slice(0, 3)

  // ---- Risks
  const risks = []
  risks.push({ id: 'privacy', icon: '🔒', title: 'Customer data & privacy', level: 3, note: 'Tools store customer & sales info. Check privacy settings and let customers know.', fix: 'Review each tool’s privacy page; avoid pasting customer details into free chatbots.' })
  if (emp >= 4 || (survey.tech ?? 3) <= 2) risks.push({ id: 'training', icon: '🎓', title: 'Staff training & buy-in', level: (survey.tech ?? 3) <= 2 ? 4 : 3, note: 'New tools only help if the team actually uses them.', fix: 'Run two 15-minute huddles and nominate one “tech champion”.' })
  risks.push({ id: 'cost', icon: '💸', title: 'Stacking subscriptions', level: toolCost > 250 ? 4 : 2, note: `Tools total roughly $${toolCost}/mo — small bills add up.`, fix: 'Start with free tiers and review every 3 months.' })
  risks.push({ id: 'overreliance', icon: '🤖', title: 'Over-relying on AI answers', level: 3, note: 'AI can be confidently wrong, especially with numbers and allergens.', fix: 'Keep a human check on invoices, allergen info and public replies.' })
  if (picked.some((p) => p.risk === 'Medium' && p.weeks >= 3)) risks.push({ id: 'integration', icon: '🔌', title: 'Integration & downtime', level: 3, note: 'Till and hardware changes can disrupt trade during switch-over.', fix: 'Switch on a quiet Monday and keep a manual backup for a week.' })

  const benefitsTitle = `~${hoursSaved || 1} hrs/week back in your pocket`

  return {
    picked, recs, unpicked, timeline, risks,
    before, after, hoursSaved, wasteCut, revBoost, waitCut, toolCost, labourSaving, wasteSaving, netGain,
    allocBefore, allocAfter, weekBefore, weekAfter, profitBefore, profitAfter,
    days: DAYS, months: MONTHS, benefitsTitle,
    paybackMonths: netGain > 0 ? Math.max(1, Math.round((toolCost * 2) / Math.max(netGain, 1))) : null,
  }
}
