import React from 'react'
import { motion } from 'framer-motion'
import { getProduct } from '../../data/products'
import { mins } from '../../data/week'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import Rail from '../ui/Rail'
import Icon from '../ui/Icon'
import IconTile from '../ui/IconTile'

const ease = [0.22, 1, 0.36, 1]

function Bars({ before, after }) {
  const max = Math.max(before, 1)
  return (
    <div className="wk-bars" aria-hidden>
      <motion.i className="b" initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }} transition={{ duration: 0.8, ease }} />
      <motion.i className="a" initial={{ width: 0 }} whileInView={{ width: `${(after / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease, delay: 0.25 }} />
    </div>
  )
}

function Moment({ m, planMode, onAdd }) {
  const { navigate } = useApp()
  const toolId = planMode ? (m.mineFirst || m.suggest) : m.tools?.[0]
  const tool = toolId ? getProduct(toolId) : null
  const others = (m.tools || []).filter((t) => t !== toolId).map(getProduct).filter(Boolean)
  const uncovered = planMode && !m.cafinity && !m.covered
  return (
    <article className={`wk-card ${m.cafinity ? 'cafinity' : ''} ${uncovered ? 'uncovered' : ''}`}>
      <header className="wk-when">
        <span className="wk-day">{m.day}</span>
        <span className="wk-time num">{m.time}</span>
        <Icon name={m.icon} size={20} className="wk-ico" />
      </header>
      <h4 className="wk-moment">{m.moment}</h4>
      {m.cafinity ? (
        <div className="wk-caf">
          <span className="tag solid"><Icon name="leaf" size={12} /> With Cafinity</span>
          <p>{m.text}</p>
        </div>
      ) : (
        <>
          <div className="wk-ba">
            <div className="wk-side">
              <span className="label">Without help</span>
              <span className="wk-mins num">{mins(m.before.mins)}</span>
              <p>{m.before.text}</p>
            </div>
            <div className="wk-side after">
              <span className="label">{uncovered ? 'With' : planMode ? 'With your' : 'With'} {tool?.name}</span>
              <span className="wk-mins num">{mins(m.after.mins)}</span>
              <p>{m.after.text}</p>
            </div>
          </div>
          <Bars before={m.before.mins} after={m.after.mins} />
          <footer className="wk-foot">
            {uncovered ? (
              <>
                <span>Not on your plan yet.</span>
                <button type="button" className="link" onClick={() => onAdd?.(toolId)}><Icon name="plus" size={14} /> Add {tool?.name}</button>
              </>
            ) : (
              <>
                {tool && (
                  <a className="wk-tool" href={hrefFor('pantry', tool.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', tool.id) }}>
                    <IconTile p={tool} size={22} /> {tool.name}
                  </a>
                )}
                {!planMode && others.length > 0 && <span className="wk-or">or {others.map((o) => o.name).join(', ')}</span>}
              </>
            )}
          </footer>
        </>
      )}
    </article>
  )
}

/** A week in a café, scrolled sideways: the time sinks, when they land, and what changes. */
export default function WeekRail({ moments, planMode = false, onAdd, bleed = !planMode }) {
  return (
    <Rail label="A week in a café, before and after" width="minmax(290px, 330px)" gap={18} bleed={bleed}>
      {moments.map((m) => <Moment key={m.id} m={m} planMode={planMode} onAdd={onAdd} />)}
    </Rail>
  )
}
