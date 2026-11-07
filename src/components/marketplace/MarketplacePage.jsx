import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { PRODUCTS, USE_CASES, PRICES_CHECKED } from '../../data/products'
import IconTile, { Reveal } from '../ui/IconTile'
import Icon from '../ui/Icon'
import Botanical from '../ui/Botanical'

const ease = [0.22, 1, 0.36, 1]
const JOB_ICON = { ordering: 'receipt', marketing: 'megaphone', inventory: 'box', bookkeeping: 'book', scheduling: 'calendar', service: 'chat', content: 'palette' }
const SHORT = { ordering: 'Ordering', marketing: 'Marketing', inventory: 'Stock & waste', bookkeeping: 'Bookkeeping', scheduling: 'Rosters', service: 'Customers', content: 'Content' }
const SORTS = [
  { id: 'time', label: 'Most time saved' },
  { id: 'price', label: 'Lowest price' },
  { id: 'setup', label: 'Easiest to set up' },
  { id: 'az', label: 'A to Z' },
]

export function AddButton({ p, size = 'sm' }) {
  const { selected, toggle, showToast, guard } = useApp()
  const on = selected.includes(p.id)
  const click = (e) => {
    e.preventDefault()
    e.stopPropagation()
    guard('add', () => {
      toggle(p.id)
      showToast(on ? `${p.name} removed from your plan` : `${p.name} added to your plan`, on ? 'minus' : 'plus')
    })
  }
  return (
    <button type="button" className={`btn ${on ? 'btn-quiet in-plan' : 'btn-primary'} ${size === 'sm' ? 'btn-sm' : ''}`} onClick={click} aria-pressed={on}>
      <Icon name={on ? 'check' : 'plus'} size={15} /> {on ? 'In your plan' : 'Add to my plan'}
    </button>
  )
}

function ToolCard({ p, i }) {
  const { navigate, selected } = useApp()
  const on = selected.includes(p.id)
  const jobs = USE_CASES.filter((u) => p.useCases.includes(u.id)).slice(0, 2)
  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease, delay: Math.min(i, 8) * 0.03 }}>
      <a className={`tool card-link ${on ? 'on' : ''}`} href={hrefFor('pantry', p.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', p.id) }}>
        <div className="tool-top">
          <IconTile p={p} size={44} />
          {on && <span className="tag green"><Icon name="check" size={12} /> In your plan</span>}
        </div>
        <h3>{p.name}</h3>
        <p className="tool-tag">{p.tagline}</p>
        <ul className="tool-jobs">{jobs.map((j) => <li key={j.id}><Icon name={JOB_ICON[j.id]} size={14} /> {j.label}</li>)}</ul>
        <dl className="tool-facts">
          <div><dt>Price</dt><dd className="num">{p.priceLabel}</dd></div>
          <div><dt>Time back</dt><dd className="num">~{p.hrs} hrs/wk</dd></div>
        </dl>
        <div className="tool-foot">
          <span className="link small">Details <Icon name="arrowRight" size={14} className="go" /></span>
          <AddButton p={p} />
        </div>
      </a>
    </motion.li>
  )
}

export default function MarketplacePage() {
  const [job, setJob] = useState('all')
  const [sort, setSort] = useState('time')
  const [q, setQ] = useState('')
  const free = PRODUCTS.filter((p) => p.pricing?.free).length
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    const out = PRODUCTS.filter((p) => (job === 'all' || p.useCases.includes(job)) && (!t || `${p.name} ${p.tagline} ${p.description} ${p.vendor}`.toLowerCase().includes(t)))
    const by = {
      time: (a, b) => b.hrs - a.hrs || a.cost - b.cost,
      price: (a, b) => a.cost - b.cost || b.hrs - a.hrs,
      setup: (a, b) => b.metrics.setup - a.metrics.setup,
      az: (a, b) => a.name.localeCompare(b.name),
    }[sort]
    return [...out].sort(by)
  }, [job, sort, q])

  return (
    <div className="pantry">
      <header className="pan-head">
        <Botanical variant="sprig" className="pan-sprig" sway />
        <div className="wrap pan-head-in">
          <div>
            <span className="kicker">The AI Pantry</span>
            <h1>{PRODUCTS.length} tools Australian cafés actually use</h1>
            <p className="lede">Checked for price and fit. Open any tool for what it does in plain words, what it costs, how long setup takes, and its honest risks.</p>
          </div>
          <dl className="pan-facts">
            <div><dt className="label">Tools</dt><dd className="num">{PRODUCTS.length}</dd></div>
            <div><dt className="label">Free plans</dt><dd className="num">{free}</dd></div>
            <div><dt className="label">Prices checked</dt><dd className="num">{PRICES_CHECKED}</dd></div>
          </dl>
        </div>
      </header>

      <div className="pan-bar">
        <div className="wrap pan-bar-in">
          <div className="tabs pan-jobs" role="tablist" aria-label="Filter by job">
            {[{ id: 'all', label: 'All tools' }, ...USE_CASES].map((u) => (
              <button key={u.id} role="tab" aria-selected={job === u.id} className="tab" onClick={() => setJob(u.id)}>
                {u.id !== 'all' && <Icon name={JOB_ICON[u.id]} size={15} />} {u.id === 'all' ? u.label : SHORT[u.id]}
                {job === u.id && <motion.span layoutId="pan-ind" className="tab-ind" transition={{ duration: 0.3, ease }} />}
              </button>
            ))}
          </div>
          <div className="pan-tools">
            <label className="pan-search"><Icon name="search" size={17} /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools" aria-label="Search tools" /></label>
            <label className="pan-sort"><span className="label">Sort</span>
              <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tools">{SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </label>
          </div>
        </div>
      </div>

      <section className="wrap pan-body">
        <p className="fine pan-count" aria-live="polite">{list.length} tool{list.length === 1 ? '' : 's'}{job !== 'all' ? ` for ${USE_CASES.find((u) => u.id === job)?.label.toLowerCase()}` : ''}</p>
        <motion.ul layout className="pan-grid">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => <ToolCard key={p.id} p={p} i={i} />)}
          </AnimatePresence>
        </motion.ul>
        {!list.length && <div className="empty-note">No tools match that. Try another job or clear the search.</div>}
        <Reveal className="pan-help">
          <div>
            <span className="kicker">Not sure where to start?</span>
            <h3>Let Bea match tools to your café</h3>
            <p className="muted">A five-minute check-up picks the tools that fit, and shows what they’d save you.</p>
          </div>
          <PlanCta />
        </Reveal>
      </section>
    </div>
  )
}

function PlanCta() {
  const { navigate } = useApp()
  return <button className="btn btn-primary" onClick={() => navigate('plan')}>Start my check-up <Icon name="arrowRight" size={18} className="go" /></button>
}
