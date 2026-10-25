import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp, planKey } from '../../state'
import { api } from '../../api'
import { getProduct } from '../../data/products'
import { Portrait } from '../cafe/WorkerInspector'
import { useCafeImages } from '../../sim/useCafeImages'
import AnimatedNumber from '../ui/AnimatedNumber'
import BeaThread from './BeaThread'
import BeaAvatar from './BeaAvatar'

const ease = [0.22, 1, 0.36, 1]
let uid = 0
const nextId = () => `a${Date.now().toString(36)}${++uid}`
const toTranscript = (msgs) => msgs.map((m) => ({ from: m.from, text: m.text }))
const money = (n) => `$${Math.round(n).toLocaleString()}`
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
const SEEN_KEY = 'brewmind.askbea.seen'
const seen = () => { try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return true } }
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1') } catch { /* private mode */ } }

function greeting(bill) {
  const target = Math.max(50, Math.floor((bill * 0.6) / 50) * 50)
  return {
    text: 'Hi again! I can tweak this plan with you: make it cheaper, swap a tool, explain a number, or plan when to set things up. Nothing changes unless you say yes.',
    quickReplies: [bill > 100 ? `Get it under $${target} a month` : 'Is this the cheapest way?', 'Do I need all of these?', 'Plan my setup around my week', 'Explain my numbers'],
  }
}

/** A proposed change to the tools, written up like a café docket: crossed out, stamped in, and the new numbers. */
function ChangeDocket({ p, state, onAccept, onDismiss, onUndo }) {
  const images = useCafeImages()
  const rows = [
    { k: 'bill', label: 'Monthly bill', a: money(p.before.bill), b: p.after.bill, fmt: money },
    { k: 'hours', label: 'Hours back a week', a: p.before.hours, b: p.after.hours, fmt: (n) => Math.round(n) },
    { k: 'gain', label: 'Likely better off', a: p.before.net > 0 ? `${money(p.before.range[0])}–${money(p.before.range[1])}` : 'time only', text: p.after.net > 0 ? `${money(p.after.range[0])}–${money(p.after.range[1])}` : 'time only' },
    { k: 'payback', label: 'Pays for itself', a: p.before.payback ? `${p.before.payback} mo` : '—', text: p.after.payback ? `${p.after.payback} mo` : '—' },
  ]
  return (
    <motion.div className={`docket-card ${state}`} initial={{ opacity: 0, y: 12, rotate: -0.6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.5, ease, delay: 0.3 }}>
      <div className="dk-head"><span>Proposed change</span><i aria-hidden /></div>
      <ul className="dk-tools">
        {p.remove.map((id) => {
          const t = getProduct(id)
          return (
            <li key={`r${id}`} className="out" style={{ '--a': t.from, '--b': t.to }}>
              <span className="dk-sign" aria-hidden>−</span>
              <span className="dk-face"><Portrait images={images} sprite={id} size={32} /></span>
              <span className="dk-name"><s>{t.name}</s><small>{t.priceLabel}</small></span>
            </li>
          )
        })}
        {p.add.map((id, i) => {
          const t = getProduct(id)
          return (
            <motion.li key={`a${id}`} className="in" style={{ '--a': t.from, '--b': t.to }} initial={{ scale: 1.25, rotate: -4, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.55 + i * 0.12 }}>
              <span className="dk-sign" aria-hidden>+</span>
              <span className="dk-face"><Portrait images={images} sprite={id} size={32} /></span>
              <span className="dk-name"><b>{t.name}</b><small>{t.priceLabel}</small></span>
            </motion.li>
          )
        })}
      </ul>
      <table className="dk-nums">
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <th scope="row">{r.label}</th>
              <td className="was">{r.a}</td>
              <td className="arrow" aria-hidden>→</td>
              <td className="now">{r.text ?? <AnimatedNumber value={r.b} format={r.fmt} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {p.overlaps?.length > 0 && <p className="dk-note">Heads up: {p.overlaps.join(' ')}</p>}
      <AnimatePresence mode="wait" initial={false}>
        {state === 'pending' && (
          <motion.div key="ask" className="dk-actions" exit={{ opacity: 0 }}>
            <motion.button type="button" className="btn primary" onClick={onAccept} whileTap={{ scale: 0.95 }}>Accept</motion.button>
            <button type="button" className="btn ghost" onClick={onDismiss}>Not now</button>
          </motion.div>
        )}
        {state === 'accepted' && (
          <motion.div key="done" className="dk-done" initial={{ opacity: 0, scale: 1.2, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: -2 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }}>
            <span className="dk-stamp">Added to your plan ✓</span>
            {onUndo && <button type="button" className="link-btn" onClick={onUndo}>Undo</button>}
          </motion.div>
        )}
        {state === 'dismissed' && <motion.p key="no" className="dk-quiet" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Left as it was.</motion.p>}
        {state === 'undone' && <motion.p key="undo" className="dk-quiet" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Undone: your plan is back how it was.</motion.p>}
      </AnimatePresence>
    </motion.div>
  )
}

const byWeek = (sessions) => {
  const weeks = new Map()
  for (const s of sessions) weeks.set(s.week, [...(weeks.get(s.week) || []), s])
  return [...weeks.entries()].sort((a, b) => a[0] - b[0])
}

/** A proposed setup schedule around the owner's free days. */
function ScheduleDocket({ p, state, onAccept, onDismiss }) {
  return (
    <motion.div className={`docket-card ${state}`} initial={{ opacity: 0, y: 12, rotate: 0.6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.5, ease, delay: 0.3 }}>
      <div className="dk-head"><span>Setup calendar</span><i aria-hidden /></div>
      <ol className="dk-weeks">
        {byWeek(p.sessions).map(([week, list]) => (
          <li key={week}>
            <b>Week {week}</b>
            {list.map((s) => (
              <span key={`${s.toolId}${s.day}`} className="dk-session"><em>{DAY_NAMES[s.day]} {p.timeOfDay}</em> · {s.tool}, {s.minutes} min<small>{s.what}</small></span>
            ))}
          </li>
        ))}
      </ol>
      <AnimatePresence mode="wait" initial={false}>
        {state === 'pending' && (
          <motion.div key="ask" className="dk-actions" exit={{ opacity: 0 }}>
            <motion.button type="button" className="btn primary" onClick={onAccept} whileTap={{ scale: 0.95 }}>Add to my plan</motion.button>
            <button type="button" className="btn ghost" onClick={onDismiss}>Not now</button>
          </motion.div>
        )}
        {state === 'accepted' && (
          <motion.div key="done" className="dk-done" initial={{ opacity: 0, scale: 1.2, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: -2 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }}>
            <span className="dk-stamp">On your plan ✓</span>
          </motion.div>
        )}
        {state === 'dismissed' && <motion.p key="no" className="dk-quiet" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Left as it was.</motion.p>}
      </AnimatePresence>
    </motion.div>
  )
}

/** The setup calendar Bea planned, shown with the setup cards on the plan. */
export function SetupCalendar() {
  const { beaChat, setBeaChat, selected } = useApp()
  const sessions = (beaChat.schedule?.sessions || []).filter((s) => selected.includes(s.toolId))
  if (!sessions.length) return null
  return (
    <motion.div className="setup-cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
      <div className="setup-cal-head">
        <BeaAvatar size={34} />
        <span><span className="script-note">planned with Bea</span><b>Your setup calendar</b></span>
        <button type="button" className="link-btn" onClick={() => setBeaChat((c) => ({ ...c, schedule: null }))}>Clear</button>
      </div>
      <ol className="setup-cal-weeks">
        {byWeek(sessions).map(([week, list]) => (
          <li key={week}>
            <b>Week {week}</b>
            {list.map((s) => {
              const p = getProduct(s.toolId)
              return (
                <span key={`${s.toolId}${s.day}`} className="setup-cal-item" style={{ '--a': p?.from, '--b': p?.to }}>
                  <em>{DAY_NAMES[s.day]} {beaChat.schedule.timeOfDay}</em>
                  <strong>{s.tool} · {s.minutes} min</strong>
                  <small>{s.what}</small>
                </span>
              )
            })}
          </li>
        ))}
      </ol>
    </motion.div>
  )
}

/**
 * "Ask Bea" on the plan page: a drawer where the owner talks to Bea. She can compare tools, explain the
 * numbers, and propose changes to the plan or a setup schedule. Proposals only apply on Accept.
 */
export default function AskBea({ setupCards = [], bill = 0 }) {
  const { survey, selected, setSelected, geminiPlan, setGeminiPlan, beaChat, setBeaChat, showToast } = useApp()
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(() => !seen())
  const [busy, setBusy] = useState(false)
  const [states, setStates] = useState({}) // proposal message id → pending · accepted · dismissed · undone
  const [undo, setUndo] = useState(null)
  const [messages, setMessages] = useState(() => {
    const saved = beaChat.plan || []
    if (saved.length) return saved.map((m) => ({ ...m, id: nextId(), fresh: false }))
    return [{ id: nextId(), from: 'bea', ...greeting(bill), fresh: true }]
  })
  const ctrl = useRef(null)
  const launcher = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 10000)
    return () => clearTimeout(t)
  }, [undo])

  const openDrawer = () => { setOpen(true); setHint(false); markSeen() }

  const send = async (text) => {
    const before = messages.map((m) => ({ ...m, fresh: false }))
    const withOwner = [...before, { id: nextId(), from: 'owner', text, fresh: true }]
    setMessages(withOwner)
    setBusy(true)
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const r = await api.beaPlan({ transcript: toTranscript(before), message: text, survey, selected, setupCards }, ctrl.current.signal)
      const bea = { id: nextId(), from: 'bea', text: r.reply?.text || 'Hmm, could you say that another way?', quickReplies: r.reply?.quickReplies || [], multiSelect: !!r.reply?.multiSelect, proposal: r.proposal || null, fresh: true }
      const all = [...withOwner, bea]
      setMessages(all)
      if (bea.proposal) setStates((s) => ({ ...s, [bea.id]: 'pending' }))
      setBeaChat((c) => ({ ...c, plan: toTranscript(all).slice(-40) }))
    } catch (e) {
      if (e.name === 'AbortError') return
      const t = e.status === 429 ? 'Give me a second to catch my breath, then ask again?' : 'Sorry, I’ve stepped away for a moment. You can still change tools with “Edit survey or swap tools” at the top of your plan.'
      setMessages([...withOwner, { id: nextId(), from: 'bea', text: t, fresh: true }])
    } finally {
      setBusy(false)
    }
  }

  const rewritePlan = async (next) => {
    try {
      const r = await api.personalise({ survey, selected: next })
      setGeminiPlan({ ...r.plan, key: planKey(survey, next) })
    } catch { /* the house-recipe plan shows until the next brew */ }
  }

  const acceptChange = (m) => {
    const prev = { selected, geminiPlan }
    setSelected(m.proposal.selected)
    setStates((s) => ({ ...s, [m.id]: 'accepted' }))
    setUndo({ id: m.id, ...prev })
    showToast('Plan updated. Bea’s rewriting the details', '✨')
    rewritePlan(m.proposal.selected)
  }
  const undoChange = () => {
    if (!undo) return
    setSelected(undo.selected)
    setGeminiPlan(undo.geminiPlan)
    setStates((s) => ({ ...s, [undo.id]: 'undone' }))
    setUndo(null)
    showToast('Undone: your plan is back how it was', '↩️')
  }
  const acceptSchedule = (m) => {
    setBeaChat((c) => ({ ...c, schedule: { timeOfDay: m.proposal.timeOfDay, sessions: m.proposal.sessions } }))
    setStates((s) => ({ ...s, [m.id]: 'accepted' }))
    showToast('Setup calendar added to your plan', '🗓️')
  }
  const dismiss = (m) => setStates((s) => ({ ...s, [m.id]: 'dismissed' }))

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launch"
            ref={launcher}
            type="button"
            className="askbea-launch"
            onClick={openDrawer}
            aria-label="Ask Bea about your plan"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.4 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence>
              {hint && (
                <motion.span key="hint" className="askbea-hint" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ delay: 1.2, duration: 0.5, ease }}>
                  Questions about your plan? <b>Ask me</b>
                </motion.span>
              )}
            </AnimatePresence>
            <BeaAvatar size={52} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div key="scrim" className="askbea-scrim" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} aria-hidden />
            <motion.section
              key="drawer"
              className="askbea"
              role="dialog"
              aria-label="Ask Bea about your plan"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <header className="chat-head">
                <BeaAvatar size={44} thinking={busy} />
                <span className="chat-who"><b>Bea</b><small>{busy ? 'having a look…' : 'tweaking your plan with you'}</small></span>
                <button type="button" className="askbea-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
              </header>
              <BeaThread
                messages={messages}
                busy={busy}
                onSend={send}
                autoFocus
                placeholder="Ask Bea about your plan"
                renderExtra={(m) => {
                  if (m.proposal?.kind === 'change') return <ChangeDocket p={m.proposal} state={states[m.id] || 'dismissed'} onAccept={() => acceptChange(m)} onDismiss={() => dismiss(m)} onUndo={undo?.id === m.id ? undoChange : null} />
                  if (m.proposal?.kind === 'schedule') return <ScheduleDocket p={m.proposal} state={states[m.id] || 'dismissed'} onAccept={() => acceptSchedule(m)} onDismiss={() => dismiss(m)} />
                  return null
                }}
              />
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
