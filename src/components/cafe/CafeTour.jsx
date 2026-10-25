import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WORLD_W } from '../../sim/assets'

/**
 * First-run tour of the café: a spotlight walks you through the six things that matter.
 * Some steps wait for you to actually do the thing (flip to After, throw a curveball, approve).
 */
export const TOUR = [
  {
    id: 'owner', target: { actor: 'owner' },
    title: 'This is your café, simulated — just you for now',
    body: 'The café and its customers are pretend, but the AI team you’re about to meet makes real decisions using Google Gemini. Right now you’re on the till, the phone and the paperwork. When the queue gets long, people walk out.',
  },
  {
    id: 'flip', target: { sel: '[data-tour="after"]' }, wait: (s) => s.mode === 'after',
    title: 'Bring in your AI team',
    body: 'Tap “After”. Each worker walks in the front door, says hello, and heads to their station.',
    hint: 'Tap “After” to continue',
  },
  {
    id: 'worker', target: { worker: true }, minWait: 3,
    title: 'Every worker is a real tool',
    body: 'A coloured outline means AI. Tap anyone, here or under “Team” in the café menu, to see what they’re working on and what the tool costs.',
  },
  {
    // the Rain docket once the Curveballs menu is open, the menu button until then
    id: 'event', target: { sel: ['[data-docket="rain"]', '[data-tour="events"]'] }, wait: (s) => Object.keys(s.events || {}).length > 0,
    title: 'Throw them a curveball',
    body: 'Open “Curveballs” in the café menu and throw Rain. Then watch who notices, who they hand it to, and what they make.',
    hint: 'Open Curveballs, then tap Rain',
  },
  {
    id: 'ask', target: { sel: '.cb-ask' }, wait: (s, st) => st.sawAsk && s.approvals === 0, fallbackAfter: 35,
    title: 'You’re still the boss',
    body: 'Anything that spends money or talks to customers waits for your OK. Approve it, inspect it first — or if you’re flat out, it auto-approves after 15 seconds.',
    hint: 'Waiting for a worker to ask you something…',
  },
  {
    id: 'log', target: { sel: '[data-tour="log"]' },
    title: 'See everything they did',
    body: 'Open “Log” in the café menu. Every hand-off, decision and result is there, with running totals for solo vs. with your team.',
    last: true,
  },
]

const PAD = 8

export default function CafeTour({ step, setStep, onClose, snap, stageRef, canvasApi, world }) {
  const s = TOUR[step]
  const holeRef = useRef(null)
  const ringRef = useRef(null)
  const cardRef = useRef(null)
  const stRef = useRef({ startedAt: performance.now(), sawAsk: false })
  const [canNext, setCanNext] = useState(!s?.wait)

  // reset per step
  useEffect(() => {
    stRef.current = { startedAt: performance.now(), sawAsk: false }
    setCanNext(!s?.wait && !s?.minWait)
    if (s?.minWait) {
      const t = setTimeout(() => setCanNext(true), s.minWait * 1000)
      return () => clearTimeout(t)
    }
  }, [step, s])

  // advance automatically when the waited-for thing happens
  useEffect(() => {
    if (!s?.wait) return
    if (s.id === 'ask' && snap.approvals > 0) stRef.current.sawAsk = true
    if (s.wait(snap, stRef.current)) setStep(step + 1)
    else if (s.fallbackAfter && (performance.now() - stRef.current.startedAt) / 1000 > s.fallbackAfter) setCanNext(true)
  }, [snap, s, step, setStep])

  // who's on shift, read inside the animation loop without restarting it every snapshot
  const presentRef = useRef(snap.present)
  presentRef.current = snap.present
  // where this step's caption sits. It is placed once per step and then stays put: the spotlight
  // follows moving characters, but a card (and its buttons) that slides around can't be clicked.
  const place = useRef({ step: -1, pos: null, anchored: false, sw: 0, sh: 0, scrolled: false })
  const hovering = useRef(false)

  useLayoutEffect(() => {
    if (!s) return
    let raf
    const P = place.current
    if (P.step !== step) Object.assign(P, { step, pos: null, anchored: false, scrolled: false })
    const find = () => {
      const stage = stageRef.current
      if (!stage) return null
      if (s.target.sel) {
        const sels = [].concat(s.target.sel)
        let el = null
        for (const sel of sels) { el = stage.querySelector(sel) || document.querySelector(sel); if (el) break }
        if (!el) return null
        // the target changed (e.g. a menu opened): place the caption again next to the new one
        if (P.el && P.el !== el) P.anchored = false
        P.el = el
        if (!P.scrolled) {
          P.scrolled = true
          const r0 = el.getBoundingClientRect()
          if (r0.top < 80 || r0.bottom > window.innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
        return el.getBoundingClientRect()
      }
      // a worker you can actually see: on shift first, otherwise whoever is walking in on screen
      const visible = (w) => { const a = world.actors.get(w); return a && (a.alpha ?? 1) > 0.5 && a.x > 12 && a.x < WORLD_W - 12 && a.y > 20 }
      const id = s.target.actor || (s.target.worker && [...(presentRef.current || []), ...(world.workers || [])].find(visible))
      const a = id && world.actors.get(id)
      if (!a || !canvasApi.current) return null
      const p = canvasApi.current.toScreen(a.x, a.y)
      if (!p) return null
      return { left: p.x - 18 * p.k, top: p.y - 54 * p.k, width: 36 * p.k, height: 58 * p.k }
    }
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const stage = stageRef.current
      const hole = holeRef.current
      const ring = ringRef.current
      const card = cardRef.current
      if (!stage || !hole || !card) return
      const sr = stage.getBoundingClientRect()
      const cw = card.offsetWidth
      const ch = card.offsetHeight
      const resized = Math.abs(P.sw - sr.width) > 4 || Math.abs(P.sh - sr.height) > 4
      const r = find()
      if (r) {
        const x = r.left - sr.left - PAD
        const y = r.top - sr.top - PAD
        const w = r.width + PAD * 2
        const h = r.height + PAD * 2
        hole.setAttribute('x', x)
        hole.setAttribute('y', y)
        hole.setAttribute('width', w)
        hole.setAttribute('height', h)
        ring.style.opacity = 1
        ring.style.transform = `translate(${x}px, ${y}px)`
        ring.style.width = `${w}px`
        ring.style.height = `${h}px`
        // first sighting of the target (or a resize): put the caption below it if there's room, else above
        if ((!P.anchored || resized) && !hovering.current) {
          let cy = y + h + 12
          if (cy + ch > sr.height - 8) cy = y - ch - 12
          cy = Math.max(8, Math.min(sr.height - ch - 8, cy))
          const cx = Math.max(10, Math.min(sr.width - cw - 10, x + w / 2 - cw / 2))
          Object.assign(P, { pos: [cx, cy], anchored: true, sw: sr.width, sh: sr.height })
        }
      } else {
        hole.setAttribute('width', 0)
        hole.setAttribute('height', 0)
        ring.style.opacity = 0
        // nothing to point at yet (e.g. waiting for a worker to ask): park the caption mid-stage
        if ((!P.pos || resized) && !hovering.current) {
          Object.assign(P, { pos: [Math.max(12, sr.width / 2 - cw / 2), Math.max(70, sr.height * 0.32)], anchored: false, sw: sr.width, sh: sr.height })
        }
      }
      if (P.pos) card.style.transform = `translate(${P.pos[0]}px, ${P.pos[1]}px)`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [s, step, stageRef, canvasApi, world])

  if (!s) return null
  return (
    <div className="tour" aria-live="polite">
      <svg className="tour-dim" width="100%" height="100%" aria-hidden>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="#fff" />
            <rect ref={holeRef} rx="14" ry="14" fill="#000" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(28, 16, 12, 0.5)" mask="url(#tour-mask)" />
      </svg>
      <div ref={ringRef} className="tour-ring" aria-hidden />
      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-label={`Tour step ${step + 1} of ${TOUR.length}: ${s.title}`}
        onPointerEnter={() => { hovering.current = true }}
        onPointerLeave={() => { hovering.current = false }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            <div className="tour-top">
              <span className="tour-count">{step + 1} / {TOUR.length}</span>
              <span className="tour-dots">{TOUR.map((t, i) => <i key={t.id} className={i === step ? 'on' : i < step ? 'past' : ''} />)}</span>
            </div>
            <h5>{s.title}</h5>
            <p>{s.body}</p>
            <div className="tour-actions">
              <button className="tour-skip" onClick={onClose}>{s.last ? 'Close' : 'Skip tour'}</button>
              {canNext ? (
                <button className="tour-next" onClick={() => (s.last ? onClose() : setStep(step + 1))}>{s.last ? 'Got it ✓' : 'Next →'}</button>
              ) : (
                <span className="tour-hint"><i className="dots"><b /><b /><b /></i> {s.hint || 'Have a look around…'}</span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
