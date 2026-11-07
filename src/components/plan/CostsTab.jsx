import React, { useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { PRICES_CHECKED, overlapsIn } from '../../data/products'
import { usePlan, money } from './PlanContext'
import IconTile, { Reveal } from '../ui/IconTile'
import Icon from '../ui/Icon'
import Stat from '../ui/Stat'
import AnimatedNumber from '../ui/AnimatedNumber'

const ease = [0.22, 1, 0.36, 1]
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

function Bill() {
  const { navigate } = useApp()
  const { d } = usePlan()
  const clashes = overlapsIn(d.picked.map((p) => p.id))
  const notes = []
  if (d.picked.some((p) => p.id === 'square')) notes.push('Square’s free plan charges 1.6% on every in-person card payment.')
  if (d.picked.some((p) => /12-month/.test(p.pricing?.note || ''))) notes.push('Podium is usually sold on a 12-month contract.')
  const demoOnly = d.picked.filter((p) => p.pricing?.trial === 'Demo only').map((p) => p.name)
  if (demoOnly.length) notes.push(`${demoOnly.join(' and ')} ${demoOnly.length > 1 ? 'are' : 'is'} sold after a demo, with no free trial.`)
  return (
    <div className="bill2">
      <div className="bill2-row head" aria-hidden>
        <span>Tool</span><span>Plan</span><span>Good to know</span><span className="r">A month</span>
      </div>
      {d.picked.map((p, i) => (
        <motion.div key={p.id} className="bill2-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4, ease }}>
          <span className="bill2-tool">
            <IconTile p={p} size={30} />
            <a href={hrefFor('pantry', p.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', p.id) }}>{p.name}</a>
          </span>
          <span className="bill2-plan">{p.pricing?.plan || p.vendor}</span>
          <span className="bill2-note">
            {p.pricing?.free && <span className="tag green">Free plan</span>}
            {p.pricing?.trial && p.pricing.trial !== 'Demo only' && <span className="tag">{p.pricing.trial}</span>}
            {p.pricing?.trial === 'Demo only' && <span className="tag brass">Demo first</span>}
            {p.url && <a className="link small" href={p.url} target="_blank" rel="noreferrer">Prices <Icon name="external" size={13} className="out" /></a>}
          </span>
          <span className="bill2-price num">{p.cost ? money(p.cost) : '$0'}</span>
        </motion.div>
      ))}
      <div className="bill2-row total">
        <span>Total, about</span><span /><span className="fine">Prices checked {PRICES_CHECKED}. Most ex GST.</span>
        <span className="bill2-price num"><AnimatedNumber value={d.toolCost} format={(n) => money(n)} duration={0.6} /></span>
      </div>
      {(clashes.length > 0 || notes.length > 0) && (
        <ul className="bill2-notes">
          {clashes.map((c) => <li key={c.ids.join('+')} className="warn"><Icon name="alert" size={16} /> {c.note}</li>)}
          {notes.map((n) => <li key={n}><Icon name="info" size={16} /> {n}</li>)}
        </ul>
      )}
    </div>
  )
}

/** Where you stand month by month: two months of subscriptions up front, then the monthly gain. */
function Standing() {
  const { d, paybackWeeks } = usePlan()
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-40px' })
  const [hover, setHover] = useState(null)
  const W = 640
  const H = 240
  const pad = { l: 56, r: 16, t: 18, b: 34 }
  const first = d.toolCost * 2
  const pts = useMemo(() => Array.from({ length: 13 }, (_, m) => ({ m, v: -first + d.netGain * m })), [first, d.netGain])
  const vals = pts.map((p) => p.v)
  const lo = Math.min(0, ...vals)
  const hi = Math.max(0, ...vals)
  const span = hi - lo || 1
  const x = (m) => pad.l + (m / 12) * (W - pad.l - pad.r)
  const y = (v) => pad.t + ((hi - v) / span) * (H - pad.t - pad.b)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(12)} ${y(0)} L${x(0)} ${y(0)} Z`
  const cross = d.netGain > 0 ? first / d.netGain : null
  const ticks = [lo, 0, hi].filter((v, i, a) => a.indexOf(v) === i)
  return (
    <div className="standing" ref={ref}>
      <div className="standing-read" aria-live="polite">
        {hover
          ? <><span className="label">{hover.m === 0 ? 'At the start' : `After month ${hover.m}`}</span><span className={`num ${hover.v < 0 ? 'neg' : ''}`}>{money(hover.v)}</span></>
          : <><span className="label">After a year</span><span className={`num ${pts[12].v < 0 ? 'neg' : ''}`}>{money(pts[12].v)}</span></>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="standing-svg" role="img" aria-label={`Starts at ${money(-first)}, ${cross ? `breaks even after about ${paybackWeeks} weeks` : 'does not break even in cash'}, and ends the year at ${money(pts[12].v)}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <clipPath id="above"><rect x="0" y="0" width={W} height={y(0)} /></clipPath>
          <clipPath id="below"><rect x="0" y={y(0)} width={W} height={H} /></clipPath>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--ink-2)' : 'var(--line)'} strokeWidth={v === 0 ? 1 : 1} strokeDasharray={v === 0 ? '' : '3 4'} />
            <text x={pad.l - 10} y={y(v) + 4} textAnchor="end" className="axis">{money(v)}</text>
          </g>
        ))}
        {[0, 3, 6, 9, 12].map((m) => <text key={m} x={x(m)} y={H - 10} textAnchor="middle" className="axis">{m === 0 ? 'Start' : `Month ${m}`}</text>)}
        <motion.path d={area} fill="rgba(91, 118, 83, 0.16)" clipPath="url(#above)" initial={{ opacity: 0 }} animate={{ opacity: seen ? 1 : 0 }} transition={{ delay: 0.9, duration: 0.6 }} />
        <motion.path d={area} fill="rgba(164, 82, 58, 0.12)" clipPath="url(#below)" initial={{ opacity: 0 }} animate={{ opacity: seen ? 1 : 0 }} transition={{ delay: 0.9, duration: 0.6 }} />
        <motion.path d={line} fill="none" stroke="var(--forest-800)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: seen ? 1 : 0 }} transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }} />
        {cross != null && cross <= 12 && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: seen ? 1 : 0 }} transition={{ delay: 1.3 }}>
            <line x1={x(cross)} x2={x(cross)} y1={pad.t} y2={H - pad.b} stroke="var(--brass)" strokeDasharray="2 3" />
            <circle cx={x(cross)} cy={y(0)} r="4.5" fill="var(--almond)" stroke="var(--forest-800)" strokeWidth="2" />
            <text x={x(cross) + 8} y={pad.t + 12} className="axis strong">Paid for itself · week {paybackWeeks}</text>
          </motion.g>
        )}
        {pts.map((p) => (
          <rect key={p.m} x={x(p.m) - (W - pad.l - pad.r) / 24} y={pad.t} width={(W - pad.l - pad.r) / 12} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(p)} />
        ))}
        {hover && (
          <g pointerEvents="none">
            <line x1={x(hover.m)} x2={x(hover.m)} y1={pad.t} y2={H - pad.b} stroke="var(--line-3)" />
            <circle cx={x(hover.m)} cy={y(hover.v)} r="4" fill="var(--forest-800)" />
          </g>
        )}
      </svg>
    </div>
  )
}

function Working() {
  const { d, hourly, setHourly, ownTime, setOwnTime } = usePlan()
  return (
    <div className="working">
      <div className="working-knobs">
        <label className="knob" htmlFor="w-hourly">
          <span>What’s an hour of paid work worth? <b className="num">${hourly}/hr</b></span>
          <input id="w-hourly" className="range" type="range" min="25" max="70" step="1" value={hourly} onChange={(e) => setHourly(Number(e.target.value))} />
          <span className="fine">Around $32 covers a casual’s wage and on-costs under the Hospitality Award.</span>
        </label>
        <label className="knob row" htmlFor="w-own">
          <input id="w-own" className="check" type="checkbox" checked={ownTime} onChange={(e) => setOwnTime(e.target.checked)} />
          <span>Count my own hours as money too</span>
        </label>
      </div>
      <div className="working-cols">
        <section><h4><Icon name="clock" size={18} /> Hours back each week</h4><ol>{d.why.hours.map((l) => <li key={l}>{l}</li>)}</ol></section>
        <section><h4><Icon name="coins" size={18} /> Better off each month</h4><ol>{d.why.money.map((l) => <li key={l}>{l}</li>)}</ol></section>
        <section><h4><Icon name="calendar" size={18} /> Paying for itself</h4><ol>{d.why.payback.map((l) => <li key={l}>{l}</li>)}</ol></section>
      </div>
      {d.why.revenue && <p className="fine">{d.why.revenue}</p>}
    </div>
  )
}

function Detail() {
  const { d } = usePlan()
  const rows = [
    { id: 'hrs', icon: 'clock', label: 'Admin time', a: d.before.adminHours, b: d.after.adminHours, f: (n) => `${Math.round(n)} hrs/wk`, lower: true, note: 'Paperwork and the like, each week' },
    { id: 'lab', icon: 'people', label: 'Labour cost', a: d.before.labourPct, b: d.after.labourPct, f: (n) => `${Math.round(n)}% of sales`, lower: true, note: 'Industry average is about 33%' },
    { id: 'waste', icon: 'bin', label: 'Food waste', a: d.before.wastePct, b: d.after.wastePct, f: (n) => `${Math.round(n)}% of stock`, lower: true, note: 'Thrown out each month' },
    { id: 'wait', icon: 'hourglass', label: 'Wait at the rush', a: d.before.waitSec, b: d.after.waitSec, f: mmss, lower: true, note: 'Minutes:seconds, busiest times' },
    { id: 'rev', icon: 'chart', label: 'Monthly sales', a: d.before.monthlyRev, b: d.after.monthlyRev, f: money, lower: false, note: 'Average month' },
    { id: 'profit', icon: 'coins', label: 'Monthly profit', a: d.before.profit, b: d.after.profit, f: money, lower: false, note: 'After all costs, including the tools' },
  ]
  return (
    <div className="detail">
      <div className="detail-row head" aria-hidden><span>Measure</span><span className="r">Today</span><span className="r">With your tools</span><span>Change</span></div>
      {rows.map((r, i) => {
        const diff = r.b - r.a
        const good = r.lower ? diff < 0 : diff > 0
        const max = Math.max(r.a, r.b, 1)
        return (
          <Reveal key={r.id} className="detail-row" delay={i * 0.04}>
            <span className="detail-name"><Icon name={r.icon} size={18} /><span><b>{r.label}</b><span className="fine">{r.note}</span></span></span>
            <span className="r num">{r.f(r.a)}</span>
            <span className="r num strong">{r.f(r.b)}</span>
            <span className="detail-bars" aria-label={diff === 0 ? 'No change' : `${good ? 'Better' : 'Worse'} by ${r.f(Math.abs(diff))}`}>
              <i className="a" style={{ width: `${(r.a / max) * 100}%` }} />
              <motion.i className="b" initial={{ width: 0 }} whileInView={{ width: `${(r.b / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease, delay: 0.2 }} />
              <em className={diff === 0 ? 'same' : good ? 'good' : 'bad'}>{diff === 0 ? 'No change' : `${diff < 0 ? '−' : '+'}${r.f(Math.abs(diff))}`}</em>
            </span>
          </Reveal>
        )
      })}
    </div>
  )
}

export default function CostsTab() {
  const { d, paybackWeeks, freePlans } = usePlan()
  const gain = d.netGain > 0
  return (
    <div className="costs">
      <section className="costs-top">
        <div>
          <span className="kicker">What it costs</span>
          <h2 className="costs-big"><span className="num"><AnimatedNumber value={d.toolCost} format={(n) => money(n)} duration={0.7} /></span><small> a month</small></h2>
          <p className="lede">For {d.picked.length} tool{d.picked.length === 1 ? '' : 's'}{freePlans ? `, ${freePlans} with a free plan` : ''}. Allow about {money(d.toolCost * 2)} for the first two months while you set up.</p>
        </div>
        <div className="costs-stats">
          <Stat icon="coins" label="Better off by" value={gain ? money(d.netGain) : '—'} unit={gain ? 'a month' : ''} blurb={gain ? `Likely between ${money(d.range[0])} and ${money(d.range[1])}.` : 'In cash, about even. The win is your time.'} />
          <Stat icon="calendar" label="Pays for itself in" value={paybackWeeks || '—'} unit={paybackWeeks ? (paybackWeeks === 1 ? 'week' : 'weeks') : ''} blurb="After two months of subscriptions." />
        </div>
      </section>

      <Reveal as="section" className="ov-sec">
        <div className="ov-head"><span className="kicker">The monthly bill</span><h3>Every tool, every price, up front</h3></div>
        <div className="panel flush"><Bill /></div>
      </Reveal>

      <Reveal as="section" className="ov-sec">
        <div className="ov-head"><span className="kicker">Where you stand</span><h3>Money out, then money back</h3><p className="muted">Two months of subscriptions while you set up, then what the tools save you each month. Hover along the line.</p></div>
        <div className="panel"><Standing /></div>
      </Reveal>

      <Reveal as="section" className="ov-sec">
        <div className="ov-head"><span className="kicker">How we worked it out</span><h3>Every sum, in plain sight</h3><p className="muted">Change the wage or count your own time, and every number on your plan moves with it.</p></div>
        <div className="panel"><Working /></div>
      </Reveal>

      <Reveal as="section" className="ov-sec">
        <div className="ov-head"><span className="kicker">The numbers in detail</span><h3>Today, and with your tools</h3></div>
        <div className="panel flush"><Detail /></div>
        <p className="fine ov-note">Illustrative estimates for a prototype. Real results vary by café; this isn’t financial advice. Check prices with each vendor and your accountant.</p>
      </Reveal>
    </div>
  )
}
