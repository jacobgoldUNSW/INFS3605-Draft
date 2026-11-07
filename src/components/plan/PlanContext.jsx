import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useApp, planKey } from '../../state'
import { buildDashboard, DEFAULT_HOURLY } from '../../data/mockDashboard'
import { api } from '../../api'
import { fallbackPersonalisation } from '../../../shared/personalise.js'
import { auDeep } from '../../../shared/auEnglish.js'

export const PHASES = [
  { id: 'Week 1 · Quick win', short: 'Week 1', title: 'A quick win' },
  { id: 'Weeks 2–3 · Core habit', short: 'Weeks 2–3', title: 'The core habit' },
  { id: 'Month 2 · Upgrade', short: 'Month 2', title: 'The upgrade' },
]

const Ctx = createContext(null)
export const usePlan = () => useContext(Ctx)
export const money = (n) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-AU')}`

/** Everything the plan's tabs and toolkit share: the live numbers, the written plan, and the settings. */
export function PlanProvider({ children }) {
  const { survey, selected, geminiPlan, setGeminiPlan, showToast, user } = useApp()
  const [hourly, setHourly] = useState(DEFAULT_HOURLY)
  const [ownTime, setOwnTime] = useState(false)
  const [rebrewing, setRebrewing] = useState(false)
  const d = useMemo(() => buildDashboard(survey, selected, { hourly, countOwnTime: ownTime }), [survey, selected, hourly, ownTime])
  const name = survey.name || user?.cafeName || 'your café'

  const key = planKey(survey, selected)
  const fresh = !!geminiPlan && geminiPlan.key === key && !geminiPlan.pending
  const stale = !!geminiPlan && geminiPlan.key !== key
  const plan = useMemo(() => {
    const fb = fallbackPersonalisation(survey, selected)
    if (!geminiPlan) return fb
    const cards = selected.map((id) => geminiPlan.setupCards?.find((c) => c.toolId === id) || fb.setupCards.find((c) => c.toolId === id)).filter(Boolean)
    const order = PHASES.map((p) => p.id)
    cards.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase))
    return auDeep({ ...fb, ...geminiPlan, toolReasons: { ...fb.toolReasons, ...(geminiPlan.toolReasons || {}) }, setupCards: cards })
  }, [geminiPlan, survey, selected])

  const rebrew = useCallback(async () => {
    if (!selected.length) return
    setRebrewing(true)
    try {
      const r = await api.personalise({ survey, selected })
      setGeminiPlan({ ...r.plan, key })
      showToast(r.source === 'gemini' ? 'Your plan is updated' : 'Your plan is updated with our standard advice', 'refresh')
    } catch {
      setGeminiPlan({ ...fallbackPersonalisation(survey, selected), key })
      showToast('Updated with our standard advice (offline)', 'refresh')
    } finally {
      setRebrewing(false)
    }
  }, [survey, selected, key, setGeminiPlan, showToast])

  // payback in weeks reads better than "1 month" for small bills
  const paybackWeeks = d.netGain > 0 ? Math.max(1, Math.ceil(((d.toolCost * 2) / d.netGain) * 4.33)) : null
  const paybackWhy = paybackWeeks
    ? [`Allow two months of subscriptions while you set up: ${money(d.toolCost * 2)}.`, `${money(d.toolCost * 2)} ÷ ${money(d.netGain)} a month ≈ ${(d.toolCost * 2 / d.netGain).toFixed(1)} months, or about ${paybackWeeks} week${paybackWeeks === 1 ? '' : 's'}, to pay for themselves.`]
    : d.why.payback
  const freePlans = d.picked.filter((p) => p.pricing?.free).length

  const value = { d, plan, name, hourly, setHourly, ownTime, setOwnTime, rebrew, rebrewing, stale, fresh, paybackWeeks, paybackWhy, freePlans }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Plain-English sense of scale for a number of hours. */
export function hoursFeel(h) {
  if (h <= 0) return 'Pick a tool to see your time back'
  if (h <= 2) return 'About an evening back each week'
  if (h <= 5) return 'About half a shift, every week'
  if (h <= 10) return 'About a full shift, every week'
  if (h <= 17) return 'About two full shifts, every week'
  return `About ${Math.round(h / 8)} full shifts, every week`
}

/** A dollar figure in flat whites a day, at $5 each. */
export const flatWhites = (monthly) => Math.max(1, Math.round(monthly / 30 / 5))
