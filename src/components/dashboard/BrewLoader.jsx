import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp, planKey } from '../../state'
import { api } from '../../api'
import { buildDashboard } from '../../data/mockDashboard'
import { fallbackPersonalisation } from '../../../shared/personalise.js'
import Clock from '../ui/Clock'
import Icon from '../ui/Icon'

const STEPS = [
  'Matching tools to your time sinks',
  'Working out the hours and the dollars',
  'Checking every price and the reality checks',
  'Writing your step-by-step setup',
]
const MIN_MS = 4200
const MAX_MS = 11000

/** "Putting your plan together": a short, calm moment while the written plan is prepared in the background. */
export default function BrewLoader() {
  const { setStep, survey, selected, setGeminiPlan } = useApp()
  const [pct, setPct] = useState(0)
  const hours = buildDashboard(survey, selected).hoursSaved

  useEffect(() => {
    // personalise in the background, so the plan opens ready
    const ctrl = new AbortController()
    const key = planKey(survey, selected)
    let done = false
    api.personalise({ survey, selected }, ctrl.signal)
      .then((r) => { setGeminiPlan({ ...r.plan, key }); done = true })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setGeminiPlan({ ...fallbackPersonalisation(survey, selected), key })
        done = true
      })
    const start = performance.now()
    let raf
    const tick = (t) => {
      const el = t - start
      const p = done ? Math.min(el / MIN_MS, 1) : Math.min(el / MIN_MS, 0.9) + Math.min(0.08, Math.max(0, (el - MIN_MS) / (MAX_MS - MIN_MS)) * 0.08)
      setPct(Math.min(p, 1))
      if ((done && el >= MIN_MS) || el >= MAX_MS) {
        if (!done) setGeminiPlan({ ...fallbackPersonalisation(survey, selected), key, pending: true })
        setPct(1)
        setTimeout(() => setStep(3), 380)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStep])

  return (
    <motion.div className="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Clock hours={hours} size={132} tone="light" />
      <div className="loader-copy">
        <span className="kicker">One moment</span>
        <h1>Putting together a plan for {survey.name || 'your café'}</h1>
        <ol className="loader-steps">
          {STEPS.map((s, i) => {
            const doneStep = pct >= (i + 1) / STEPS.length - 0.001
            const active = !doneStep && pct >= i / STEPS.length
            return (
              <li key={s} className={doneStep ? 'done' : active ? 'active' : ''}>
                <span className="loader-mark">{doneStep ? <Icon name="check" size={14} stroke={2} /> : active ? <span className="live-dot" /> : null}</span>
                {s}
              </li>
            )
          })}
        </ol>
        <div className="loader-bar"><i style={{ width: `${pct * 100}%` }} /></div>
      </div>
    </motion.div>
  )
}
