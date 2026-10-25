import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENT_META } from '../../../shared/agentScenarios.js'
import { getProduct } from '../../data/products'
import { BrandLogo } from '../ui/IconTile'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'needs', label: '🙋 Needs you' },
  { id: 'money', label: '💰 Money' },
  { id: 'customers', label: '☕ Customers' },
  { id: 'staff', label: '🧑‍🍳 Team' },
]
const STATUS = {
  noticed: 'Just noticed', thinking: 'Thinking…', queued: 'Queued', working: 'On it', 'needs-you': 'Needs your OK', done: 'Done', solo: 'You handled it alone', stopped: 'Stopped',
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

function Who({ ids }) {
  const list = (ids || []).filter((id) => AGENT_META[id])
  if (!list.length) return null
  return (
    <span className="lg-who">
      {list.map((id) => (
        <span key={id} className="lg-face" style={{ '--a': getProduct(id)?.from, '--b': getProduct(id)?.to }} title={`${AGENT_META[id].name} · ${AGENT_META[id].tool}`}>
          <BrandLogo id={id} size={11} />
        </span>
      ))}
    </span>
  )
}

function Timeline({ world, version }) {
  const [filter, setFilter] = useState('all')
  const [smallTalk, setSmallTalk] = useState(false)
  const rows = useMemo(() => {
    const byId = new Map(world.journal.map((e) => [e.id, e]))
    const out = []
    for (const inc of world.incidents.values()) {
      const steps = inc.steps.map((id) => byId.get(id)).filter(Boolean)
      if (!steps.length) continue
      out.push({ kind: 'incident', t: inc.startedAt, inc, steps })
    }
    for (const e of world.journal) {
      if (e.incident) continue
      if (e.kind === 'chatter' && !smallTalk) continue
      out.push({ kind: 'entry', t: e.t, e })
    }
    const match = (tags) => filter === 'all' || (tags || []).includes(filter)
    return out
      .filter((r) => (r.kind === 'entry' ? match(r.e.tags) : r.steps.some((s) => match(s.tags))))
      .sort((a, b) => b.t - a.t)
      .slice(0, 70)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version, filter, smallTalk])

  return (
    <div className="lg-timeline">
      <div className="lg-filters" role="tablist" aria-label="Filter the café log">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} className={`lg-chip ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
        <label className="lg-toggle"><input type="checkbox" checked={smallTalk} onChange={(e) => setSmallTalk(e.target.checked)} /> small talk</label>
      </div>
      {rows.length === 0 && (
        <p className="lg-empty">Nothing here yet. Throw a curveball from the rail — or just watch for a minute.</p>
      )}
      <ol className="lg-list">
        <AnimatePresence initial={false}>
          {rows.map((r) => (r.kind === 'incident' ? (
            <motion.li key={r.inc.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`lg-inc st-${r.inc.status}`}>
              <div className="lg-inc-head">
                <span className="lg-ico">{r.inc.icon}</span>
                <b>{r.inc.title}</b>
                <span className="lg-time">{r.inc.clock}</span>
                <span className={`lg-status st-${r.inc.status}`}>{STATUS[r.inc.status] || r.inc.status}</span>
              </div>
              <ul className="lg-steps">
                {r.steps.map((s) => (
                  <li key={s.id} className={`lg-step k-${s.kind}`}>
                    <span className="lg-sico">{s.icon}</span>
                    <span className="lg-stext">{s.text}</span>
                    <Who ids={s.actors} />
                  </li>
                ))}
              </ul>
            </motion.li>
          ) : (
            <motion.li key={r.e.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`lg-entry k-${r.e.kind}`}>
              <span className="lg-sico">{r.e.icon}</span>
              <span className="lg-stext">{r.e.text}</span>
              <span className="lg-time">{r.e.clock}</span>
            </motion.li>
          )))}
        </AnimatePresence>
      </ol>
    </div>
  )
}

function Totals({ snap }) {
  const b = snap.stats?.before || {}
  const a = snap.stats?.after || {}
  const wait = (s) => (s.waitN ? mmss(s.waitSum / s.waitN) : '—')
  const rows = [
    { k: 'Coffees served', b: b.served, a: a.served, good: 'up' },
    { k: 'Walked out of the queue', b: b.walkouts, a: a.walkouts, good: 'down' },
    { k: 'Average wait to order', b: wait(b), a: wait(a), raw: [b.waitN ? b.waitSum / b.waitN : null, a.waitN ? a.waitSum / a.waitN : null], good: 'down' },
    { k: 'Calls answered / missed', b: `${b.calls || 0} / ${b.missed || 0}`, a: `${a.calls || 0} / ${a.missed || 0}` },
    { k: 'Extra customers brought in', b: b.customers || 0, a: a.customers || 0, good: 'up' },
    { k: 'Extra takings & savings', b: `$${(b.dollars || 0) + (b.waste || 0)}`, a: `$${(a.dollars || 0) + (a.waste || 0)}`, raw: [(b.dollars || 0) + (b.waste || 0), (a.dollars || 0) + (a.waste || 0)], good: 'up' },
    { k: 'Your time back', b: `${b.minutes || 0} min`, a: `${a.minutes || 0} min`, raw: [b.minutes || 0, a.minutes || 0], good: 'up' },
    { k: 'Things you approved', b: '—', a: `${a.approvalsYou || 0} you · ${a.approvalsAuto || 0} auto` },
  ]
  const jobs = Object.entries(snap.workers || {}).map(([id, w]) => ({ id, n: w.jobs || 0 })).sort((x, y) => y.n - x.n)
  const max = Math.max(1, ...jobs.map((j) => j.n))
  return (
    <div className="lg-totals">
      <p className="lg-note">Same café, two ways: everything counted since you opened it today.</p>
      <table className="lg-table">
        <thead><tr><th /><th>😮‍💨 Solo</th><th>😌 With team</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const nb = r.raw ? r.raw[0] : Number(r.b)
            const na = r.raw ? r.raw[1] : Number(r.a)
            const better = r.good && Number.isFinite(nb) && Number.isFinite(na) && nb !== na && (r.good === 'up' ? na > nb : na < nb)
            return (
              <tr key={r.k}>
                <th>{r.k}</th>
                <td>{r.b ?? 0}</td>
                <td className={better ? 'better' : ''}>{r.a ?? 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="lg-jobs">
        <div className="lg-jobs-head">Jobs done by your team</div>
        {jobs.length ? jobs.map((j) => (
          <div key={j.id} className="lg-job">
            <span className="lg-face" style={{ '--a': getProduct(j.id)?.from, '--b': getProduct(j.id)?.to }}><BrandLogo id={j.id} size={11} /></span>
            <span className="lg-job-name">{AGENT_META[j.id]?.name}</span>
            <span className="lg-bar"><i style={{ width: `${(j.n / max) * 100}%`, background: `linear-gradient(90deg, ${getProduct(j.id)?.from}, ${getProduct(j.id)?.to})` }} /></span>
            <b>{j.n}</b>
          </div>
        )) : <p className="lg-empty">Hire someone to start counting.</p>}
      </div>
      <p className="lg-fine">Dollar and time figures are illustrative estimates for this prototype.</p>
    </div>
  )
}

/** The café log: what happened, who did what, what it needed from you — and the running totals. */
export default function CafeLog({ world, snap, version }) {
  const [tab, setTab] = useState('timeline')
  return (
    <div className="cafe-log">
      <div className="lg-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'timeline'} className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>What’s happening</button>
        <button role="tab" aria-selected={tab === 'totals'} className={tab === 'totals' ? 'on' : ''} onClick={() => setTab('totals')}>Totals</button>
      </div>
      {tab === 'timeline' ? <Timeline world={world} version={version} /> : <Totals snap={snap} />}
    </div>
  )
}
