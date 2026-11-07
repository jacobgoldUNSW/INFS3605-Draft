import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS } from '../../data/mockDashboard'
import { usePlan } from './PlanContext'
import Icon from '../ui/Icon'
import Botanical from '../ui/Botanical'

const ease = [0.22, 1, 0.36, 1]
export const PLAN_TAB_LIST = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'costs', label: 'Costs', icon: 'coins' },
  { id: 'setup', label: 'Setup', icon: 'calendar' },
  { id: 'checks', label: 'Reality checks', icon: 'shield' },
  { id: 'cafe', label: 'Your café', icon: 'store' },
]

// short, plain names for the time sinks
const PAIN_SHORT = { admin: 'Paperwork', waste: 'Waste', quiet: 'Quiet days', queues: 'Queues', staff: 'Rosters', reviews: 'Reviews & messages' }
const TEAM_TEXT = { '1-2': '1–2 people', '3-5': '3–5 people', '6-15': '6–15 people', '16+': '16 or more' }
const REV_TEXT = { under250: 'Under $250k', '250-500': '$250k–$500k', '500-1m': '$500k–$1M', '1m+': 'Over $1M', unsure: 'Not shared' }

export function profileFacts(survey) {
  const type = CAFE_TYPES.find((c) => c.id === survey.cafeType)
  const goal = PRIMARY_GOALS.find((g) => g.id === survey.goal)
  const tech = TECH_LEVELS.find((t) => t.id === survey.tech)
  return [
    { id: 'type', icon: 'store', label: 'Café', value: type?.label || '—' },
    { id: 'team', icon: 'people', label: 'Team', value: TEAM_TEXT[survey.employees] || '—' },
    { id: 'sales', icon: 'coins', label: 'Sales a year', value: REV_TEXT[survey.revenue] || '—' },
    { id: 'goal', icon: 'flag', label: 'Main goal', value: goal?.label || '—' },
    { id: 'pains', icon: 'clock', label: 'Time sinks', value: (survey.pains || []).map((p) => PAIN_SHORT[p]).filter(Boolean).join(', ') || '—' },
    { id: 'tech', icon: 'bolt', label: 'With tech', value: tech?.label || '—' },
  ]
}

function Choice({ label, options, value, onChange, multi, text }) {
  const on = (id) => (multi ? value.includes(id) : value === id)
  return (
    <fieldset className="ed-field">
      <legend className="label">{label}</legend>
      <div className="seg">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`seg-btn ${on(o.id) ? 'on' : ''}`}
            aria-pressed={on(o.id)}
            onClick={() => onChange(multi ? (value.includes(o.id) ? value.filter((x) => x !== o.id) : [...value, o.id]) : o.id)}
          >
            {text ? text(o) : o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function EditDetails({ onClose }) {
  const { survey, setSurvey } = useApp()
  const { stale, rebrew, rebrewing } = usePlan()
  const set = (k) => (v) => setSurvey((s) => ({ ...s, [k]: v }))
  return (
    <motion.div className="ed" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }}>
      <div className="ed-in">
        <label className="field ed-name">
          <span>Café name</span>
          <input className="input" value={survey.name} maxLength={40} onChange={(e) => set('name')(e.target.value)} />
        </label>
        <Choice label="Café" options={CAFE_TYPES} value={survey.cafeType} onChange={set('cafeType')} />
        <Choice label="Team" options={EMPLOYEE_OPTIONS} value={survey.employees} onChange={set('employees')} text={(o) => TEAM_TEXT[o.id]} />
        <Choice label="Sales a year" options={REVENUE_OPTIONS} value={survey.revenue} onChange={set('revenue')} text={(o) => REV_TEXT[o.id]} />
        <Choice label="Main goal" options={PRIMARY_GOALS} value={survey.goal} onChange={set('goal')} />
        <Choice label="Time sinks (pick any)" options={PAIN_POINTS} value={survey.pains} onChange={set('pains')} multi text={(o) => PAIN_SHORT[o.id]} />
        <Choice label="With tech" options={TECH_LEVELS} value={survey.tech} onChange={set('tech')} />
        <div className="ed-foot">
          <p className="fine">Your numbers update as you change things. {stale ? 'Update the written plan to match.' : 'Everything saves to your account.'}</p>
          <div className="row">
            {stale && (
              <button className="btn btn-outline btn-sm" onClick={rebrew} disabled={rebrewing}>
                <Icon name="refresh" size={16} /> {rebrewing ? 'Updating…' : 'Update my written plan'}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function PlanHeader({ tab }) {
  const { survey, syncState, navigate } = useApp()
  const { name } = usePlan()
  const [editing, setEditing] = useState(false)
  const facts = profileFacts(survey)
  return (
    <>
      <header className="ph">
        <Botanical variant="fern" className="ph-fern" sway />
        <div className="wrap ph-in">
          <div className="ph-top">
            <div>
              <span className="kicker">Your café plan</span>
              <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>{name}</motion.h1>
            </div>
            <div className="ph-actions">
              <span className={`ph-sync ${syncState}`} aria-live="polite">
                <Icon name={syncState === 'error' ? 'alert' : 'check'} size={15} />
                {syncState === 'saving' ? 'Saving…' : syncState === 'error' ? 'Couldn’t save, retrying' : 'Saved to your account'}
              </span>
              <button className={`btn btn-quiet ${editing ? 'on' : ''}`} onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
                <Icon name={editing ? 'close' : 'pencil'} size={16} /> {editing ? 'Close' : 'Edit details'}
              </button>
            </div>
          </div>
          <dl className="profile">
            {facts.map((f, i) => (
              <motion.div key={f.id} className="profile-cell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.1 + i * 0.05 }}>
                <dt><Icon name={f.icon} size={15} /> {f.label}</dt>
                <dd>{f.value}</dd>
              </motion.div>
            ))}
          </dl>
          <AnimatePresence initial={false}>{editing && <EditDetails onClose={() => setEditing(false)} />}</AnimatePresence>
        </div>
      </header>
      <nav className="plan-tabs" aria-label="Your plan">
        <div className="wrap">
          <div className="tabs" role="tablist">
            {PLAN_TAB_LIST.map((t) => (
              <a
                key={t.id}
                role="tab"
                href={hrefFor('plan', t.id)}
                aria-selected={tab === t.id}
                className="tab"
                onClick={(e) => { e.preventDefault(); navigate('plan', t.id) }}
              >
                <Icon name={t.icon} size={16} /> {t.label}
                {tab === t.id && <motion.span layoutId="plan-tab-ind" className="tab-ind" transition={{ duration: 0.35, ease }} />}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}
