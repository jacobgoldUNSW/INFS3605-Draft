import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { getProduct } from '../../data/products'
import { usePlan, PHASES } from './PlanContext'
import IconTile, { Reveal } from '../ui/IconTile'
import Icon from '../ui/Icon'

const ease = [0.22, 1, 0.36, 1]
const DAY_IDX = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
const HOUR = { morning: [9, 0], afternoon: [14, 30], evening: [19, 30] }
const PHASE_WEEK = { 'Week 1 · Quick win': 1, 'Weeks 2–3 · Core habit': 2, 'Month 2 · Upgrade': 5 }

// the date of a given weekday in "week n" from now (week 1 = the coming week)
function dateFor(week, day, [h, m]) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  let add = (DAY_IDX[day] - d.getDay() + 7) % 7
  if (add === 0) add = 7
  d.setDate(d.getDate() + add + (week - 1) * 7)
  return d
}
const stamp = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** One .ics file with a calendar slot for each tool's setup, using Bea's schedule if she made one. */
function downloadCalendar(cards, schedule, name) {
  const used = new Map()
  const events = cards.map((c, i) => {
    const p = getProduct(c.toolId)
    const s = schedule?.sessions?.find((x) => x.toolId === c.toolId)
    let week = s?.week || PHASE_WEEK[c.phase] || 1
    const day = s?.day || 'Tue'
    // two tools in the same week go on different days unless Bea said otherwise
    const k = `${week}-${day}`
    if (!s && used.has(k)) week += used.get(k)
    used.set(k, (used.get(k) || 0) + 1)
    const start = dateFor(week, day, HOUR[schedule?.timeOfDay] || HOUR.afternoon)
    const end = new Date(start.getTime() + (s?.minutes || c.minutes || 30) * 60000)
    const body = [...c.steps.map((st, j) => `${j + 1}. ${st}`), '', `First-week check: ${c.safetyCheck}`, p?.url ? `Prices and sign-up: ${p.url}` : ''].join('\n')
    return ['BEGIN:VEVENT', `UID:cafinity-${c.toolId}-${i}@cafinity.app`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(`Set up ${p?.name || c.toolId} (${s?.minutes || c.minutes} min)`)}`, `DESCRIPTION:${esc(body)}`, 'END:VEVENT'].join('\r\n')
  })
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cafinity//Setup plan//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${(name || 'cafe').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-setup-plan.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function SetupCard({ c, done, onTick, index }) {
  const { navigate } = useApp()
  const p = getProduct(c.toolId)
  if (!p) return null
  const ticked = c.steps.filter((_, i) => done.has(`${c.toolId}:${i}`)).length
  const all = ticked === c.steps.length
  return (
    <Reveal className={`su-card ${all ? 'complete' : ''}`} delay={index * 0.06}>
      <header className="su-card-head">
        <IconTile p={p} size={36} />
        <div>
          <h4><a href={hrefFor('pantry', p.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', p.id) }}>{p.name}</a></h4>
          <span className="fine"><Icon name="clock" size={13} /> {c.minutes} min · <Icon name="user" size={13} /> {c.owner}</span>
        </div>
        <span className={`su-count num ${all ? 'done' : ''}`}>{all ? <Icon name="check" size={16} /> : `${ticked}/${c.steps.length}`}</span>
      </header>
      {c.whyNow && <p className="su-why">{c.whyNow}</p>}
      <ol className="su-steps">
        {c.steps.map((s, i) => {
          const key = `${c.toolId}:${i}`
          const on = done.has(key)
          return (
            <li key={key} className={on ? 'on' : ''}>
              <label>
                <input type="checkbox" className="check" checked={on} onChange={() => onTick(key)} />
                <span>{s}</span>
              </label>
            </li>
          )
        })}
      </ol>
      <div className="su-safety"><Icon name="shield" size={17} /><p><b>First-week check.</b> {c.safetyCheck}</p></div>
      <footer className="su-links">
        {p.url && <a className="link small" href={p.url} target="_blank" rel="noreferrer">Prices and sign-up <Icon name="external" size={13} className="out" /></a>}
        <a className="link small" href={hrefFor('pantry', p.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', p.id) }}>About {p.name} <Icon name="arrowRight" size={13} className="go" /></a>
      </footer>
    </Reveal>
  )
}

export default function SetupTab() {
  const { beaChat, setBeaChat, selected, openBea } = useApp()
  const { plan, name, stale, rebrew, rebrewing } = usePlan()
  const done = useMemo(() => new Set(beaChat.done || []), [beaChat.done])
  const cards = plan.setupCards
  const total = cards.reduce((s, c) => s + c.steps.length, 0)
  const ticked = cards.reduce((s, c) => s + c.steps.filter((_, i) => done.has(`${c.toolId}:${i}`)).length, 0)
  const minutes = cards.reduce((s, c) => s + (c.minutes || 0), 0)
  const schedule = beaChat.schedule
  const sessions = (schedule?.sessions || []).filter((s) => selected.includes(s.toolId))
  const tick = (key) => setBeaChat((c) => {
    const cur = new Set(c.done || [])
    if (cur.has(key)) cur.delete(key)
    else cur.add(key)
    return { ...c, done: [...cur] }
  })

  if (!cards.length) {
    return <div className="empty-note">Add a tool from your toolkit and its setup steps appear here.</div>
  }
  return (
    <div className="setup">
      <section className="su-top">
        <div>
          <span className="kicker">Getting set up</span>
          <h2>One tool at a time, on a quiet afternoon</h2>
          <p className="lede">Here’s the order we’d go in for {name}: about {Math.round(minutes / 5) * 5} minutes of setup in all, spread over a few weeks. Tick steps off as you go and we’ll keep your place.</p>
        </div>
        <div className="su-side">
          <div className="su-prog">
            <div className="su-prog-num"><span className="num">{ticked}</span><span className="fine">of {total} steps done</span></div>
            <div className="su-prog-bar"><motion.i animate={{ width: `${total ? (ticked / total) * 100 : 0}%` }} transition={{ duration: 0.5, ease }} /></div>
          </div>
          <button type="button" className="btn btn-outline btn-block" onClick={() => downloadCalendar(cards, schedule, name)}><Icon name="download" size={17} /> Add to my calendar</button>
          <button type="button" className="btn btn-quiet btn-block" onClick={() => openBea(false)}><Icon name="chat" size={16} /> Plan the dates with Bea</button>
          {stale && <button type="button" className="btn btn-quiet btn-block" onClick={rebrew} disabled={rebrewing}><Icon name="refresh" size={16} /> {rebrewing ? 'Updating…' : 'Refresh these steps for my new tools'}</button>}
        </div>
      </section>

      {sessions.length > 0 && (
        <Reveal as="section" className="su-bea panel">
          <div className="panel-head"><h4><Icon name="calendar" size={18} /> Your dates, planned with Bea</h4><button type="button" className="link small" onClick={() => setBeaChat((c) => ({ ...c, schedule: null }))}>Clear</button></div>
          <ol className="su-bea-list">
            {sessions.sort((a, b) => a.week - b.week || DAY_IDX[a.day] - DAY_IDX[b.day]).map((s) => (
              <li key={`${s.toolId}-${s.week}-${s.day}`}>
                <span className="label">Week {s.week}</span>
                <b>{DAY_NAMES[s.day]} {schedule.timeOfDay}</b>
                <span>{getProduct(s.toolId)?.name} · {s.minutes} min</span>
                <span className="fine">{s.what}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      )}

      <ol className="su-path">
        {PHASES.map((ph, pi) => {
          const list = cards.filter((c) => c.phase === ph.id)
          if (!list.length) return null
          return (
            <li key={ph.id} className="su-phase">
              <div className="su-phase-head">
                <span className="su-phase-n num">{String(pi + 1).padStart(2, '0')}</span>
                <div><span className="label">{ph.short}</span><h3>{ph.title}</h3></div>
              </div>
              <div className="su-phase-cards">
                {list.map((c, i) => <SetupCard key={c.toolId} c={c} done={done} onTick={tick} index={i} />)}
              </div>
            </li>
          )
        })}
      </ol>

      {plan.peerTip && (
        <Reveal as="aside" className="su-tip">
          <Icon name="quote" size={26} />
          <p>{plan.peerTip}</p>
        </Reveal>
      )}
    </div>
  )
}
