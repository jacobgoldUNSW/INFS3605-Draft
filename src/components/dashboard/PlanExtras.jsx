import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PRICES_CHECKED, connectionsAmong, overlapsIn } from '../../data/products'
import { BrandLogo } from '../ui/IconTile'
import { peekCafeSession } from '../../sim/session'

const ease = [0.22, 1, 0.36, 1]
const money = (n) => `$${Math.round(n).toLocaleString()}`
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/** "How we worked this out": every sum behind the big numbers, and what your time is worth. */
export function HowWeWorked({ d, hourly, setHourly, ownTime, setOwnTime }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`how ${open ? 'open' : ''}`}>
      <button type="button" className="how-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>🧮 How we worked this out</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} aria-hidden>⌄</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="how-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
            <div className="how-inner">
              <div className="how-knobs">
                <label className="how-slider" htmlFor="how-hourly">
                  <span>What’s an hour of work worth to you? <b>${hourly}/hr</b></span>
                  <input id="how-hourly" type="range" min="25" max="70" step="1" value={hourly} onChange={(e) => setHourly(Number(e.target.value))} />
                </label>
                <label className="how-check" htmlFor="how-own">
                  <input id="how-own" type="checkbox" checked={ownTime} onChange={(e) => setOwnTime(e.target.checked)} />
                  <span>Count my own hours as money too</span>
                </label>
              </div>
              <div className="how-cols">
                <section>
                  <h5>⏱️ Hours back each week</h5>
                  <ol>{d.why.hours.map((l) => <li key={l}>{l}</li>)}</ol>
                </section>
                <section>
                  <h5>💵 Extra profit a month</h5>
                  <ol>{d.why.money.map((l) => <li key={l}>{l}</li>)}</ol>
                </section>
                <section>
                  <h5>📆 Time to pay itself back</h5>
                  <ol>{d.why.payback.map((l) => <li key={l}>{l}</li>)}</ol>
                </section>
              </div>
              {d.why.revenue && <p className="how-fine">{d.why.revenue}</p>}
              <p className="how-fine">Tool prices were checked in {PRICES_CHECKED}. Hours saved come from each tool’s typical results for a small café, so treat everything here as a ballpark, not a promise.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The monthly bill, printed like a docket: what each tool costs, and what to watch for. */
export function ToolBill({ picked }) {
  const total = picked.reduce((s, p) => s + (p.cost || 0), 0)
  const clashes = overlapsIn(picked.map((p) => p.id))
  const notes = []
  if (picked.some((p) => p.id === 'square')) notes.push('Square’s free plan charges 1.6% on in-person card payments.')
  if (picked.some((p) => /12-month/.test(p.pricing?.note || ''))) notes.push('Podium is usually sold on a 12-month contract.')
  const demoOnly = picked.filter((p) => p.pricing?.trial === 'Demo only').map((p) => p.name)
  if (demoOnly.length) notes.push(`${demoOnly.join(' and ')} ${demoOnly.length > 1 ? 'are' : 'is'} sold after a demo, with no free trial.`)
  return (
    <div className="bill">
      <div className="bill-head"><b>Your monthly tool bill</b><span>checked {PRICES_CHECKED}</span></div>
      <ul>
        {picked.map((p) => (
          <li key={p.id}>
            <span className="bill-name">{p.name}{p.pricing?.free && <em>{p.cost ? 'free option' : 'free plan'}</em>}</span>
            <span className="bill-dots" aria-hidden />
            <span className="bill-price">{p.cost ? money(p.cost) : '$0'}</span>
          </li>
        ))}
      </ul>
      <div className="bill-total"><span>Total, about</span><b>{money(total)}/mo</b></div>
      {clashes.map((c) => <p key={c.ids.join('+')} className="bill-warn">⚠️ {c.note}</p>)}
      {notes.map((n) => <p key={n} className="bill-note">{n}</p>)}
      <p className="bill-note">Most tools have a free plan or trial. Start with one or two, and check each price on the vendor’s site before you sign up.</p>
    </div>
  )
}

/** How your team connects: who hands what to whom. */
export function TeamWiring({ picked }) {
  const ids = picked.map((p) => p.id)
  const links = connectionsAmong(ids)
  const nodes = useMemo(() => {
    const used = picked.filter((p) => links.some((l) => l.from === p.id || l.to === p.id))
    const n = used.length
    return used.map((p, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      return { p, x: 150 + Math.cos(a) * 104, y: 112 + Math.sin(a) * 82 }
    })
  }, [picked, links])
  const at = (id) => nodes.find((n) => n.p.id === id)
  if (!links.length) {
    return (
      <div className="wiring empty">
        <b>How your team connects</b>
        <p>These tools each work on their own. Add Xero and the money tools (Dext, Square, Deputy) start passing work to each other.</p>
      </div>
    )
  }
  return (
    <div className="wiring">
      <b>How your team connects</b>
      <svg viewBox="0 0 300 248" className="wiring-svg" role="img" aria-label="Which of your tools pass information to each other">
        <defs>
          <marker id="wire-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#c9a27a" />
          </marker>
        </defs>
        {links.map((l) => {
          const a = at(l.from)
          const b = at(l.to)
          if (!a || !b) return null
          const dx = b.x - a.x
          const dy = b.y - a.y
          const len = Math.hypot(dx, dy) || 1
          const r = 20
          return <line key={l.from + l.to} x1={a.x + (dx / len) * r} y1={a.y + (dy / len) * r} x2={b.x - (dx / len) * (r + 3)} y2={b.y - (dy / len) * (r + 3)} stroke="#c9a27a" strokeWidth="2" markerEnd="url(#wire-arrow)" />
        })}
        {nodes.map(({ p, x, y }) => (
          <g key={p.id} transform={`translate(${x} ${y})`}>
            <defs>
              <linearGradient id={`wg-${p.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.from} /><stop offset="1" stopColor={p.to} /></linearGradient>
            </defs>
            <circle r="19" fill={`url(#wg-${p.id})`} stroke="#fff" strokeWidth="2.5" />
            <g transform="translate(-11 -11)"><BrandLogo id={p.id} size={22} /></g>
            <text y="34" textAnchor="middle" className="wiring-label">{p.name}</text>
          </g>
        ))}
      </svg>
      <ul className="wiring-list">
        {links.map((l) => (
          <li key={l.from + l.to}><b>{at(l.from)?.p.name} → {at(l.to)?.p.name}</b> {l.what}</li>
        ))}
      </ul>
    </div>
  )
}

/** What the café simulation just measured, so the toy and the numbers talk to each other. */
export function useCafeStats(userKey) {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    const read = () => {
      const s = peekCafeSession(userKey)?.world?.stats
      if (s) setStats({ before: { ...s.before }, after: { ...s.after } })
    }
    read()
    const id = setInterval(read, 3000)
    return () => clearInterval(id)
  }, [userKey])
  return stats
}

export function cafeWaitLine(stats) {
  if (!stats) return null
  const avg = (s) => (s.waitN ? s.waitSum / s.waitN : null)
  const solo = avg(stats.before)
  const team = avg(stats.after)
  if (solo == null && team == null) return null
  if (solo != null && team != null) return `In your café today: ${mmss(team)} with the team vs ${mmss(solo)} on your own`
  return team != null ? `In your café today: ${mmss(team)} with the team` : `In your café today: ${mmss(solo)} on your own`
}

export function LiveCafeLine({ stats }) {
  if (!stats) return null
  const b = stats.before
  const a = stats.after
  if (!(b.served || a.served)) return null
  return (
    <p className="live-line">
      <span className="live-dot" aria-hidden /> <b>Live from your café simulation:</b>{' '}
      {b.served > 0 && <>on your own, {b.served} served and {b.walkouts} walked out. </>}
      {a.served > 0 && <>With the team, {a.served} served and {a.walkouts} walked out{a.minutes ? `, with ${a.minutes} minutes of your time back` : ''}.</>}
    </p>
  )
}

/** A slim bar of chips that jumps around the plan and shows where you are. */
export function SectionNav({ sections }) {
  const [cur, setCur] = useState(sections[0]?.id)
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!els.length) return
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)
      if (vis[0]) setCur(vis[0].target.id)
    }, { rootMargin: '-140px 0px -55% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sections])
  const go = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' })
  }
  return (
    <nav className="sec-nav" aria-label="Your plan, section by section">
      {sections.map((s) => (
        <button key={s.id} type="button" className={cur === s.id ? 'on' : ''} aria-current={cur === s.id ? 'true' : undefined} onClick={() => go(s.id)}>
          {s.icon} {s.label}
        </button>
      ))}
    </nav>
  )
}
