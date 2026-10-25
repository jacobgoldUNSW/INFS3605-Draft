import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp, planKey } from '../../state'
import {
  buildDashboard, DEFAULT_HOURLY, EMPLOYEE_OPTIONS, CAFE_TYPES, REVENUE_OPTIONS, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS,
} from '../../data/mockDashboard'
import { PRODUCTS, getProduct } from '../../data/products'
import { PEER_STORIES } from '../../data/people'
import AnimatedNumber from '../ui/AnimatedNumber'
import IconTile, { Reveal } from '../ui/IconTile'
import { BarChart, Donut, LineChart } from './Charts'
import CafeStage from '../cafe/CafeStage'
import { PeerStories } from '../home/HomePage'
import { api } from '../../api'
import { fallbackPersonalisation } from '../../../shared/personalise.js'
import { auDeep } from '../../../shared/auEnglish.js'
import { HowWeWorked, ToolBill, TeamWiring, useCafeStats, cafeWaitLine, LiveCafeLine, SectionNav } from './PlanExtras'
import { createPortal } from 'react-dom'
import AskBea, { SetupCalendar } from '../bea/AskBea'
import { planRisks } from '../../data/risks'

const ease = [0.22, 1, 0.36, 1]
const money = (n) => `$${Math.round(n).toLocaleString()}`
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/* ------------------------------ KPI card: now → with your team ------------------------------ */
function Kpi({ k, index }) {
  const diff = k.after - k.before
  const good = k.lowerBetter ? diff < 0 : diff > 0
  const maxV = Math.max(k.before, k.after, 1)
  const grow = (v, delay) => ({ initial: { width: 0 }, whileInView: { width: `${(v / maxV) * 100}%` }, viewport: { once: true }, transition: { duration: 1, ease, delay } })
  return (
    <Reveal delay={index * 0.06} className="kpi">
      <div className="kpi-top">
        <span className="kpi-ico">{k.icon}</span>
        <span className="kpi-label">{k.label}</span>
      </div>
      <div className="kpi-val">
        <AnimatedNumber value={k.after} format={k.format} duration={1.1} />
        <small>{k.unit}</small>
      </div>
      <div className="kpi-was">now {k.format(k.before)}{k.unit}</div>
      <div className="kpi-bars" aria-hidden>
        <span className="kpi-bar now"><motion.i {...grow(k.before, 0)} /></span>
        <span className="kpi-bar team"><motion.i {...grow(k.after, 0.15)} /></span>
      </div>
      <div className="kpi-foot">
        {diff !== 0
          ? <span className={`delta ${good ? 'good' : 'bad'}`}>{diff < 0 ? '▼' : '▲'} {k.deltaFmt(Math.abs(diff))}</span>
          : <span className="delta neutral">No change</span>}
        <span className="kpi-note">{k.note}</span>
      </div>
      {k.live && <div className="kpi-live"><span className="live-dot" aria-hidden /> {k.live}</div>}
    </Reveal>
  )
}

/* ------------------------------ Reality check (one risk theme) ------------------------------ */
function RiskCard({ r, index, onTool }) {
  const [open, setOpen] = useState(false)
  const label = ['', 'Low', 'Low', 'Moderate', 'Elevated', 'High'][r.level]
  return (
    <Reveal delay={(index % 6) * 0.06} className={`risk lvl-${r.level} ${open ? 'open' : ''}`}>
      <button type="button" className="risk-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="risk-ico">{r.icon}</span>
        <span className="risk-title">
          <h4>{r.title}</h4>
          <span className="risk-meter">
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
          </span>
        </span>
        <motion.span className="chev" animate={{ rotate: open ? 180 : 0 }}>⌄</motion.span>
      </button>
      <p className="risk-note">{r.note}</p>
      {r.inPlan.length > 0 && !open && <p className="risk-touch">Touches {r.inPlan.map((t) => t.name).filter((n, i, a) => a.indexOf(n) === i).join(', ')}</p>}
      {r.general && !open && <p className="risk-touch quiet">None of your tools flags this one, but it’s worth knowing</p>}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="risk-fix" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
            <div className="risk-fix-inner">
              {r.inPlan.length > 0 && (
                <div className="risk-tools">
                  <b>In your plan</b>
                  <ul>
                    {r.inPlan.map((t) => (
                      <li key={t.id + t.title}>
                        <button type="button" className="risk-tool" onClick={() => onTool(t.id)}>{t.name}</button> {t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p><b>💡 What you can do:</b> {r.fix}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
}

/* ------------------------------ Quick-edit drawer ------------------------------ */
function ChipPick({ label, options, value, onChange, multi }) {
  const isOn = (id) => (multi ? value.includes(id) : value === id)
  return (
    <div className="qe-row">
      <span className="qe-label">{label}</span>
      <div className="qe-chips">
        {options.map((o) => (
          <button
            key={o.id}
            className={`qe-chip ${isOn(o.id) ? 'on' : ''}`}
            onClick={() => onChange(multi ? (value.includes(o.id) ? value.filter((x) => x !== o.id) : [...value, o.id]) : o.id)}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function QuickEdit({ survey, setSurvey, selected, toggle, stale, onRebrew, rebrewing }) {
  const set = (k) => (v) => setSurvey((s) => ({ ...s, [k]: v }))
  return (
    <motion.div className="quick-edit" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }}>
      <div className="qe-inner">
        <div className="qe-row">
          <span className="qe-label">Café name</span>
          <input className="qe-input" value={survey.name} maxLength={40} onChange={(e) => set('name')(e.target.value)} />
        </div>
        <ChipPick label="Team size" options={EMPLOYEE_OPTIONS} value={survey.employees} onChange={set('employees')} />
        <ChipPick label="Revenue" options={REVENUE_OPTIONS} value={survey.revenue} onChange={set('revenue')} />
        <ChipPick label="Café type" options={CAFE_TYPES} value={survey.cafeType} onChange={set('cafeType')} />
        <ChipPick label="Number one goal" options={PRIMARY_GOALS} value={survey.goal} onChange={set('goal')} />
        <ChipPick label="Time sinks" options={PAIN_POINTS} value={survey.pains} onChange={set('pains')} multi />
        <ChipPick label="Tech comfort" options={TECH_LEVELS} value={survey.tech} onChange={set('tech')} />
        <div className="qe-row">
          <span className="qe-label">Your team</span>
          <div className="qe-chips">
            {PRODUCTS.map((p) => (
              <button key={p.id} className={`qe-chip tool ${selected.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)}>
                <IconTile p={p} size={18} radius={5} /> {p.worker.name} · {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="qe-foot">
          <span>{stale ? 'You’ve changed things since we last brewed.' : 'Everything’s saved to your account as you go.'}</span>
          <motion.button className="btn primary" onClick={onRebrew} disabled={rebrewing || !selected.length} whileTap={{ scale: 0.96 }}>
            {rebrewing ? 'Brewing…' : 'Re-brew my plan ✨'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------ Quiet Tuesday setup cards ------------------------------ */
const PHASES = [
  { id: 'Week 1 · Quick win', short: 'Week 1', title: 'Quick win', tone: 'p1' },
  { id: 'Weeks 2–3 · Core habit', short: 'Weeks 2–3', title: 'Core habit', tone: 'p2' },
  { id: 'Month 2 · Upgrade', short: 'Month 2', title: 'Upgrade', tone: 'p3' },
]

function SetupCard({ c, index, personalised }) {
  const p = getProduct(c.toolId)
  if (!p) return null
  return (
    <Reveal delay={index * 0.06} className="setup-card">
      <div className="setup-top">
        <IconTile p={p} size={42} radius={12} />
        <div>
          <h4>{p.name}</h4>
          <span>{p.worker.emoji} with {p.worker.name}</span>
        </div>
        {personalised && <span className="setup-ai" title="Personalised for your café">✨</span>}
      </div>
      {c.whyNow && <p className="setup-why">{c.whyNow}</p>}
      <ol className="setup-steps">
        {c.steps.map((s, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08 }}>
            <span>{i + 1}</span>{s}
          </motion.li>
        ))}
      </ol>
      <div className="setup-meta">
        <span>⏱️ {c.minutes} mins on a quiet Tuesday afternoon</span>
        <span>👤 {c.owner}</span>
      </div>
      <div className="setup-safety">🛡️ <b>Week-1 safety check:</b> {c.safetyCheck}</div>
    </Reveal>
  )
}

/* ------------------------------ Main ------------------------------ */
export default function DashboardResults() {
  const { survey, setSurvey, selected, toggle, setStep, restart, setOpenId, showToast, geminiPlan, setGeminiPlan, syncState, user } = useApp()
  const [editing, setEditing] = useState(false)
  const [rebrewing, setRebrewing] = useState(false)
  const [popRequest, setPopRequest] = useState(null)
  const [hourly, setHourly] = useState(DEFAULT_HOURLY)
  const [ownTime, setOwnTime] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [allRisks, setAllRisks] = useState(false)
  const d = useMemo(() => buildDashboard(survey, selected, { hourly, countOwnTime: ownTime }), [survey, selected, hourly, ownTime])
  const userKey = String(user?.id ?? user?.username ?? 'guest')
  const cafeStats = useCafeStats(userKey)
  const emp = EMPLOYEE_OPTIONS.find((e) => e.id === survey.employees)
  const type = CAFE_TYPES.find((c) => c.id === survey.cafeType)
  const name = survey.name || user?.cafeName || 'your café'

  const key = planKey(survey, selected)
  const fresh = geminiPlan && geminiPlan.key === key && !geminiPlan.pending
  const stale = !!geminiPlan && geminiPlan.key !== key
  const plan = useMemo(() => {
    const fb = fallbackPersonalisation(survey, selected)
    if (!geminiPlan) return fb
    const cards = selected.map((id) => geminiPlan.setupCards?.find((c) => c.toolId === id) || fb.setupCards.find((c) => c.toolId === id)).filter(Boolean)
    const order = PHASES.map((p) => p.id)
    cards.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase))
    return auDeep({ ...fb, ...geminiPlan, toolReasons: { ...fb.toolReasons, ...(geminiPlan.toolReasons || {}) }, setupCards: cards })
  }, [geminiPlan, survey, selected])

  const rebrew = async () => {
    if (!selected.length) return
    setRebrewing(true)
    try {
      const r = await api.personalise({ survey, selected })
      setGeminiPlan({ ...r.plan, key })
      showToast(r.source === 'gemini' ? 'Freshly brewed — your plan is updated' : 'Plan updated with our house recipe', '✨')
    } catch {
      setGeminiPlan({ ...fallbackPersonalisation(survey, selected), key })
      showToast('Updated with our house recipe (offline)', '☕')
    } finally {
      setRebrewing(false)
    }
  }

  const kpis = [
    { id: 'hrs', icon: '⏱️', label: 'Admin time', unit: ' hrs/wk', before: d.before.adminHours, after: d.after.adminHours, lowerBetter: true, format: (n) => Math.round(n), deltaFmt: (n) => `${Math.round(n)} hrs`, note: 'Spent on paperwork each week' },
    { id: 'labour', icon: '🧑‍🍳', label: 'Labour cost', unit: '% of sales', before: d.before.labourPct, after: d.after.labourPct, lowerBetter: true, format: (n) => Math.round(n), deltaFmt: (n) => `${Math.round(n)} pts`, note: 'Industry average ≈ 33%' },
    { id: 'waste', icon: '🗑️', label: 'Food waste', unit: '% of stock', before: d.before.wastePct, after: d.after.wastePct, lowerBetter: true, format: (n) => Math.round(n), deltaFmt: (n) => `${Math.round(n)} pts`, note: 'Thrown out each month' },
    { id: 'rev', icon: '💵', label: 'Monthly sales', unit: '', before: d.before.monthlyRev, after: d.after.monthlyRev, lowerBetter: false, format: money, deltaFmt: (n) => money(n), note: 'Average per month' },
    { id: 'wait', icon: '⏳', label: 'Avg. customer wait', unit: ' min', before: d.before.waitSec, after: d.after.waitSec, lowerBetter: true, format: mmss, deltaFmt: (n) => `${Math.round(n)}s`, note: 'At the busiest times', live: cafeWaitLine(cafeStats) },
    { id: 'profit', icon: '🏆', label: 'Monthly profit', unit: '', before: d.before.profit, after: d.after.profit, lowerBetter: false, format: money, deltaFmt: (n) => money(n), note: 'After all costs' },
  ]

  // honest, big-picture reality checks for the tools in this plan (written by us, not by the AI)
  const risks = planRisks(survey, selected)
  const shownRisks = allRisks ? risks : risks.slice(0, 6)

  const stories = useMemo(() => {
    const score = (s) => s.tools.filter((t) => selected.includes(t)).length * 2 + (s.type === survey.cafeType ? 1 : 0)
    return [...PEER_STORIES].sort((a, b) => score(b) - score(a)).slice(0, 3)
  }, [selected, survey.cafeType])

  return (
    <div className="page results">
      <div className="results-glow" aria-hidden />

      {/* 1 · header + quick edit */}
      <motion.header className="res-head" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
        <span className="script-note big">your personalised plan</span>
        <h1>
          {name}
          <span className="script">’s</span> AI game plan
        </h1>
        <div className="res-tags">
          {type && <span className="tag">{type.icon} {type.label}</span>}
          {emp && <span className="tag">👥 {emp.label} team</span>}
          <span className="tag">🧰 {d.picked.length} tool{d.picked.length === 1 ? '' : 's'} active</span>
          <button className={`tag tag-btn ${editing ? 'on' : ''}`} onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
            ✏️ Edit survey or swap tools
          </button>
          <span className={`sync-pill ${syncState}`}>{syncState === 'saving' ? 'Saving…' : syncState === 'error' ? 'Couldn’t save — retrying' : 'Saved ✓'}</span>
        </div>
        <p className="res-sim-note">
          <b>Below is a simulation of {name}.</b> The customers are pretend; the decisions your AI team makes are real, written live by Google Gemini.{' '}
          <button type="button" className="link-btn" onClick={() => setPopRequest({ id: 'ai', n: Date.now() })}>What am I looking at?</button>
        </p>
      </motion.header>
      <AnimatePresence initial={false}>
        {editing && (
          <QuickEdit survey={survey} setSurvey={setSurvey} selected={selected} toggle={toggle} stale={stale} onRebrew={rebrew} rebrewing={rebrewing} />
        )}
      </AnimatePresence>

      {/* 2 · the live café, with what the team saves you in its sticky bar */}
      <div id="plan-cafe" className="plan-anchor" />
      <CafeStage
        selected={selected}
        cafeName={name}
        userKey={userKey}
        popRequest={popRequest}
        profile={{ employees: survey.employees, cafeType: survey.cafeType }}
        onToggleWorker={(id) => {
          const p = getProduct(id)
          const adding = !selected.includes(id)
          toggle(id)
          showToast(adding ? `${p.worker.name} (${p.name}) is walking in…` : `${p.worker.name} heads home`, adding ? '🚪' : '👋')
        }}
      />

      <SectionNav sections={[
        { id: 'plan-cafe', icon: '☕', label: 'Café' },
        { id: 'plan-numbers', icon: '📈', label: 'Numbers' },
        { id: 'plan-bill', icon: '🧾', label: 'Costs' },
        { id: 'plan-setup', icon: '🗓️', label: 'Setup' },
        { id: 'plan-risks', icon: '⚠️', label: 'Reality checks' },
      ]} />

      {/* 3 · hero summary: with your team, and where you are today */}
      <section className="summary-wrap" id="plan-numbers">
        <motion.div className="summary" layout transition={{ duration: 0.6, ease }}>
          <div className="summary-copy">
            <motion.div key={fresh ? 'g' : 'f'} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="summary-kicker">☀️ With your AI team</div>
              <h2>{plan.headline} <span className="script">— ~{d.hoursSaved || 0} hrs a week back</span></h2>
              <p>
                {d.netGain > 0
                  ? `${plan.summary} Worth roughly ${money(d.range[0])}–${money(d.range[1])} a month after subscriptions, plus about ${d.ownerHours} hours of your own time each week.`
                  : `${plan.summary} In cash terms the tools about pay for themselves; the real win is about ${d.ownerHours} hours of your own time each week.`}
              </p>
              <p className="summary-now">🌧️ <b>Today, without the tools:</b> about {d.before.adminHours} hours a week of admin, or {(d.before.adminHours / 8).toFixed(1)} full working days.</p>
              {plan.source === 'gemini' && <span className="summary-ai">✨ personalised for {name}</span>}
            </motion.div>
          </div>

          <div className="summary-stats">
            <div className="big-stat">
              <div className="bs-val"><AnimatedNumber value={d.hoursSaved} format={(n) => Math.round(n)} /><small> hrs</small></div>
              <div className="bs-lab">saved every week</div>
              <div className="bs-range">{d.ownerHours} of them yours</div>
            </div>
            <div className="big-stat">
              <div className="bs-val"><AnimatedNumber value={d.netGain} format={(n) => (n < 0 ? '-' : '+') + money(Math.abs(n))} /></div>
              <div className="bs-lab">extra profit / month</div>
              {d.netGain > 0 && <div className="bs-range">likely {money(d.range[0])}–{money(d.range[1])}</div>}
            </div>
            <div className="big-stat">
              {d.paybackMonths == null
                ? <div className="bs-val">—</div>
                : <div className="bs-val"><AnimatedNumber value={d.paybackMonths ?? 0} format={(n) => Math.round(n)} /><small> mo</small></div>}
              <div className="bs-lab">{d.paybackMonths == null ? 'time is the payoff' : 'to pay itself back'}</div>
            </div>
          </div>
        </motion.div>
        <HowWeWorked d={d} hourly={hourly} setHourly={setHourly} ownTime={ownTime} setOwnTime={setOwnTime} />
      </section>

      {/* 4 · KPIs & charts */}
      <section className="sec">
        <Reveal className="sec-head"><span className="script-note">the numbers</span><h3>How your café changes</h3></Reveal>
        <div className="kpi-legend" aria-hidden><span className="now">Today</span><span className="team">With your team</span></div>
        <LiveCafeLine stats={cafeStats} />
        <div className="kpi-grid">
          {kpis.map((k, i) => <Kpi key={k.id} k={k} index={i} />)}
        </div>
      </section>

      <section className="sec">
        <Reveal className="sec-head"><span className="script-note">picture it</span><h3>Where your time goes</h3></Reveal>
        <div className="chart-grid">
          <Reveal className="card chart-card wide" delay={0.05}>
            <div className="card-head"><h4>Profit over the next 12 months</h4><span className="card-sub"><i className="key team" /> with your team, ramping up · <i className="key now dashed" /> if nothing changes</span></div>
            <LineChart months={d.months} before={d.profitBefore} after={d.profitAfter} />
          </Reveal>
          <Reveal className="card chart-card" delay={0.12}>
            <div className="card-head"><h4>Admin hours by day</h4><span className="card-sub"><i className="key now" /> today · <i className="key team" /> with your team</span></div>
            <BarChart days={d.days} before={d.weekBefore} after={d.weekAfter} />
          </Reveal>
          <Reveal className="card chart-card" delay={0.18}>
            <div className="card-head"><h4>What fills your week</h4><span className="card-sub">with your team · hover a slice</span></div>
            <Donut before={d.allocBefore} after={d.allocAfter} />
          </Reveal>
        </div>
      </section>

      {/* the bill, and how the tools hand work to each other */}
      {d.picked.length > 0 && (
        <section className="sec" id="plan-bill">
          <Reveal className="sec-head"><span className="script-note">no surprises</span><h3>What it costs, and how it fits together</h3></Reveal>
          <div className="bill-grid">
            <Reveal><ToolBill picked={d.picked} /></Reveal>
            <Reveal delay={0.08}><TeamWiring picked={d.picked} /></Reveal>
          </div>
        </section>
      )}

      {/* 5 · quiet Tuesday setup cards */}
      {plan.setupCards.length > 0 && (
        <section className="sec" id="plan-setup">
          <Reveal className="sec-head between-head">
            <div>
              <span className="script-note">no big-bang rollout</span>
              <h3>Your quiet Tuesday setup cards</h3>
            </div>
            {stale && (
              <motion.button className="btn ghost rebrew-btn" onClick={rebrew} disabled={rebrewing} whileTap={{ scale: 0.96 }}>
                {rebrewing ? 'Brewing…' : '✨ Re-brew with my changes'}
              </motion.button>
            )}
          </Reveal>
          <SetupCalendar />
          <div className="setup-board">
            {PHASES.map((ph) => {
              const cards = plan.setupCards.filter((c) => c.phase === ph.id)
              if (!cards.length) return null
              return (
                <div key={ph.id} className={`setup-col ${ph.tone}`}>
                  <div className="setup-phase"><b>{ph.short}</b><span>{ph.title}</span></div>
                  {cards.map((c, i) => <SetupCard key={c.toolId} c={c} index={i} personalised={plan.source === 'gemini' && geminiPlan?.setupCards?.some((g) => g.toolId === c.toolId)} />)}
                </div>
              )
            })}
          </div>
          {plan.peerTip && <Reveal className="peer-tip"><span className="script-note">a tip from another owner</span> {plan.peerTip}</Reveal>}
        </section>
      )}

      {/* 6 · reality checks, stories, extras */}
      <section className="sec" id="plan-risks">
        <Reveal className="sec-head"><span className="script-note">no sugar-coating</span><h3>Reality checks before you sign up</h3></Reveal>
        <Reveal className="risk-intro">
          These tools can genuinely help, and they come with real trade-offs. {selected.length ? 'Here are the big ones, starting with those that touch the tools in your plan.' : 'Here are the big ones for café tools like these, most serious first.'}
          Tap one to see which of your tools it touches and what you can do about it.
        </Reveal>
        <div className="risk-grid">
          {shownRisks.map((r, i) => <RiskCard key={r.id} r={r} index={i} onTool={(id) => setOpenId(id, false)} />)}
        </div>
        {risks.length > 6 && (
          <button type="button" className="link-btn risk-more" onClick={() => setAllRisks((v) => !v)}>
            {allRisks ? 'Show fewer' : `Show all ${risks.length} reality checks`}
          </button>
        )}
        <Reveal className="disclaimer">⚠️ Projections are illustrative estimates for this prototype, and real results will vary by café. This isn’t legal or financial advice: check the details with each vendor and your accountant.</Reveal>
      </section>

      <PeerStories stories={stories} title="Owners who started where you are" note="from one café owner to another" />

      {d.unpicked.length > 0 && (
        <section className="sec">
          <Reveal className="sec-head"><span className="script-note">want a little extra?</span><h3>Other tools worth a look</h3></Reveal>
          <div className="sugg-row">
            {d.unpicked.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.08} className="sugg">
                <IconTile p={p} size={48} />
                <div className="sugg-text"><b>{p.name}</b><span>{p.worker.emoji} {p.worker.name} — {p.tagline}</span></div>
                <motion.button
                  className="mini-btn"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    toggle(p.id)
                    showToast(`${p.worker.name} (${p.name}) is walking into your café`, '🚪')
                    window.scrollTo({ top: document.querySelector('.stage')?.offsetTop - 140 || 0, behavior: 'smooth' })
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
        <button className="btn primary" onClick={() => window.print()}>Print my plan 🖨️</button>
        {confirmReset ? (
          <span className="reset-confirm" role="group" aria-label="Start over?">
            <span>This clears your answers, your tools and your plan.</span>
            <button className="btn primary" onClick={() => { setConfirmReset(false); restart(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Yes, start over</button>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>Keep my plan</button>
          </span>
        ) : (
          <button className="btn ghost" onClick={() => setConfirmReset(true)}>Start over ↺</button>
        )}
      </Reveal>
      {createPortal(<AskBea setupCards={plan.setupCards} bill={d.toolCost} />, document.body)}
    </div>
  )
}
