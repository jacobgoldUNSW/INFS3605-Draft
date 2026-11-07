import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { planRisks } from '../../data/risks'
import { Reveal } from '../ui/IconTile'
import Icon from '../ui/Icon'

const ease = [0.22, 1, 0.36, 1]
const THEME_ICON = { data: 'lock', accuracy: 'alert', control: 'sliders', legal: 'scale', customers: 'heart', people: 'people', lockin: 'link', cost: 'coins', outage: 'wave', skills: 'book' }
const LEVEL = ['', 'Low', 'Low', 'Moderate', 'Elevated', 'High']

function Risk({ r, index }) {
  const { navigate } = useApp()
  const [open, setOpen] = useState(index === 0)
  const tools = [...new Map(r.inPlan.map((t) => [t.id, t])).values()]
  return (
    <Reveal as="li" className={`risk2 ${open ? 'open' : ''}`} delay={Math.min(index, 6) * 0.04}>
      <button type="button" className="risk2-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="risk2-ico"><Icon name={THEME_ICON[r.id] || 'info'} size={22} /></span>
        <span className="risk2-title">
          <h4>{r.title}</h4>
          <span className="risk2-meta">
            <span className={`meter l${r.level}`} aria-label={`${LEVEL[r.level]} risk`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= r.level ? 'on' : ''} />)}</span>
            <span className="fine">{LEVEL[r.level]}</span>
            <span className="fine">·</span>
            <span className="fine">{tools.length ? `Touches ${tools.map((t) => t.name).join(', ')}` : r.general ? 'Not tied to your tools, worth knowing' : 'Comes with tools like these'}</span>
          </span>
        </span>
        <motion.span className="risk2-chev" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}><Icon name="chevronDown" size={20} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="risk2-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
            <div className="risk2-in">
              <p>{r.note}</p>
              {r.inPlan.length > 0 && (
                <div className="risk2-tools">
                  <span className="label">In your plan</span>
                  <ul>
                    {r.inPlan.map((t) => (
                      <li key={t.id + t.title}>
                        <a href={hrefFor('pantry', t.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', t.id) }}>{t.name}</a>: {t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="risk2-fix"><Icon name="check" size={18} /><p><b>What you can do.</b> {r.fix}</p></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
}

export default function ChecksTab() {
  const { survey, selected } = useApp()
  const risks = planRisks(survey, selected)
  const serious = risks.filter((r) => r.level >= 4).length
  return (
    <div className="checks">
      <section className="ck-top">
        <div>
          <span className="kicker">Reality checks</span>
          <h2>Before you sign up for anything</h2>
          <p className="lede">These tools can genuinely help, and they come with real trade-offs. Here are the big ones, most serious first, starting with those that touch your tools.</p>
        </div>
        <div className="ck-sum">
          <span className="num">{risks.length}</span><span className="fine">things to weigh up</span>
          <span className="num warn">{serious}</span><span className="fine">rated elevated or high</span>
        </div>
      </section>
      <ul className="risk2-list">{risks.map((r, i) => <Risk key={r.id} r={r} index={i} />)}</ul>
      <p className="fine ov-note">Written by us, not by an AI. This isn’t legal or financial advice: check the details with each vendor and your accountant.</p>
    </div>
  )
}
