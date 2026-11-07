import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { PRODUCTS, getProduct, overlapsIn } from '../../data/products'
import { recommendProducts, buildDashboard, PAIN_POINTS, PRIMARY_GOALS, PAIN_TOOLS, rantMatches, rantClauseFor } from '../../data/mockDashboard'
import IconTile from '../ui/IconTile'
import Icon from '../ui/Icon'
import AnimatedNumber from '../ui/AnimatedNumber'

const ease = [0.22, 1, 0.36, 1]
const money = (n) => `$${Math.round(n).toLocaleString('en-AU')}`

function Row({ p, why, on, onToggle, i }) {
  return (
    <motion.li className={`pk-row ${on ? 'on' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease, delay: Math.min(i, 8) * 0.04 }}>
      <IconTile p={p} size={40} />
      <div className="pk-txt">
        <div className="pk-name">
          <b>{p.name}</b>
          <a className="link small" href={hrefFor('pantry', p.id)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Details <Icon name="external" size={12} className="out" /></a>
        </div>
        <span className="pk-why">{why}</span>
      </div>
      <span className="pk-meta"><span className="num">{p.priceLabel}</span><span className="fine">~{p.hrs} hrs/wk back</span></span>
      <button type="button" role="switch" aria-checked={on} aria-label={`${on ? 'Remove' : 'Add'} ${p.name}`} className="switch" onClick={() => onToggle(p)} />
    </motion.li>
  )
}

export default function Picker() {
  const { survey, selected, setSelected, toggle, setStep, showToast } = useApp()
  const [more, setMore] = useState(false)
  const recs = useMemo(() => recommendProducts(survey).slice(0, 5), [survey])
  const primed = useRef(false)

  // start from our top three, so there's a sensible plan to react to
  useEffect(() => {
    if (primed.current) return
    primed.current = true
    if (!selected.length && recs.length) setSelected(recs.slice(0, 3).map((p) => p.id))
  }, [recs, selected.length, setSelected])

  // one reason per tool, most specific first, never the same reason twice
  const reasons = useMemo(() => {
    const used = new Set()
    const out = {}
    const pains = (survey.pains || []).map((id) => PAIN_POINTS.find((x) => x.id === id)).filter(Boolean)
    const goal = PRIMARY_GOALS.find((g) => g.id === survey.goal)
    const rant = survey.rant ? rantMatches(survey.rant) : new Map()
    const helps = (pp) => pp && `Helps with “${pp.label.toLowerCase()}”`
    const levels = [
      (p) => { const c = rant.get(p.id) && rantClauseFor(survey.rant, p.id); return c && `You said: “${c.length > 46 ? c.slice(0, 44).trim() + '…' : c}”` },
      (p) => helps(pains.find((pp) => PAIN_TOOLS[pp.id]?.includes(p.id))),
      (p) => helps(pains.find((pp) => pp.use.includes(p.useCases[0]))),
      (p) => helps(pains.find((pp) => pp.use.some((u) => p.useCases.includes(u)))),
      (p) => goal && goal.use.some((u) => p.useCases.includes(u)) && `Good for your goal: ${goal.label.toLowerCase()}`,
    ]
    for (const level of levels) {
      for (const p of PRODUCTS) {
        if (out[p.id]) continue
        const r = level(p)
        if (r && !used.has(r)) { out[p.id] = r; used.add(r) }
      }
    }
    for (const p of PRODUCTS) if (!out[p.id]) out[p.id] = p.tagline
    return out
  }, [survey])

  const d = useMemo(() => buildDashboard(survey, selected), [survey, selected])
  const clashes = overlapsIn(selected)
  const recIds = recs.map((p) => p.id)
  const rest = PRODUCTS.filter((p) => !recIds.includes(p.id))
  const onToggle = (p) => {
    const adding = !selected.includes(p.id)
    toggle(p.id)
    showToast(adding ? `${p.name} added` : `${p.name} removed`, adding ? 'plus' : 'minus')
  }
  const go = () => {
    if (!selected.length) return showToast('Pick at least one tool first', 'info')
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="picker2">
      <div className="checkup-intro">
        <h1>The tools that fit {survey.name || 'your café'}</h1>
        <p className="lede">We’ve switched on our top picks from your answers. Add or remove any. You can change them any time from your plan’s toolkit.</p>
      </div>
      <div className="pk-grid">
        <div>
          <div className="pk-head"><span className="label">Recommended for you</span><span className="fine">Based on your answers</span></div>
          <ul className="pk-list">{recs.map((p, i) => <Row key={p.id} p={p} why={reasons[p.id]} on={selected.includes(p.id)} onToggle={onToggle} i={i} />)}</ul>
          <button type="button" className="kit-more pk-more" onClick={() => setMore((m) => !m)} aria-expanded={more}>
            <Icon name={more ? 'minus' : 'plus'} size={16} /> {more ? 'Hide the other tools' : `See the other ${rest.length} tools`}
          </button>
          <AnimatePresence initial={false}>
            {more && (
              <motion.ul className="pk-list pk-rest" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
                {rest.map((p, i) => <Row key={p.id} p={p} why={reasons[p.id]} on={selected.includes(p.id)} onToggle={onToggle} i={i} />)}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <aside className="pk-sum">
          <span className="label">So far</span>
          <ul className="pk-sel">
            <AnimatePresence initial={false}>
              {selected.map((id) => {
                const p = getProduct(id)
                return <motion.li key={id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><IconTile p={p} size={22} /> {p.name}</motion.li>
              })}
            </AnimatePresence>
            {!selected.length && <li className="fine">No tools yet</li>}
          </ul>
          <div className="ledger">
            <div className="ledger-row"><span>Costs about</span><span className="dots" /><span className="val"><AnimatedNumber value={d.toolCost} format={money} duration={0.5} /><small>/mo</small></span></div>
            <div className="ledger-row"><span>Time back</span><span className="dots" /><span className="val"><AnimatedNumber value={d.hoursSaved} duration={0.5} /><small> hrs/wk</small></span></div>
          </div>
          {clashes.map((c) => <p key={c.ids.join('+')} className="pk-warn"><Icon name="alert" size={15} /> {c.note}</p>)}
          {!clashes.length && selected.length > 3 && <p className="fine">Most cafés start with two or three tools, then add more once those feel easy.</p>}
          <button className="btn btn-primary btn-block" onClick={go} disabled={!selected.length}>Show me my plan <Icon name="arrowRight" size={17} className="go" /></button>
        </aside>
      </div>
    </div>
  )
}
