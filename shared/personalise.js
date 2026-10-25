// Deterministic, plain-English personalisation used when Gemini is offline (and as the
// instant first paint before Gemini's version arrives). Same shape as the Gemini output.
import { getProduct } from '../src/data/products.js'
import { PRIMARY_GOALS, PAIN_POINTS, CAFE_TYPES, EMPLOYEE_OPTIONS, rantMatches, rantClauseFor } from '../src/data/mockDashboard.js'

const PHASE_ORDER = { 'Week 1 · Quick win': 0, 'Weeks 2–3 · Core habit': 1, 'Month 2 · Upgrade': 2 }

export function fallbackPersonalisation(survey = {}, selected = []) {
  const name = (survey.name || '').trim() || 'your café'
  const goal = PRIMARY_GOALS.find((g) => g.id === survey.goal)
  const pains = (survey.pains || []).map((id) => PAIN_POINTS.find((p) => p.id === id)).filter(Boolean)
  const type = CAFE_TYPES.find((c) => c.id === survey.cafeType)
  const team = EMPLOYEE_OPTIONS.find((e) => e.id === survey.employees)
  const tools = selected.map(getProduct).filter(Boolean)
  const rant = (survey.rant || '').trim()
  const rantHits = rantMatches(rant)

  const headlines = {
    hours: `${name} could win back its evenings`,
    revenue: `More full tables at ${name}, less guesswork`,
    waste: `Less in the bin at ${name}, more in the till`,
    speed: `Calmer mornings at ${name}`,
  }
  const headline = headlines[goal?.id] || `A calmer week at ${name}`
  const painText = pains[0]?.label?.toLowerCase() || 'the admin'
  const summary = tools.length
    ? `Your ${tools.length} new team-mate${tools.length === 1 ? '' : 's'} take ${painText} off your plate — and nothing important happens without your “yes”.`
    : 'Pick a couple of tools and we’ll show exactly what they’d take off your plate.'

  const toolReasons = {}
  for (const p of tools) {
    const pain = pains.find((pp) => pp.use.some((u) => p.useCases.includes(u)))
    const clause = rant && rantHits.get(p.id) && rantClauseFor(rant, p.id)
    if (clause) {
      const snippet = clause.length > 48 ? clause.slice(0, 46).trim() + '…' : clause
      toolReasons[p.id] = `You said “${snippet}” — ${p.worker.name} handles exactly that.`
    } else if (pain) {
      toolReasons[p.id] = `Takes “${pain.label.toLowerCase()}” off your plate.`
    } else {
      toolReasons[p.id] = p.tagline
    }
  }

  const solo = team?.id === '1-2'
  const shy = (survey.tech ?? 3) <= 2
  const setupCards = tools
    .map((p) => ({
      toolId: p.id,
      phase: p.setup.phase,
      steps: p.setup.steps,
      minutes: Math.round(p.setup.minutes * (shy ? 1.5 : 1) / 5) * 5,
      owner: solo ? 'You' : p.setup.owner,
      safetyCheck: p.setup.safety,
      whyNow: toolReasons[p.id],
    }))
    .sort((a, b) => (PHASE_ORDER[a.phase] ?? 9) - (PHASE_ORDER[b.phase] ?? 9))

  return {
    headline,
    summary,
    toolReasons,
    setupCards,
    peerTip: type?.id === 'bakery'
      ? 'Bakery owners say: start with waste — it pays for everything else.'
      : 'Owners like you say: start with one quick win this week, not everything at once.',
    source: 'fallback',
  }
}
