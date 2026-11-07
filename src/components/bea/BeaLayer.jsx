import React, { useMemo } from 'react'
import { useApp } from '../../state'
import { buildDashboard } from '../../data/mockDashboard'
import { fallbackPersonalisation } from '../../../shared/personalise.js'
import AskBea from './AskBea'

/** Bea, available from anywhere once there's a plan: "Talk to Bea" in the top bar opens her drawer, listening. */
export default function BeaLayer() {
  const { user, step, survey, selected, geminiPlan, bea, closeBea } = useApp()
  const ready = !!user && step === 3
  const setupCards = useMemo(() => {
    if (!ready) return []
    const fb = fallbackPersonalisation(survey, selected).setupCards
    return selected.map((id) => geminiPlan?.setupCards?.find((c) => c.toolId === id) || fb.find((c) => c.toolId === id)).filter(Boolean)
  }, [ready, survey, selected, geminiPlan])
  const bill = useMemo(() => (ready ? buildDashboard(survey, selected).toolCost : 0), [ready, survey, selected])
  if (!ready) return null
  return <AskBea key={user.id} open={bea.open} onClose={closeBea} listenSignal={bea.open && bea.listen ? bea.n : 0} setupCards={setupCards} bill={bill} />
}
