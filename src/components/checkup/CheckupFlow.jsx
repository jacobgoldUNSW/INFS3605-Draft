import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import Survey from '../dashboard/Survey'
import CheckupChat from '../bea/CheckupChat'
import Picker from '../dashboard/Picker'
import BrewLoader from '../dashboard/BrewLoader'
import Icon from '../ui/Icon'
import Botanical from '../ui/Botanical'

const ease = [0.22, 1, 0.36, 1]
const STEPS = ['About your café', 'Your tools', 'Your plan']

function Stepper({ step, setStep }) {
  return (
    <ol className="stepper" aria-label="Check-up progress">
      {STEPS.map((label, i) => {
        const cur = Math.min(step, 2) === i
        const done = i < Math.min(step, 2)
        const can = done && step < 2
        return (
          <React.Fragment key={label}>
            <li className={`stepper-item ${cur ? 'cur' : ''} ${done ? 'done' : ''} ${can ? 'can' : ''}`} aria-current={cur ? 'step' : undefined} onClick={() => can && setStep(i)}>
              <span className="stepper-num">{done ? <Icon name="check" size={14} stroke={2} /> : i + 1}</span>
              <span>{label}</span>
            </li>
            {i < STEPS.length - 1 && <li className="stepper-line" aria-hidden />}
          </React.Fragment>
        )
      })}
    </ol>
  )
}

/** The check-up: talk to Bea (or fill in the quick form), confirm your tools, then the plan comes together. */
export default function CheckupFlow() {
  const { step, setStep } = useApp()
  const [mode, setMode] = useState('chat')
  const view = step === 0
    ? (mode === 'chat' ? <CheckupChat onUseForm={() => setMode('form')} /> : <Survey onChat={() => setMode('chat')} />)
    : step === 1 ? <Picker /> : <BrewLoader />
  return (
    <section className="cu">
      <Botanical variant="fern" className="cu-fern" sway />
      <div className="wrap cu-in">
        <div className="cu-head">
          <span className="kicker">Your café check-up</span>
          <Stepper step={step} setStep={setStep} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step === 0 ? `0-${mode}` : step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease }}>
            {view}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
