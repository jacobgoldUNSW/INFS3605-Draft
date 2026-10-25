import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import Survey from './Survey'
import CheckupChat from '../bea/CheckupChat'
import Picker from './Picker'
import BrewLoader from './BrewLoader'
import DashboardResults from './DashboardResults'

const STEPS = [
  { label: 'About you', icon: '📝' },
  { label: 'Pick tools', icon: '🛍️' },
  { label: 'Brew plan', icon: '☕' },
  { label: 'Dashboard', icon: '📊' },
]

function ProgressSteps({ step, setStep }) {
  // once the plan is brewed, the four steps shrink to a slim breadcrumb so the café sits higher
  if (step === 3) {
    return (
      <nav className="steps-slim" aria-label="Plan progress">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.label}>
            <span className={`ss ${i < 3 ? 'done' : 'cur'}`}>{i < 3 ? '✓' : s.icon} {s.label}</span>
            {i < STEPS.length - 1 && <i aria-hidden>›</i>}
          </React.Fragment>
        ))}
      </nav>
    )
  }
  return (
    <div className="steps">
      {STEPS.map((s, i) => {
        const done = i < step
        const cur = i === step
        const clickable = done && step < 2
        return (
          <React.Fragment key={s.label}>
            <button
              className={`step ${done ? 'done' : ''} ${cur ? 'cur' : ''}`}
              onClick={() => clickable && setStep(i)}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              <motion.span
                className="step-dot"
                animate={{ scale: cur ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {done ? (
                  <motion.svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
                  </motion.svg>
                ) : (
                  s.icon
                )}
                {cur && <motion.span className="step-ring" layoutId="step-ring" transition={{ type: 'spring', stiffness: 300, damping: 28 }} />}
              </motion.span>
              <span className="step-label">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="step-line">
                <motion.div className="step-line-fill" animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { step, setStep } = useApp()
  // the check-up is a chat with Bea; the tap-through form is always one click away
  const [checkup, setCheckup] = useState('chat')
  const views = [
    checkup === 'chat' ? <CheckupChat onUseForm={() => setCheckup('form')} /> : <Survey onChat={() => setCheckup('chat')} />,
    <Picker />, <BrewLoader />, <DashboardResults />,
  ]

  return (
    <div className="dash-page">
      <ProgressSteps step={step} setStep={setStep} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step === 0 ? `0-${checkup}` : step}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {views[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
