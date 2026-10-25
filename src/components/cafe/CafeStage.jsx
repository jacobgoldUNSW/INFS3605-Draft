import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CafeCanvas from './CafeCanvas'
import WorkerInspector, { Portrait } from './WorkerInspector'
import TeamPanel from './TeamPanel'
import CurveballMenu, { CURVEBALLS, stepLabel } from './EventRail'
import CafeLog from './CafeLog'
import CafeTour, { TOUR } from './CafeTour'
import PxIcon from './PxIcon'
import { CafeWorld } from '../../sim/world'
import { getCafeSession, dropCafeSessions } from '../../sim/session'
import { loadCafeImages } from '../../sim/assets'
import { sound } from '../../sim/soundEngine'
import { music } from '../../sim/music'
import { api } from '../../api'
import { useApp } from '../../state'
import { getProduct } from '../../data/products'
import { fallbackAgentStep } from '../../../shared/agentScenarios.js'

function useDocVisible() {
  const [v, setV] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  useEffect(() => {
    const on = () => setV(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return v
}

const tourKey = (userKey) => `brewmind.tour.v2.${userKey}`
const tourDone = (userKey) => { try { return localStorage.getItem(tourKey(userKey)) === 'done' } catch { return true } }
const markTour = (userKey) => { try { localStorage.setItem(tourKey(userKey), 'done') } catch { /* private mode */ } }
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function ModeToggle({ mode, onMode, nudge }) {
  const opts = [
    { id: 'before', label: 'Before', sub: 'Solo owner', icon: '😮‍💨' },
    { id: 'after', label: 'After', sub: 'With your AI team', icon: '😌' },
  ]
  return (
    <div className="mode-toggle" role="tablist" aria-label="Before or after AI">
      {opts.map((o) => (
        <button
          key={o.id} role="tab" aria-selected={mode === o.id} data-tour={o.id}
          className={`mt-opt ${mode === o.id ? 'on' : ''} ${o.id === 'after' && nudge && mode === 'before' ? 'nudge' : ''}`}
          onClick={() => onMode(o.id)}
        >
          {mode === o.id && <motion.span layoutId="mt-thumb" className={`mt-thumb ${o.id}`} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
          <span className="mt-text"><span className="mt-emoji">{o.icon}</span><span><b>{o.label}</b><small>{o.sub}</small></span></span>
        </button>
      ))}
    </div>
  )
}

/* ------------------------------ pixel popups ------------------------------ */

/** The Team button's icon: the faces of the first few people on your team (just you before anyone's hired). */
function TeamFaces({ images, ids }) {
  const faces = ids.length ? ids.slice(0, 3) : ['owner']
  return (
    <span className="mbtn-faces" aria-hidden>
      {faces.map((id) => {
        const p = getProduct(id)
        return (
          <span key={id} className="mbtn-face" style={{ '--a': p?.from || '#f2b46d', '--b': p?.to || '#c85a24' }}>
            <Portrait images={images} sprite={id} size={32} />
          </span>
        )
      })}
    </span>
  )
}

/** "Today so far": the café's running totals, printed like a till receipt. */
function TodayPop({ snap, mode, onLog }) {
  const s = snap.stats?.[mode] || {}
  const solo = snap.stats?.before || {}
  const team = snap.stats?.after || {}
  const items = [
    { k: 'served', v: s.served || 0, label: 'served', icon: '☕' },
    { k: 'walkouts', v: s.walkouts || 0, label: 'walked out', icon: '😤', bad: (s.walkouts || 0) > 0 },
    { k: 'wait', v: s.waitN ? mmss(s.waitSum / s.waitN) : '—', label: 'average wait', icon: '⏳' },
  ]
  if (mode === 'after') {
    items.push({ k: 'time', v: `${s.minutes || 0}m`, label: 'of your time back', icon: '🕒' })
    items.push({ k: 'money', v: `$${(s.dollars || 0) + (s.waste || 0)}`, label: 'kept or earned', icon: '💰' })
    items.push({ k: 'ok', v: (s.approvalsYou || 0) + (s.approvalsAuto || 0), label: 'asked you first', icon: '✅' })
  } else {
    items.push({ k: 'missed', v: s.missed || 0, label: 'missed calls', icon: '📵', bad: (s.missed || 0) > 0 })
  }
  const compare = mode === 'after' && (solo.served || 0) > 0
  return (
    <>
      <div className="px-head"><PxIcon name="sun" /><b>Today so far</b>{snap.clock && <span className="px-head-note">{snap.clock.label}</span>}</div>
      <div className="px-scroll">
        <div className="px-stats">
          {items.map((it) => (
            <div key={it.k} className={`px-stat ${it.bad ? 'bad' : ''}`}>
              <span className="px-stat-ico" aria-hidden>{it.icon}</span>
              <b>{it.v}</b>
              <span>{it.label}</span>
            </div>
          ))}
        </div>
        {compare && (
          <p className="px-vs">
            On your own today: <b>{solo.walkouts || 0}</b> walk-out{solo.walkouts === 1 ? '' : 's'}, <b>{solo.missed || 0}</b> missed call{solo.missed === 1 ? '' : 's'}.
            {' '}With the team: <b>{team.walkouts || 0}</b> and <b>{team.missed || 0}</b>.
          </p>
        )}
        <button type="button" className="px-link" onClick={onLog}>Open the café log ▸</button>
      </div>
    </>
  )
}

/** What the visitor is looking at: a simulated café whose AI team makes real decisions. */
function AboutPop({ mode, live, thinking, cafeName, onTour }) {
  const status = mode !== 'after'
    ? { cls: 'idle', text: 'No AI is running right now: in Before it’s just you. Flip to After to bring the team in.' }
    : thinking
      ? { cls: 'thinking', text: 'Google Gemini is deciding what your team does next.' }
      : live === false
        ? { cls: 'offline', text: 'The AI can’t be reached right now, so built-in example responses are standing in. They follow the same rules.' }
        : { cls: 'live', text: 'Live: your team’s decisions are being written by Google Gemini as you watch.' }
  return (
    <>
      <div className="px-head"><PxIcon name="question" /><b>What am I looking at?</b></div>
      <div className="px-scroll">
        <div className="px-body">
          <p><b>A simulation of {cafeName}.</b> The café, the customers and the clock are pretend, so you can see a whole day in about six minutes.</p>
          <p><b>The AI team is real.</b> When something happens, Google Gemini decides who notices, what they make (an email, a roster change, a promo) and when they need your OK. None of it is scripted.</p>
          <p><b>Each worker stands for a real tool</b> you could sign up for. Their outline and outfit are the tool’s brand colour.</p>
          <p><b>Nothing leaves this page.</b> No emails, texts or orders are actually sent.</p>
        </div>
        <p className={`px-status ${status.cls}`}><i aria-hidden /> {status.text}</p>
        <div className="px-actions">
          <button type="button" className="px-btn" onClick={onTour}>Show me around</button>
        </div>
      </div>
    </>
  )
}

function SoundPop({ muted, musicOn }) {
  return (
    <>
      <div className="px-head"><PxIcon name="note" /><b>Sound</b></div>
      <div className="px-scroll">
        <div className="px-toggles">
          <button type="button" className={`px-toggle ${muted ? '' : 'on'}`} role="switch" aria-checked={!muted} onClick={() => { sound.ensure(); music.unlock(); sound.setMuted(!muted) }}>
            <span>Café sounds</span><em>{muted ? 'Off' : 'On'}</em>
          </button>
          <button type="button" className={`px-toggle ${musicOn ? 'on' : ''}`} role="switch" aria-checked={musicOn} disabled={muted} onClick={() => { music.unlock(); music.setEnabled(!musicOn) }}>
            <span>Background music</span><em>{musicOn ? 'On' : 'Off'}</em>
          </button>
        </div>
        {muted && <p className="px-fine">Music plays only while café sounds are on.</p>}
      </div>
    </>
  )
}

/** Closing time: the day's tally, on your own vs with the team. Then the next morning starts. */
function WrapUp({ wrap, cafeName, onClose }) {
  const solo = wrap.before
  const team = wrap.after
  const active = (s) => (s.served || 0) + (s.walkouts || 0) + (s.missed || 0) > 0
  const rows = [
    { icon: '☕', label: 'Served', v: (s) => s.served || 0 },
    { icon: '😤', label: 'Walked out', v: (s) => s.walkouts || 0 },
    { icon: '⏳', label: 'Average wait', v: (s) => (s.waitN ? mmss(s.waitSum / s.waitN) : '—') },
    { icon: '📵', label: 'Missed calls', v: (s) => s.missed || 0 },
    { icon: '🕒', label: 'Your time back', v: (s) => `${s.minutes || 0}m` },
    { icon: '💰', label: 'Kept or earned', v: (s) => `$${(s.dollars || 0) + (s.waste || 0)}` },
    { icon: '✅', label: 'Asked you first', v: (s) => (s.approvalsYou || 0) + (s.approvalsAuto || 0) },
  ]
  const verdict = active(solo) && active(team)
    ? `On your own: ${solo.walkouts || 0} walk-out${solo.walkouts === 1 ? '' : 's'} and ${solo.missed || 0} missed call${solo.missed === 1 ? '' : 's'}. With the team: ${team.walkouts || 0} and ${team.missed || 0}.`
    : active(team)
      ? 'Tomorrow, try part of the morning on your own (Before) to compare.'
      : 'Tomorrow, flip to After and see what changes with your team.'
  return (
    <>
      <div className="wrap-scrim" onClick={onClose} aria-hidden />
      <div className="px-pop wrapup" role="dialog" aria-label={`Closing time, day ${wrap.day}`}>
        <div className="px-head"><PxIcon name="moon" /><b>Closing time · day {wrap.day}</b></div>
        <p className="px-sub">Here’s how today went at {cafeName}.</p>
        <table className="wrap-table">
          <thead><tr><th scope="col"><span className="sr-only">Today</span></th><th scope="col">On your own</th><th scope="col">With your team</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row"><span aria-hidden>{r.icon}</span> {r.label}</th>
                <td>{active(solo) ? r.v(solo) : '—'}</td>
                <td>{active(team) ? r.v(team) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-vs">{verdict}</p>
        <div className="px-actions"><button type="button" className="px-btn" onClick={onClose}>Start tomorrow ▸</button></div>
      </div>
    </>
  )
}

/** A small ticket in the corner of the café showing how the latest curveball is going. */
function EventTicker({ snap }) {
  let cur = null
  for (const c of CURVEBALLS) {
    const ev = snap.events?.[c.id]
    if (!ev) continue
    const fresh = !ev.endedAt || snap.t - ev.endedAt < 6
    if (fresh && (!cur || ev.startedAt > cur.ev.startedAt)) cur = { c, ev }
  }
  if (!cur) return null
  const { c, ev } = cur
  return (
    <div className={`ev-ticker st-${ev.status}`} role="status">
      <span aria-hidden>{c.icon}</span> <b>{c.title}</b> <em>{stepLabel(ev.status)}</em>
    </div>
  )
}

/** scroll so the café sits just under the sticky site nav */
function bringIntoView(el) {
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 92
  window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion() ? 'auto' : 'smooth' })
}

export default function CafeStage({ mode, onMode, selected, onToggleWorker, cafeName = 'your café', userKey = 'guest', popRequest = null, profile = {} }) {
  const { setOpenId } = useApp()
  const [images, setImages] = useState(null)
  const [error, setError] = useState(null)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(sound.muted)
  const [mus, setMus] = useState(() => music.state())
  const [inspect, setInspect] = useState(null)
  const [tip, setTip] = useState(null)
  const [snap, setSnap] = useState({ v: -1 })
  const [cool, setCool] = useState({})
  const [live, setLive] = useState(null)
  const [pop, setPop] = useState(null)
  const [caret, setCaret] = useState(40)
  const [popMax, setPopMax] = useState(520) // a popup never runs past the bottom of the café
  const [fs, setFs] = useState(false)
  const [wrap, setWrap] = useState(null)
  const docVisible = useDocVisible()
  const running = !paused && docVisible
  const runningRef = useRef(running)
  runningRef.current = running
  const controllers = useRef(new Set())
  const tipTimer = useRef(null)
  const stageRef = useRef(null)
  const canvasApi = useRef(null)
  const menuRef = useRef(null)
  const popRef = useRef(null)

  const showTip = useCallback((t) => {
    setTip(t)
    clearTimeout(tipTimer.current)
    tipTimer.current = setTimeout(() => setTip(null), 7000)
  }, [])

  // one café per owner, kept alive across tab switches (leaving the dashboard just pauses it)
  const session = useRef(null)
  const makeWorld = () => new CafeWorld({ cafeName, fixedPhase: reduceMotion() ? 0.62 : null })
  if (!session.current) session.current = getCafeSession(userKey, makeWorld)
  // a café kept from an older build of the simulation (dev hot-reload) is rebuilt rather than reused
  if (!(session.current.world instanceof CafeWorld)) {
    dropCafeSessions()
    session.current = getCafeSession(userKey, makeWorld)
  }
  const world = session.current.world
  const ui = session.current.ui
  if (import.meta.env.DEV) window.__cafe = world // handy for poking at the simulation in dev tools
  const [tourStep, setTourStepRaw] = useState(() => ui.tour ?? (tourDone(userKey) ? null : 0))
  const setTourStep = useCallback((n) => { ui.tour = n; setTourStepRaw(n) }, [ui])
  const closeTour = useCallback(() => { markTour(userKey); setTourStep(null) }, [userKey, setTourStep])

  // (re)wire the world to this mount's callbacks
  useEffect(() => {
    Object.assign(world.opts, {
      cafeName,
      sfx: (n) => sound.play(n),
      onRain: (on) => sound.setRain(on),
      onTip: (t) => showTip(t),
      isLive: () => runningRef.current,
      requestStep: async (o) => {
        const ctrl = new AbortController()
        controllers.current.add(ctrl)
        try {
          const r = await api.agentStep({ event: o.event, activeAgents: o.active, busy: o.busy, recent: o.recent, log: o.log, cafeName: world.opts.cafeName }, ctrl.signal)
          setLive(r.source === 'gemini')
          return r.step
        } catch (e) {
          if (e.name === 'AbortError') return null
          setLive(false)
          return fallbackAgentStep({ event: o.event, active: o.active.filter((a) => !o.busy.includes(a)), cafeName: world.opts.cafeName, recent: o.recent })
        } finally {
          controllers.current.delete(ctrl)
        }
      },
    })
    if (world.rainTarget > 0) sound.setRain(true)
    return () => {
      // leaving the dashboard: stop everything, but keep the café exactly as it is
      controllers.current.forEach((c) => c.abort())
      sound.setRain(false)
      clearTimeout(tipTimer.current)
      world.highlightId = null
    }
  }, [world, cafeName, showTip])

  useEffect(() => {
    let alive = true
    loadCafeImages().then((img) => alive && setImages(img)).catch((e) => setError(e.message))
    return () => { alive = false }
  }, [])

  useEffect(() => { world.setWorkers(selected) }, [world, selected])
  // the café looks like theirs: team size sets the human crew, café type the everyday rhythm
  useEffect(() => { world.setProfile({ employees: profile.employees, cafeType: profile.cafeType }) }, [world, profile.employees, profile.cafeType])
  useEffect(() => { world.setMode(mode); ui.mode = mode }, [world, mode, ui])
  useEffect(() => sound.onChange(setMuted), [])
  useEffect(() => music.onChange(setMus), [])
  // the café's music stops when you leave the dashboard
  useEffect(() => () => music.stop(), [])

  // stop the clock, the LLM heartbeat and the audio when paused or the tab is hidden
  useEffect(() => {
    if (running) {
      sound.resume()
      music.start()
    } else {
      sound.suspend()
      music.stop()
      controllers.current.forEach((c) => c.abort())
    }
  }, [running])

  // a light-weight React snapshot of the world for the bar, popups and panels
  useEffect(() => {
    let last = -1
    const id = setInterval(() => {
      if (world.version === last) return
      last = world.version
      setSnap(world.snapshot())
    }, 250)
    setSnap(world.snapshot())
    return () => clearInterval(id)
  }, [world])

  // closing time: show the day's wrap-up once per café day
  useEffect(() => {
    const w = snap.wrap
    if (!w || ui.wrapSeen === w.day) return
    ui.wrapSeen = w.day
    setWrap(w)
    setPop(null)
    sound.play('chime')
  }, [snap.wrap, ui])
  useEffect(() => {
    if (!wrap) return
    const t = setTimeout(() => setWrap(null), 30000)
    return () => clearTimeout(t)
  }, [wrap])

  // a soft café murmur under the music: busier when the queue is long, quieter in the rain
  const ambience = !running ? 0 : snap.rain ? 0.3 : Math.min(1, 0.3 + (snap.queue || 0) * 0.12)
  const ambKey = Math.round(ambience * 10)
  useEffect(() => { sound.setAmbience(ambKey / 10) }, [ambKey])
  useEffect(() => () => sound.setAmbience(0), [])

  // popups close on Esc or a click anywhere else
  useEffect(() => {
    if (!pop) return
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || popRef.current?.contains(e.target) || e.target.closest?.('.sim-badge')) return
      setPop(null)
    }
    const onKey = (e) => e.key === 'Escape' && setPop(null)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [pop])

  // the page can ask for a popup (e.g. "What am I looking at?" in the plan header)
  useEffect(() => {
    if (!popRequest) return
    bringIntoView(stageRef.current)
    setPop(popRequest.id)
  }, [popRequest])

  // the first-run tour starts with the whole café on screen
  useEffect(() => {
    if (tourStep !== 0 || !images) return
    const t = setTimeout(() => bringIntoView(stageRef.current), 350)
    return () => clearTimeout(t)
    // only when the tour (re)starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep === 0, images])

  // point the popup's little tab at the button that opened it, and keep it within the café's height
  useLayoutEffect(() => {
    if (!pop) return
    const btn = menuRef.current?.querySelector(`[data-pop="${pop}"]`)
    const bar = btn?.closest('.stage-bar')
    if (!btn || !bar) return
    const b = btn.getBoundingClientRect()
    const r = bar.getBoundingClientRect()
    setCaret(Math.max(18, r.right - 12 - (b.left + b.width / 2)))
  }, [pop, fs])

  // a popup's body scrolls inside whatever part of the café is on screen (the café clips anything past its edge)
  useLayoutEffect(() => {
    if (!pop) return
    const measure = () => {
      const stage = stageRef.current
      const bar = stage?.querySelector('.stage-bar')
      if (!bar) return
      const room = Math.min(stage.getBoundingClientRect().bottom, window.innerHeight) - bar.getBoundingClientRect().bottom
      setPopMax(Math.max(200, Math.round(room - 86)))
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure) }
  }, [pop, fs])

  // a worker lit up from the team list goes dark again when the list closes
  useEffect(() => { if (pop !== 'team') world.highlightId = null }, [pop, world])

  // full screen (where the browser allows it)
  const fsOK = typeof document !== 'undefined' && !!document.fullscreenEnabled
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement && document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else stageRef.current?.requestFullscreen?.().catch(() => showTip('Full screen isn’t available in this browser.'))
  }
  const leaveFs = () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }

  const togglePop = (id) => setPop((p) => (p === id ? null : id))

  const fire = (id) => {
    sound.ensure()
    if (cool[id]) return
    world.triggerEvent(id)
    setCool((c) => ({ ...c, [id]: true }))
    setTimeout(() => setCool((c) => ({ ...c, [id]: false })), 6000)
    if (paused) setPaused(false)
    setPop(null)
  }

  const onPick = (id) => {
    sound.ensure()
    if (id === 'cat') return world.petCat()
    if (id === 'owner') return showTip('That’s you ☕ — whenever something needs a “yes”, your team walks over to ask.')
    const person = world.actors.get(id)
    if (person && (person.kind === 'barista' || person.kind === 'crew')) return showTip(`That’s ${person.name}, one of your human staff. People, not tools: no outline.`)
    setInspect(id)
  }

  const info = inspect ? world.workerInfo(inspect) : null
  const impact = snap.impact || world.impact
  const team = selected.length
  const needsYou = selected.filter((id) => snap.workers?.[id]?.needsYou).length
  if (pop === 'log') ui.seenJournal = snap.journalN || 0
  const unread = Math.max(0, (snap.journalN || 0) - ui.seenJournal)
  const liveEvents = CURVEBALLS.filter((c) => { const ev = snap.events?.[c.id]; return ev && !['done', 'solo', 'stopped'].includes(ev.status) }).length
  const walkouts = snap.stats?.[mode]?.walkouts || 0
  const ai = mode !== 'after' ? { cls: 'idle', label: 'What is this?' }
    : snap.thinking ? { cls: 'thinking', label: 'AI thinking' }
      : live === false ? { cls: 'offline', label: 'House recipes' }
        : { cls: 'live', label: 'Live AI' }

  return (
    <section ref={stageRef} className={`stage ${mode} ${fs ? 'is-fs' : ''}`} onPointerDown={() => { sound.ensure(); music.unlock() }}>
      <div className="stage-bar">
        <div className="stage-title">
          <span className={`live-dot ${running ? '' : 'off'}`} title={running ? 'Running' : 'Paused'} />
          <b className="stage-name">{cafeName}</b>
        </div>
        <ModeToggle mode={mode} onMode={(m) => { world.setMode(m); onMode(m) }} nudge={tourStep == null} />
        <nav className="sim-menu" aria-label="Café menu" ref={menuRef}>
          <button type="button" className={`mbtn ai ${ai.cls}`} data-pop="ai" data-tour="ai" aria-expanded={pop === 'ai'} onClick={() => togglePop('ai')} title="What is this simulation?">
            <i className="ai-dot" aria-hidden />
            <span className="mbtn-label">{ai.label}</span>
          </button>
          <button type="button" className="mbtn team" data-pop="team" data-tour="team" aria-expanded={pop === 'team'} onClick={() => togglePop('team')} title="Your team" aria-label={`Your team: ${team} hired${needsYou ? `, ${needsYou} waiting for you` : ''}`}>
            <TeamFaces images={images} ids={selected} />
            <span className="mbtn-label">Team</span>
            {needsYou > 0 && <em className="mbtn-badge">{needsYou}</em>}
          </button>
          <button type="button" className="mbtn" data-pop="log" data-tour="log" aria-expanded={pop === 'log'} onClick={() => togglePop('log')} title="Café log" aria-label={`Café log${unread ? `: ${unread} new` : ''}`}>
            <PxIcon name="quill" />
            <span className="mbtn-label">Log</span>
            {unread > 0 && pop !== 'log' && <em className="mbtn-badge">{unread > 99 ? '99+' : unread}</em>}
          </button>
          <button type="button" className="mbtn" data-pop="today" aria-expanded={pop === 'today'} onClick={() => togglePop('today')} title="Today so far" aria-label="Today so far">
            <PxIcon name="sun" />
            <span className="mbtn-label">Today</span>
            {walkouts > 0 && <em className="mbtn-badge bad">{walkouts}</em>}
          </button>
          <button type="button" className="mbtn" data-pop="events" data-tour="events" aria-expanded={pop === 'events'} onClick={() => togglePop('events')} title="Throw in a curveball" aria-label="Curveballs">
            <PxIcon name="bangRed" />
            <span className="mbtn-label">Curveballs</span>
            {liveEvents > 0 && <em className="mbtn-badge">{liveEvents}</em>}
          </button>
          <span className="mbtn-gap" aria-hidden />
          <button type="button" className="mbtn icon" onClick={() => setPaused((p) => !p)} aria-pressed={paused} title={paused ? 'Resume the café' : 'Pause the café'} aria-label={paused ? 'Resume' : 'Pause'}>
            <span className={`px-pp ${paused ? 'play' : 'pause'}`} aria-hidden />
          </button>
          <button type="button" className={`mbtn icon ${muted ? 'muted' : ''}`} data-pop="sound" aria-expanded={pop === 'sound'} onClick={() => togglePop('sound')} title="Sound" aria-label="Sound settings">
            <PxIcon name={muted ? 'zzz' : 'note'} />
          </button>
          {fsOK && (
            <button type="button" className="mbtn icon" onClick={toggleFs} aria-pressed={fs} title={fs ? 'Leave full screen' : 'Full screen'} aria-label={fs ? 'Leave full screen' : 'Full screen'}>
              <PxIcon name={fs ? 'arrowDown' : 'arrowNE'} />
            </button>
          )}
        </nav>

        {pop && <div className="pop-scrim" aria-hidden />}
        {pop && (
          <div
            ref={popRef}
            className={`px-pop pop-${pop}`}
            role="dialog"
            aria-label={{ ai: 'What is this simulation?', team: 'Your team', log: 'Café log', today: 'Today so far', events: 'Curveballs', sound: 'Sound' }[pop]}
            style={{ '--caret': `${caret}px`, '--pop-max': `${popMax}px` }}
          >
            <button type="button" className="px-close" onClick={() => setPop(null)} aria-label="Close">✕</button>
            {pop === 'team' && (
              <>
                <div className="px-head"><TeamFaces images={images} ids={selected} /><b>Your team</b><span className="px-head-note">{team ? `${team} hired` : 'nobody yet'}</span></div>
                <div className="px-scroll">
                  <TeamPanel
                    selected={selected}
                    snap={snap}
                    images={images}
                    mode={mode}
                    onToggle={onToggleWorker}
                    onInspect={(id) => { if (selected.includes(id)) { setPop(null); setInspect(id) } else { leaveFs(); setOpenId(id, false) } }}
                    onDetails={(id) => { leaveFs(); setOpenId(id, false) }}
                    onHover={(id) => { world.highlightId = id }}
                  />
                </div>
              </>
            )}
            {pop === 'log' && (
              <>
                <div className="px-head"><PxIcon name="quill" /><b>Café log</b>{snap.clock && <span className="px-head-note">{snap.clock.label}</span>}</div>
                <div className="px-scroll">
                  <CafeLog world={world} snap={snap} version={snap.v} />
                </div>
              </>
            )}
            {pop === 'today' && <TodayPop snap={snap} mode={mode} onLog={() => setPop('log')} />}
            {pop === 'events' && (
              <>
                <div className="px-head"><PxIcon name="bangRed" /><b>Throw in a curveball</b></div>
                <div className="px-scroll">
                  <CurveballMenu snap={snap} mode={mode} hired={selected} cool={cool} onFire={fire} />
                </div>
              </>
            )}
            {pop === 'ai' && <AboutPop mode={mode} live={live} thinking={!!snap.thinking} cafeName={cafeName} onTour={() => { setPop(null); setTourStep(0) }} />}
            {pop === 'sound' && <SoundPop muted={muted} musicOn={mus.enabled} />}
          </div>
        )}
      </div>

      <div className="stage-body">
        <div className="stage-left">
          <div className="stage-canvas">
            <CafeCanvas
              world={world}
              images={images}
              running={running}
              apiRef={canvasApi}
              onPick={onPick}
              onApprove={(id) => { sound.ensure(); world.approve(id) }}
              onInspect={(id) => setInspect(id)}
            />
            <button type="button" className="sim-badge" onClick={() => togglePop('ai')} title="What is this simulation?">Simulation{mode === 'after' ? ' · real AI' : ''}</button>
            <EventTicker snap={snap} />
            {wrap && <WrapUp wrap={wrap} cafeName={cafeName} onClose={() => setWrap(null)} />}
            <span className="room-label front" aria-hidden>Front of house</span>
            <span className="room-label back" aria-hidden>🔒 Back office · customers never see this</span>
            {!images && <div className="stage-loading">{error ? `Couldn’t load the café art (${error})` : 'Unlocking the front door…'}</div>}
            <AnimatePresence>
              {paused && (
                <motion.button key="pz" className="stage-paused" onClick={() => setPaused(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  ⏸ Paused — tap to resume
                </motion.button>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {tip && (
                <motion.div key={tip} className="stage-tip" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <span>💡</span> {tip}
                  <button onClick={() => setTip(null)} aria-label="Dismiss tip">✕</button>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {info && (
                <>
                  <motion.div key="scrim" className="insp-scrim" onClick={() => setInspect(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                  <WorkerInspector
                    key="insp"
                    info={info}
                    images={images}
                    now={world.t}
                    impact={impact}
                    onClose={() => setInspect(null)}
                    onApprove={(id) => { sound.ensure(); world.approve(id) }}
                    onToggle={(id) => onToggleWorker(id)}
                  />
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {tourStep != null && images && tourStep < TOUR.length && (
        <CafeTour step={tourStep} setStep={setTourStep} onClose={closeTour} snap={snap} stageRef={stageRef} canvasApi={canvasApi} world={world} />
      )}
    </section>
  )
}
