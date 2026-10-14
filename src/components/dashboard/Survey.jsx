import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import {
  EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS,
} from '../../data/mockDashboard'

const ease = [0.22, 1, 0.36, 1]

function Tiles({ options, value, onChange, multi = false, cols = 4 }) {
  const isOn = (id) => (multi ? value.includes(id) : value === id)
  const click = (id) => {
    if (!multi) return onChange(id)
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }
  return (
    <motion.div
      className="tiles"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
    >
      {options.map((o) => (
        <motion.button
          key={o.id}
          type="button"
          className={`tile ${isOn(o.id) ? 'on' : ''}`}
          variants={{ hidden: { opacity: 0, y: 20, scale: 0.92 }, show: { opacity: 1, y: 0, scale: 1 } }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => click(o.id)}
        >
          {isOn(o.id) && (
            <motion.span
              className="tile-check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              ✓
            </motion.span>
          )}
          <span className="tile-icon">{o.icon}</span>
          <span className="tile-label">{o.label}</span>
          {o.sub && <span className="tile-sub">{o.sub}</span>}
        </motion.button>
      ))}
    </motion.div>
  )
}

const QUESTIONS = [
  {
    id: 'name', emoji: '🏷️', title: 'What’s your café called?', hint: 'We’ll use it to personalise your plan.',
    valid: (s) => s.name.trim().length > 0,
  },
  { id: 'employees', emoji: '👥', title: 'How many people are on your team?', hint: 'Include yourself and part-timers.', valid: (s) => !!s.employees },
  { id: 'revenue', emoji: '💰', title: 'Roughly what’s your annual revenue?', hint: 'A ballpark is perfectly fine — nobody’s auditing you.', valid: (s) => !!s.revenue },
  { id: 'cafeType', emoji: '🥐', title: 'What kind of café do you run?', hint: 'Pick the closest match.', valid: (s) => !!s.cafeType },
  { id: 'goal', emoji: '🎯', title: 'What’s your #1 goal right now?', hint: 'Where would you love the biggest relief or boost?', valid: (s) => !!s.goal },
  { id: 'pains', emoji: '😮‍💨', title: 'What takes up the most of your time?', hint: 'Choose as many as you like.', valid: (s) => s.pains.length > 0 },
  { id: 'tech', emoji: '📱', title: 'How comfy are you with tech?', hint: 'No wrong answers — it helps us pace your rollout.', valid: (s) => !!s.tech },
]

export default function Survey() {
  const { survey, setSurvey, setStep } = useApp()
  const [q, setQ] = useState(0)
  const [dir, setDir] = useState(1)
  const cur = QUESTIONS[q]
  const ok = cur.valid(survey)
  const set = (k) => (v) => setSurvey((s) => ({ ...s, [k]: v }))

  const next = () => {
    if (!ok) return
    setDir(1)
    if (q === QUESTIONS.length - 1) setStep(1)
    else setQ(q + 1)
  }
  const back = () => {
    setDir(-1)
    setQ(Math.max(0, q - 1))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && ok && e.target.tagName !== 'BUTTON') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const slide = {
    enter: (d) => ({ x: d * 90, opacity: 0, scale: 0.97, filter: 'blur(6px)' }),
    center: { x: 0, opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: (d) => ({ x: d * -90, opacity: 0, scale: 0.97, filter: 'blur(6px)' }),
  }

  return (
    <div className="survey">
      <motion.div className="survey-intro" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
        <span className="script-note big">let’s get to know you</span>
        <h1>Brew your <span className="script">personal</span> AI plan</h1>
        <p>A few quick questions, then pick your tools — we’ll stir it all into a plan made for your café.</p>
      </motion.div>

      <motion.div
        className="survey-card"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease, delay: 0.15 }}
      >
        <div className="q-progress">
          {QUESTIONS.map((_, i) => (
            <div className="q-seg" key={i}>
              <motion.div className="q-fill" animate={{ scaleX: i <= q ? 1 : 0 }} transition={{ duration: 0.5, ease }} />
            </div>
          ))}
        </div>
        <div className="q-count">Question {q + 1} of {QUESTIONS.length}</div>

        <div className="q-stage">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={cur.id}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease }}
              className="q-body"
            >
              <motion.div className="q-emoji" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}>
                {cur.emoji}
              </motion.div>
              <h2>{cur.title}</h2>
              <p className="q-hint">{cur.hint}</p>

              {cur.id === 'name' && (
                <div className="float-input">
                  <input
                    autoFocus
                    value={survey.name}
                    onChange={(e) => set('name')(e.target.value)}
                    placeholder=" "
                    maxLength={40}
                    id="biz-name"
                  />
                  <label htmlFor="biz-name">Business name</label>
                  <motion.span className="input-underline" animate={{ scaleX: survey.name ? 1 : 0 }} transition={{ duration: 0.4, ease }} />
                </div>
              )}
              {cur.id === 'employees' && <Tiles options={EMPLOYEE_OPTIONS} value={survey.employees} onChange={set('employees')} />}
              {cur.id === 'revenue' && <Tiles options={REVENUE_OPTIONS} value={survey.revenue} onChange={set('revenue')} />}
              {cur.id === 'cafeType' && <Tiles options={CAFE_TYPES} value={survey.cafeType} onChange={set('cafeType')} />}
              {cur.id === 'goal' && <Tiles options={PRIMARY_GOALS} value={survey.goal} onChange={set('goal')} cols={2} />}
              {cur.id === 'pains' && <Tiles options={PAIN_POINTS} value={survey.pains} onChange={set('pains')} multi cols={3} />}
              {cur.id === 'tech' && <Tiles options={TECH_LEVELS} value={survey.tech} onChange={set('tech')} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="q-actions">
          <motion.button className="btn ghost" onClick={back} disabled={q === 0} animate={{ opacity: q === 0 ? 0 : 1 }} whileTap={{ scale: 0.95 }}>
            ← Back
          </motion.button>
          <motion.button
            className="btn primary"
            onClick={next}
            disabled={!ok}
            animate={{ opacity: ok ? 1 : 0.45, scale: ok ? 1 : 0.98 }}
            whileHover={ok ? { scale: 1.04 } : undefined}
            whileTap={ok ? { scale: 0.95 } : undefined}
          >
            {q === QUESTIONS.length - 1 ? 'Choose my tools' : 'Continue'}
            <motion.span animate={{ x: ok ? [0, 4, 0] : 0 }} transition={{ repeat: Infinity, duration: 1.4 }}>→</motion.span>
          </motion.button>
        </div>
        <div className="q-enter-hint">press <kbd>Enter ↵</kbd> to continue</div>
      </motion.div>
    </div>
  )
}
