import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { PRODUCTS, USE_CASES } from '../../data/products'
import { recommendProducts } from '../../data/mockDashboard'
import { usePlan, money } from './PlanContext'
import IconTile from '../ui/IconTile'
import Icon from '../ui/Icon'
import AnimatedNumber from '../ui/AnimatedNumber'

const ease = [0.22, 1, 0.36, 1]
const jobOf = (p) => USE_CASES.find((u) => u.id === p.useCases[0])?.label || ''

function ToolRow({ p, on, onToggle, suggested }) {
  const { navigate } = useApp()
  return (
    <motion.li layout="position" className={`kit-row ${on ? 'on' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <IconTile p={p} size={30} />
      <div className="kit-txt">
        <a className="kit-name" href={hrefFor('pantry', p.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', p.id) }}>{p.name}</a>
        <span className="kit-sub">{jobOf(p)}{suggested ? ' · suggested' : ''}</span>
      </div>
      <span className="kit-price num" title={p.priceLabel}>{p.cost ? money(p.cost) : 'Free'}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={`${on ? 'Remove' : 'Add'} ${p.name}`} className="switch" onClick={() => onToggle(p)} />
    </motion.li>
  )
}

function Kit({ compact = false }) {
  const { selected, toggle, survey, showToast } = useApp()
  const { d, stale, rebrew, rebrewing } = usePlan()
  const [more, setMore] = useState(false)
  const recs = useMemo(() => recommendProducts(survey).map((p) => p.id), [survey])
  const rest = useMemo(() => PRODUCTS.filter((p) => !selected.includes(p.id)).sort((a, b) => {
    const ra = recs.indexOf(a.id)
    const rb = recs.indexOf(b.id)
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb)
  }), [selected, recs])
  const onToggle = (p) => {
    const adding = !selected.includes(p.id)
    toggle(p.id)
    showToast(adding ? `${p.name} added to your plan` : `${p.name} removed from your plan`, adding ? 'plus' : 'minus')
  }

  return (
    <div className={`kit ${compact ? 'compact' : ''}`}>
      <div className="kit-head">
        <span className="label">Your toolkit</span>
        <span className="kit-count">{d.picked.length} tool{d.picked.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="kit-list">
        <AnimatePresence initial={false}>
          {d.picked.map((p) => <ToolRow key={p.id} p={p} on onToggle={onToggle} />)}
        </AnimatePresence>
        {!d.picked.length && <li className="kit-empty">No tools yet. Add one below to see what it saves you.</li>}
      </ul>
      <div className="kit-totals">
        <div className="ledger-row"><span>Monthly cost</span><span className="dots" /><span className="val"><AnimatedNumber value={d.toolCost} format={(n) => money(n)} duration={0.6} /></span></div>
        <div className="ledger-row"><span>Time back</span><span className="dots" /><span className="val"><AnimatedNumber value={d.hoursSaved} format={(n) => `${Math.round(n)} hrs`} duration={0.6} /><small> /wk</small></span></div>
      </div>
      {stale && (
        <div className="kit-stale">
          <p>Your tools changed since the written plan was made.</p>
          <button className="btn btn-primary btn-sm btn-block" onClick={rebrew} disabled={rebrewing}><Icon name="refresh" size={16} /> {rebrewing ? 'Updating…' : 'Update my plan'}</button>
        </div>
      )}
      <button type="button" className="kit-more" onClick={() => setMore((m) => !m)} aria-expanded={more}>
        <Icon name={more ? 'minus' : 'plus'} size={16} /> {more ? 'Hide other tools' : `Add a tool (${rest.length} more)`}
      </button>
      <AnimatePresence initial={false}>
        {more && (
          <motion.ul className="kit-list kit-rest" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
            {rest.map((p) => <ToolRow key={p.id} p={p} on={false} onToggle={onToggle} suggested={recs.includes(p.id)} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The toolkit: a sticky sidebar on wide screens, a bottom bar and sheet on phones. */
export default function ToolkitSidebar() {
  const { d } = usePlan()
  const [sheet, setSheet] = useState(false)
  return (
    <>
      <aside className="plan-side" aria-label="Your toolkit"><Kit /></aside>
      <div className="kit-bar">
        <button type="button" className="kit-bar-btn" onClick={() => setSheet(true)} aria-expanded={sheet}>
          <span className="label">Your toolkit</span>
          <span className="kit-bar-sum"><b className="num">{d.picked.length}</b> tools · <b className="num">{money(d.toolCost)}</b>/mo · <b className="num">{d.hoursSaved}</b> hrs back</span>
          <Icon name="chevronUp" size={18} />
        </button>
      </div>
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div className="sheet-back" onClick={() => setSheet(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="sheet kit-sheet" role="dialog" aria-label="Your toolkit" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.38, ease }}>
              <div className="sheet-grab"><button type="button" className="btn btn-quiet btn-sm" onClick={() => setSheet(false)}><Icon name="chevronDown" size={16} /> Close</button></div>
              <Kit compact />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
