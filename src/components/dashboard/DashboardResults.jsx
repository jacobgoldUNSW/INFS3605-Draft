import React, { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion'
import { useApp } from '../../state'
import { buildDashboard, EMPLOYEE_OPTIONS, CAFE_TYPES } from '../../data/mockDashboard'
import AnimatedNumber from '../ui/AnimatedNumber'
import IconTile, { Reveal } from '../ui/IconTile'
import { BarChart, Donut, LineChart } from './Charts'

const ease = [0.22, 1, 0.36, 1]
const money = (n) => `$${Math.round(n).toLocaleString()}`
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/* ------------------------------ Before / After toggle ------------------------------ */
function BeforeAfterToggle({ mode, setMode }) {
  const opts = [
    { id: 'before', label: 'Before', sub: 'How things are now', icon: '😮‍💨' },
    { id: 'after', label: 'After', sub: 'With your tools', icon: '😌' },
  ]
  return (
    <div className="ba-bar">
      <div className="ba-toggle" role="tablist">
        {opts.map((o) => (
          <button key={o.id} role="tab" aria-selected={mode === o.id} className={`ba-opt ${mode === o.id ? 'on' : ''}`} onClick={() => setMode(o.id)}>
            {mode === o.id && (
              <motion.span
                layoutId="ba-thumb"
                className={`ba-thumb ${o.id}`}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="ba-text">
              <span className="ba-emoji">{o.icon}</span>
              <span>
                <b>{o.label}</b>
                <small>{o.sub}</small>
              </span>
            </span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {mode === 'before' && (
          <motion.div
            className="ba-hint"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: 1.2 }}
          >
            <motion.span animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.3 }}>👉</motion.span>
            flip to see the difference
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------ KPI card ------------------------------ */
function Kpi({ k, mode, index }) {
  const val = mode === 'after' ? k.after : k.before
  const diff = k.after - k.before
  const good = k.lowerBetter ? diff < 0 : diff > 0
  const maxV = Math.max(k.before, k.after, 1)
  return (
    <Reveal delay={index * 0.06} className={`kpi ${mode}`}>
      <div className="kpi-top">
        <span className="kpi-ico">{k.icon}</span>
        <span className="kpi-label">{k.label}</span>
      </div>
      <div className="kpi-val">
        <AnimatedNumber value={val} format={k.format} duration={1.1} />
        <small>{k.unit}</small>
      </div>
      <div className="kpi-bar">
        <motion.div className="kpi-bar-fill" animate={{ width: `${(val / maxV) * 100}%` }} transition={{ duration: 1, ease }} />
      </div>
      <div className="kpi-foot">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'after' && diff !== 0 ? (
            <motion.span
              key="d"
              className={`delta ${good ? 'good' : 'bad'}`}
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              {diff < 0 ? '▼' : '▲'} {k.deltaFmt(Math.abs(diff))}
            </motion.span>
          ) : (
            <motion.span key="b" className="delta neutral" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {mode === 'after' ? 'No change' : k.note}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  )
}

/* ------------------------------ Timeline ------------------------------ */
function Timeline({ phases }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 24 })
  return (
    <div className="timeline" ref={ref}>
      <div className="tl-line"><motion.div className="tl-line-fill" style={{ scaleY }} /></div>
      {phases.map((ph, i) => (
        <motion.div
          key={ph.id}
          className={`tl-item ${i % 2 ? 'right' : 'left'}`}
          initial={{ opacity: 0, x: i % 2 ? 60 : -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease }}
        >
          <motion.div
            className="tl-node"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 350, damping: 16, delay: 0.15 }}
          >
            {i + 1}
          </motion.div>
          <div className="tl-card">
            <div className="tl-weeks">{ph.weeks}</div>
            <h4>{ph.title}</h4>
            <p>{ph.blurb}</p>
            {ph.items.length > 0 && (
              <div className="tl-items">
                {ph.items.map((p) => (
                  <span key={p.id} className="tl-chip">
                    <IconTile p={p} size={26} radius={8} /> {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ------------------------------ Risk card ------------------------------ */
function RiskCard({ r, index }) {
  const [open, setOpen] = useState(false)
  const label = ['', 'Low', 'Low', 'Moderate', 'Elevated', 'High'][r.level]
  return (
    <Reveal delay={index * 0.07} className={`risk lvl-${r.level} ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
      <div className="risk-head">
        <span className="risk-ico">{r.icon}</span>
        <div className="risk-title">
          <h4>{r.title}</h4>
          <div className="risk-meter">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.span
                key={n}
                className={`pip ${n <= r.level ? 'on' : ''}`}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + n * 0.08, type: 'spring', stiffness: 300, damping: 18 }}
              />
            ))}
            <em>{label}</em>
          </div>
        </div>
        <motion.span className="chev" animate={{ rotate: open ? 180 : 0 }}>⌄</motion.span>
      </div>
      <p className="risk-note">{r.note}</p>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="risk-fix" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
            <div className="risk-fix-inner"><b>💡 How to stay safe:</b> {r.fix}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
}

/* ------------------------------ Main ------------------------------ */
export default function DashboardResults() {
  const { survey, selected, toggle, setStep, restart, setOpenId, showToast } = useApp()
  const [mode, setMode] = useState('before')
  const d = useMemo(() => buildDashboard(survey, selected), [survey, selected])
  const emp = EMPLOYEE_OPTIONS.find((e) => e.id === survey.employees)
  const type = CAFE_TYPES.find((c) => c.id === survey.cafeType)
  const after = mode === 'after'

  const kpis = [
    { id: 'hrs', icon: '⏱️', label: 'Admin time', unit: ' hrs/wk', before: d.before.adminHours, after: d.after.adminHours, lowerBetter: true, format: (n) => Math.round(n), deltaFmt: (n) => `${Math.round(n)} hrs`, note: 'Spent on paperwork each week' },
    { id: 'labour', icon: '🧑‍🍳', label: 'Labour cost', unit: '% of sales', before: d.before.labourPct, after: d.after.labourPct, lowerBetter: true, format: (n) => Math.round(n), deltaFmt: (n) => `${Math.round(n)} pts`, note: 'Industry average ≈ 33%' },
    { id: 'waste', icon: '🗑️', label: 'Food waste', unit: '% of stock', before: d.before.wastePct, after: d.after.wastePct, lowerBetter: true, format: (n) => Math.round(n), deltaFmt: (n) => `${Math.round(n)} pts`, note: 'Thrown out each month' },
    { id: 'rev', icon: '💵', label: 'Monthly sales', unit: '', before: d.before.monthlyRev, after: d.after.monthlyRev, lowerBetter: false, format: money, deltaFmt: (n) => money(n), note: 'Average per month' },
    { id: 'wait', icon: '⏳', label: 'Avg. customer wait', unit: ' min', before: d.before.waitSec, after: d.after.waitSec, lowerBetter: true, format: mmss, deltaFmt: (n) => `${Math.round(n)}s`, note: 'At the busiest times' },
    { id: 'profit', icon: '🏆', label: 'Monthly profit', unit: '', before: d.before.profit, after: d.after.profit, lowerBetter: false, format: money, deltaFmt: (n) => money(n), note: 'After all costs' },
  ]

  const name = survey.name || 'your café'

  return (
    <div className={`page results ${mode}`} data-mode={mode}>
      {/* ambient background shift */}
      <motion.div className="results-glow" animate={{ opacity: after ? 1 : 0 }} transition={{ duration: 1 }} />

      <motion.header className="res-head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
        <span className="script-note big">your personalised plan</span>
        <h1>
          {name}
          <span className="script">’s</span> AI game plan
        </h1>
        <div className="res-tags">
          {type && <span className="tag">{type.icon} {type.label}</span>}
          {emp && <span className="tag">👥 {emp.label} team</span>}
          <span className="tag">🧰 {d.picked.length} tool{d.picked.length === 1 ? '' : 's'}</span>
        </div>
      </motion.header>

      <div className="ba-sticky">
        <BeforeAfterToggle mode={mode} setMode={setMode} />
      </div>

      {/* ---- Hero summary ---- */}
      <section className="summary-wrap">
        <AnimatePresence>
          <motion.div
            key={mode + '-sweep'}
            className="sweep"
            initial={{ x: '-120%' }}
            animate={{ x: '120%' }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
        </AnimatePresence>
        <motion.div className={`summary ${mode}`} layout transition={{ duration: 0.6, ease }}>
          <div className="summary-copy">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.35 }}
              >
                <div className="summary-kicker">{after ? '☀️ With your tools' : '🌧️ Right now'}</div>
                <h2>
                  {after ? (
                    <>
                      ~{d.hoursSaved || 1} hrs a week <span className="script">back in your pocket</span>
                    </>
                  ) : (
                    <>
                      <span className="script">{d.before.adminHours} hours</span> a week lost to admin
                    </>
                  )}
                </h2>
                <p>
                  {after
                    ? `Your ${d.picked.length} chosen tool${d.picked.length === 1 ? '' : 's'} could free up time, trim waste and nudge sales up — worth roughly ${money(d.netGain)} a month after subscription costs.`
                    : `That’s about ${(d.before.adminHours / 8).toFixed(1)} full working days of behind-the-scenes work — time that could go to your customers (or a well-earned flat white).`}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="summary-stats">
            <div className="big-stat">
              <div className="bs-val">
                <AnimatedNumber value={after ? d.hoursSaved : 0} format={(n) => Math.round(n)} /><small> hrs</small>
              </div>
              <div className="bs-lab">saved every week</div>
            </div>
            <div className="big-stat">
              <div className="bs-val">
                <AnimatedNumber value={after ? d.netGain : 0} format={(n) => (n < 0 ? '-' : '+') + money(Math.abs(n))} />
              </div>
              <div className="bs-lab">extra profit / month</div>
            </div>
            <div className="big-stat">
              <div className="bs-val">
                <AnimatedNumber value={after ? (d.paybackMonths ?? 0) : 0} format={(n) => Math.round(n)} /><small> mo</small>
              </div>
              <div className="bs-lab">to pay itself back</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---- KPIs ---- */}
      <section className="sec">
        <Reveal className="sec-head"><span className="script-note">the numbers</span><h3>How your café changes</h3></Reveal>
        <div className="kpi-grid">
          {kpis.map((k, i) => <Kpi key={k.id} k={k} mode={mode} index={i} />)}
        </div>
      </section>

      {/* ---- Charts ---- */}
      <section className="sec">
        <Reveal className="sec-head"><span className="script-note">picture it</span><h3>Where your time goes</h3></Reveal>
        <div className="chart-grid">
          <Reveal className="card chart-card wide" delay={0.05}>
            <div className="card-head"><h4>Profit over the next 12 months</h4><span className="card-sub">{after ? 'with rollout ramp-up' : 'if nothing changes'}</span></div>
            <LineChart months={d.months} before={d.profitBefore} after={d.profitAfter} mode={mode} />
          </Reveal>
          <Reveal className="card chart-card" delay={0.12}>
            <div className="card-head"><h4>Admin hours by day</h4><span className="card-sub">hover a bar</span></div>
            <BarChart days={d.days} before={d.weekBefore} after={d.weekAfter} mode={mode} />
          </Reveal>
          <Reveal className="card chart-card" delay={0.18}>
            <div className="card-head"><h4>What fills your week</h4><span className="card-sub">hover a slice</span></div>
            <Donut before={d.allocBefore} after={d.allocAfter} mode={mode} />
          </Reveal>
        </div>
      </section>

      {/* ---- Roadmap ---- */}
      <section className="sec">
        <Reveal className="sec-head"><span className="script-note">step by step</span><h3>Your implementation plan</h3></Reveal>
        <Timeline phases={d.timeline} />
      </section>

      {/* ---- Recommendations ---- */}
      <section className="sec">
        <Reveal className="sec-head"><span className="script-note">our recommendations</span><h3>Start here, in this order</h3></Reveal>
        <div className="rec-grid">
          {d.recs.map((r, i) => (
            <Reveal key={r.product.id} delay={(i % 3) * 0.08} className="rec-big">
              <div className="rb-top">
                <IconTile p={r.product} size={56} />
                <div className="rb-name">
                  <h4>{r.product.name}</h4>
                  <span>{r.product.tagline}</span>
                </div>
                <span className="rank">#{i + 1}</span>
              </div>
              <div className={`prio ${r.priority.replace(/[^a-z]/gi, '').toLowerCase()}`}>{r.priority === 'High' ? '🔥 ' : ''}{r.priority} priority</div>
              <div className="rb-headline">{r.headline}</div>
              <div className="rb-metrics">
                <div><b>{r.product.weeks}</b><span>wk setup</span></div>
                <div><b>~${r.product.cost}</b><span>per month</span></div>
                <div><b>{r.product.risk}</b><span>risk</span></div>
              </div>
              <button className="link-btn" onClick={() => setOpenId(r.product.id, false)}>See full details →</button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- Risks ---- */}
      <section className="sec">
        <Reveal className="sec-head"><span className="script-note">no sugar-coating</span><h3>Risks & limitations to watch</h3></Reveal>
        <div className="risk-grid">
          {d.risks.map((r, i) => <RiskCard key={r.id} r={r} index={i} />)}
        </div>
        <Reveal className="disclaimer">⚠️ Projections are illustrative estimates for this prototype — real results will vary by café.</Reveal>
      </section>

      {/* ---- Suggestions ---- */}
      {d.unpicked.length > 0 && (
        <section className="sec">
          <Reveal className="sec-head"><span className="script-note">want a little extra?</span><h3>Other tools worth a look</h3></Reveal>
          <div className="sugg-row">
            {d.unpicked.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.08} className="sugg">
                <IconTile p={p} size={48} />
                <div className="sugg-text"><b>{p.name}</b><span>{p.tagline}</span></div>
                <motion.button
                  className="mini-btn"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    toggle(p.id)
                    showToast(`${p.name} added — your plan just updated`, '✨')
                  }}
                >
                  + Add
                </motion.button>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <Reveal className="res-actions">
        <button className="btn ghost" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>← Edit my tools</button>
        <button className="btn primary" onClick={() => showToast('Prototype only — in the real app this would download a PDF', '📄')}>Download my plan (PDF)</button>
        <button className="btn ghost" onClick={() => { restart(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Start over ↺</button>
      </Reveal>
    </div>
  )
}
