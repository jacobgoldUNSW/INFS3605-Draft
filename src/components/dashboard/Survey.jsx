import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import {
  EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS, RANT_CHIPS,
} from '../../data/mockDashboard'
import Icon from '../ui/Icon'

const ease = [0.22, 1, 0.36, 1]

function Options({ options, value, onChange, multi = false, cols = 4, text }) {
  const isOn = (id) => (multi ? value.includes(id) : value === id)
  const click = (id) => {
    if (!multi) return onChange(id)
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }
  return (
    <motion.div className="qf-opts" style={{ '--cols': cols }} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } }}>
      {options.map((o) => (
        <motion.button
          key={o.id}
          type="button"
          className={`qf-opt ${isOn(o.id) ? 'on' : ''}`}
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.3, ease }}
          onClick={() => click(o.id)}
          aria-pressed={isOn(o.id)}
        >
          <span className="qf-opt-mark" aria-hidden>{isOn(o.id) && <Icon name="check" size={14} stroke={2} />}</span>
          <span className="qf-opt-label">{text ? text(o) : o.label}</span>
          {o.sub && <span className="qf-opt-sub">{o.sub}</span>}
        </motion.button>
      ))}
    </motion.div>
  )
}

const QUESTIONS = [
  { id: 'name', icon: 'store', title: 'What’s your café called?', hint: 'We’ll use it on your plan.', valid: (s) => s.name.trim().length > 0 },
  { id: 'employees', icon: 'people', title: 'How many people are on your team?', hint: 'Include yourself and part-timers.', valid: (s) => !!s.employees },
  { id: 'revenue', icon: 'coins', title: 'Roughly what are your sales in a year?', hint: 'A ballpark is fine. It only sizes the estimates.', valid: (s) => !!s.revenue },
  { id: 'cafeType', icon: 'cup', title: 'What kind of café do you run?', hint: 'Pick the closest match.', valid: (s) => !!s.cafeType },
  { id: 'goal', icon: 'flag', title: 'What matters most right now?', hint: 'Where would you most like some relief?', valid: (s) => !!s.goal },
  { id: 'pains', icon: 'clock', title: 'What takes up most of your time?', hint: 'Choose as many as you like.', valid: (s) => s.pains.length > 0 },
  { id: 'tech', icon: 'bolt', title: 'How are you with new tech?', hint: 'No wrong answers. It sets the pace of your setup.', valid: (s) => !!s.tech },
  { id: 'rant', icon: 'quote', title: 'In your own words, what’s the biggest headache in your week?', hint: 'Optional. Type a sentence, or tap one of these.', valid: () => true },
]

function RantInput({ value, onChange }) {
  const add = (chip) => {
    if (value.toLowerCase().includes(chip.toLowerCase())) return
    onChange(value.trim() ? `${value.trim().replace(/[.,;]$/, '')}, and ${chip.charAt(0).toLowerCase()}${chip.slice(1)}` : chip)
  }
  return (
    <div className="qf-rant">
      <div className="qf-chips">
        {RANT_CHIPS.map((c) => {
          const on = value.toLowerCase().includes(c.toLowerCase())
          return (
            <button key={c} type="button" className={`seg-btn ${on ? 'on' : ''}`} onClick={() => add(c)} aria-pressed={on}>
              <Icon name={on ? 'check' : 'plus'} size={13} /> {c}
            </button>
          )
        })}
      </div>
      <label className="field" htmlFor="rant">
        <span>Your biggest headache, in a sentence</span>
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} maxLength={300} id="rant" autoFocus />
      </label>
    </div>
  )
}

const TEAM_TEXT = (o) => `${o.label} people`

export default function Survey({ onChat }) {
  const { survey, setSurvey, setStep } = useApp()
  // the café name was typed at sign-up a moment ago, so start at the next question (Back still reaches it)
  const [q, setQ] = useState(() => (survey.name?.trim() ? 1 : 0))
  const [dir, setDir] = useState(1)
  const cur = QUESTIONS[q]
  const ok = cur.valid(survey)
  const set = (k) => (v) => setSurvey((s) => ({ ...s, [k]: v }))
  // single-choice questions move on by themselves a beat after a tap
  const auto = useRef(null)
  useEffect(() => () => clearTimeout(auto.current), [])
  const pickAndGo = (k) => (v) => {
    set(k)(v)
    clearTimeout(auto.current)
    const from = q
    auto.current = setTimeout(() => {
      setDir(1)
      setQ((c) => (c === from ? Math.min(c + 1, QUESTIONS.length - 1) : c))
    }, 360)
  }
  const next = () => {
    if (!ok) return
    setDir(1)
    if (q === QUESTIONS.length - 1) setStep(1)
    else setQ(q + 1)
  }
  const back = () => { setDir(-1); setQ(Math.max(0, q - 1)) }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter' && ok && e.target.tagName !== 'BUTTON') next() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="form-flow">
      <div className="checkup-intro">
        <h1>The quick form</h1>
        <p className="lede">Eight short questions about your café, then we’ll suggest the tools that fit. {onChat && <>Rather talk? <button type="button" className="link" onClick={onChat}>Talk it through with Bea</button></>}</p>
      </div>
      <div className="qf">
        <div className="qf-top">
          <span className="label">Question {q + 1} of {QUESTIONS.length}</span>
          <div className="qf-bar"><motion.i animate={{ width: `${((q + 1) / QUESTIONS.length) * 100}%` }} transition={{ duration: 0.45, ease }} /></div>
        </div>
        <div className="qf-stage">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={cur.id}
              custom={dir}
              className="qf-body"
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 }}
              transition={{ duration: 0.32, ease }}
            >
              <div className="qf-q"><Icon name={cur.icon} size={22} className="qf-ico" /><div><h2>{cur.title}</h2><p className="muted">{cur.hint}</p></div></div>
              {cur.id === 'name' && (
                <label className="field qf-name" htmlFor="biz-name">
                  <span>Business name</span>
                  <input className="input" autoFocus value={survey.name} onChange={(e) => set('name')(e.target.value)} maxLength={40} id="biz-name" />
                </label>
              )}
              {cur.id === 'employees' && <Options options={EMPLOYEE_OPTIONS} value={survey.employees} onChange={pickAndGo('employees')} text={TEAM_TEXT} />}
              {cur.id === 'revenue' && <Options options={REVENUE_OPTIONS} value={survey.revenue} onChange={pickAndGo('revenue')} cols={5} />}
              {cur.id === 'cafeType' && <Options options={CAFE_TYPES} value={survey.cafeType} onChange={pickAndGo('cafeType')} />}
              {cur.id === 'goal' && <Options options={PRIMARY_GOALS} value={survey.goal} onChange={pickAndGo('goal')} cols={2} />}
              {cur.id === 'pains' && <Options options={PAIN_POINTS} value={survey.pains} onChange={set('pains')} multi cols={3} />}
              {cur.id === 'tech' && <Options options={TECH_LEVELS} value={survey.tech} onChange={pickAndGo('tech')} />}
              {cur.id === 'rant' && <RantInput value={survey.rant || ''} onChange={set('rant')} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="qf-actions">
          <button className="btn btn-quiet" onClick={back} disabled={q === 0} style={{ visibility: q === 0 ? 'hidden' : 'visible' }}><Icon name="arrowLeft" size={16} /> Back</button>
          <span className="fine">{['pains', 'rant', 'name'].includes(cur.id) ? 'Press Enter to continue' : 'Tap an answer and we’ll move on'}</span>
          <button className="btn btn-primary" onClick={next} disabled={!ok}>
            {q === QUESTIONS.length - 1 ? (survey.rant?.trim() ? 'Choose my tools' : 'Skip and continue') : 'Continue'} <Icon name="arrowRight" size={17} className="go" />
          </button>
        </div>
      </div>
    </div>
  )
}
