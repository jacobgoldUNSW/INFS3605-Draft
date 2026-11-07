import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp, planKey } from '../../state'
import { api } from '../../api'
import IconTile from '../ui/IconTile'
import Icon from '../ui/Icon'
import { getProduct as tool, PRODUCTS } from '../../data/products'
import AnimatedNumber from '../ui/AnimatedNumber'
import BeaThread from './BeaThread'
import BeaAvatar from './BeaAvatar'
import { planTurn } from './planGuided'

const ease = [0.22, 1, 0.36, 1]
let uid = 0
const nextId = () => `a${Date.now().toString(36)}${++uid}`
const toTranscript = (msgs) => msgs.map((m) => ({ from: m.from, text: m.text }))
const money = (n) => `$${Math.round(n).toLocaleString()}`
// payback in weeks, worked out the same way as on the plan
const weeksOf = (s) => (s?.net > 0 ? `${Math.max(1, Math.ceil(((s.bill * 2) / s.net) * 4.33))} wks` : '—')
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }

// "Show me the costs", "take me to setup", "open Xero": Bea moves you around the app, even offline
const NAV_VERB = /^(please\s+)?(can you\s+|could you\s+)?(show|open|take me|go to|go back to|bring up|jump to|let me see|can i see|i want to see|where('s| is| are)|find)\b/i
const PLACES = [
  { re: /\b(cost|costs|price|prices|pricing|bill|spend|how much)\b/i, page: 'plan', sub: 'costs', say: 'Here’s what it all costs, tool by tool, and when it pays for itself.' },
  { re: /\b(set ?up|setup|install|steps|calendar|get started)\b/i, page: 'plan', sub: 'setup', say: 'Here are your setup steps, in the order I’d go.' },
  { re: /\b(risks?|reality checks?|downsides?|privacy|catch)\b/i, page: 'plan', sub: 'checks', say: 'Here are the reality checks for your plan.' },
  { re: /\b(caf[eé] view|simulation|my caf[eé]|see it running|watch)\b/i, page: 'plan', sub: 'cafe', say: 'Here’s a day at your café with these tools.' },
  { re: /\b(overview|summary|my plan|the plan|numbers)\b/i, page: 'plan', sub: 'overview', say: 'Here’s the short version of your plan.' },
  { re: /\b(pantry|all (the )?tools|other tools|browse)\b/i, page: 'pantry', sub: null, say: 'Here’s every tool in the AI Pantry.' },
  { re: /\bhome\b/i, page: 'home', sub: null, say: 'Back to the home page.' },
]
export function placeFor(text) {
  const t = String(text || '').trim()
  if (!NAV_VERB.test(t)) return null
  const named = PRODUCTS.find((p) => new RegExp(`\\b${p.name.split(' ').pop().replace('.', '\\.')}\\b`, 'i').test(t))
  if (named && !/\b(cost|price|setup|risk)/i.test(t)) return { page: 'pantry', sub: named.id, say: `Here’s ${named.name}: what it does, what it costs, and its risks.` }
  return PLACES.find((pl) => pl.re.test(t)) || null
}

function greeting(bill) {
  const target = Math.max(50, Math.floor((bill * 0.6) / 50) * 50)
  return {
    text: 'Hi again. I can tweak this plan with you: make it cheaper, swap a tool, explain a number, or plan when to set things up. You can also ask me to show you any part of your plan. Nothing changes unless you say yes.',
    quickReplies: [bill > 100 ? `Get it under $${target} a month` : 'Is this the cheapest way?', 'Do I need all of these?', 'Plan my setup around my week', 'Show me the costs'],
  }
}

/** A proposed change to the tools, written up like a café docket: crossed out, stamped in, and the new numbers. */
function ChangeDocket({ p, state, onAccept, onDismiss, onUndo }) {
  const rows = [
    { k: 'bill', label: 'Monthly bill', a: money(p.before.bill), b: p.after.bill, fmt: money },
    { k: 'hours', label: 'Hours back a week', a: p.before.hours, b: p.after.hours, fmt: (n) => Math.round(n) },
    { k: 'gain', label: 'Likely better off', a: p.before.net > 0 ? `${money(p.before.range[0])}–${money(p.before.range[1])}` : 'time only', text: p.after.net > 0 ? `${money(p.after.range[0])}–${money(p.after.range[1])}` : 'time only' },
    { k: 'payback', label: 'Pays for itself', a: weeksOf(p.before), text: weeksOf(p.after) },
  ]
  return (
    <motion.div className={`docket-card ${state}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.3 }}>
      <div className="dk-head"><span>Proposed change</span><i aria-hidden /></div>
      <ul className="dk-tools">
        {p.remove.map((id) => {
          const t = tool(id)
          return (
            <li key={`r${id}`} className="out" style={{ '--a': t.from, '--b': t.to }}>
              <span className="dk-sign" aria-hidden>−</span>
              <span className="dk-face"><IconTile p={t} size={30} /></span>
              <span className="dk-name"><s>{t.name}</s><small>{t.priceLabel}</small></span>
            </li>
          )
        })}
        {p.add.map((id, i) => {
          const t = tool(id)
          return (
            <motion.li key={`a${id}`} className="in" style={{ '--a': t.from, '--b': t.to }} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.5 + i * 0.1 }}>
              <span className="dk-sign" aria-hidden>+</span>
              <span className="dk-face"><IconTile p={t} size={30} /></span>
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
              <td className="arrow" aria-hidden><Icon name="arrowRight" size={14} /></td>
              <td className="now">{r.text ?? <AnimatedNumber value={r.b} format={r.fmt} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {p.overlaps?.length > 0 && <p className="dk-note">Heads up: {p.overlaps.join(' ')}</p>}
      <AnimatePresence mode="wait" initial={false}>
        {state === 'pending' && (
          <motion.div key="ask" className="dk-actions" exit={{ opacity: 0 }}>
            <motion.button type="button" className="btn btn-primary btn-sm" onClick={onAccept}>Accept</motion.button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={onDismiss}>Not now</button>
          </motion.div>
        )}
        {state === 'accepted' && (
          <motion.div key="done" className="dk-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <span className="dk-stamp"><Icon name="check" size={15} /> Added to your plan</span>
            {onUndo && <button type="button" className="link small" onClick={onUndo}>Undo</button>}
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
    <motion.div className={`docket-card ${state}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.3 }}>
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
            <motion.button type="button" className="btn btn-primary btn-sm" onClick={onAccept}>Add to my plan</motion.button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={onDismiss}>Not now</button>
          </motion.div>
        )}
        {state === 'accepted' && (
          <motion.div key="done" className="dk-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <span className="dk-stamp"><Icon name="check" size={15} /> On your plan</span>
          </motion.div>
        )}
        {state === 'dismissed' && <motion.p key="no" className="dk-quiet" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Left as it was.</motion.p>}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * "Ask Bea" on the plan page: a drawer where the owner talks to Bea. She can compare tools, explain the
 * numbers, and propose changes to the plan or a setup schedule. Proposals only apply on Accept.
 */
export default function AskBea({ open, onClose, listenSignal = 0, setupCards = [], bill = 0 }) {
  const { survey, selected, setSelected, geminiPlan, setGeminiPlan, beaChat, setBeaChat, showToast, navigate } = useApp()
  const [busy, setBusy] = useState(false)
  const [states, setStates] = useState({}) // proposal message id → pending · accepted · dismissed · undone
  const [undo, setUndo] = useState(null)
  const [messages, setMessages] = useState(() => {
    const saved = beaChat.plan || []
    if (saved.length) return saved.map((m) => ({ ...m, id: nextId(), fresh: false }))
    return [{ id: nextId(), from: 'bea', ...greeting(bill), fresh: true }]
  })
  const ctrl = useRef(null)
  // without the AI, Bea answers the everyday asks herself (see planGuided.js)
  const offline = useRef(false)
  useEffect(() => { api.health().then((h) => { if (!h.gemini) offline.current = true }).catch(() => {}) }, [])
  const answerLocally = (text, withOwner) => {
    const r = planTurn(text, { survey, selected, setupCards })
    const b = { id: nextId(), from: 'bea', text: r.text, quickReplies: r.quickReplies || [], proposal: r.proposal || null, fresh: true }
    const all = [...withOwner, b]
    setMessages(all)
    if (b.proposal) setStates((st) => ({ ...st, [b.id]: 'pending' }))
    setBeaChat((c) => ({ ...c, plan: toTranscript(all).slice(-40) }))
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 10000)
    return () => clearTimeout(t)
  }, [undo])

  const send = async (text) => {
    const before = messages.map((m) => ({ ...m, fresh: false }))
    const withOwner = [...before, { id: nextId(), from: 'owner', text, fresh: true }]
    // "show me the costs": move there straight away, no AI needed
    const place = placeFor(text)
    if (place) {
      const all = [...withOwner, { id: nextId(), from: 'bea', text: place.say, fresh: true }]
      setMessages(all)
      setBeaChat((c) => ({ ...c, plan: toTranscript(all).slice(-40) }))
      navigate(place.page, place.sub)
      return
    }
    setMessages(withOwner)
    setBusy(true)
    if (offline.current) {
      setTimeout(() => { answerLocally(text, withOwner); setBusy(false) }, 600)
      return
    }
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const r = await api.beaPlan({ transcript: toTranscript(before), message: text, survey, selected, setupCards }, ctrl.current.signal)
      const b = { id: nextId(), from: 'bea', text: r.reply?.text || 'Hmm, could you say that another way?', quickReplies: r.reply?.quickReplies || [], multiSelect: !!r.reply?.multiSelect, proposal: r.proposal || null, fresh: true }
      const all = [...withOwner, b]
      setMessages(all)
      if (b.proposal) setStates((st) => ({ ...st, [b.id]: 'pending' }))
      setBeaChat((c) => ({ ...c, plan: toTranscript(all).slice(-40) }))
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 429) setMessages([...withOwner, { id: nextId(), from: 'bea', text: 'Give me a second, then ask again?', fresh: true }])
      else { offline.current = true; answerLocally(text, withOwner) }
    } finally {
      setBusy(false)
    }
  }

  const rewritePlan = async (next) => {
    try {
      const r = await api.personalise({ survey, selected: next })
      setGeminiPlan({ ...r.plan, key: planKey(survey, next) })
    } catch { /* the standard plan shows until the next update */ }
  }

  const acceptChange = (m) => {
    const prev = { selected, geminiPlan }
    setSelected(m.proposal.selected)
    setStates((st) => ({ ...st, [m.id]: 'accepted' }))
    setUndo({ id: m.id, ...prev })
    showToast('Plan updated. Bea is rewriting the details', 'refresh')
    rewritePlan(m.proposal.selected)
  }
  const undoChange = () => {
    if (!undo) return
    setSelected(undo.selected)
    setGeminiPlan(undo.geminiPlan)
    setStates((st) => ({ ...st, [undo.id]: 'undone' }))
    setUndo(null)
    showToast('Undone: your plan is back how it was', 'refresh')
  }
  const acceptSchedule = (m) => {
    setBeaChat((c) => ({ ...c, schedule: { timeOfDay: m.proposal.timeOfDay, sessions: m.proposal.sessions } }))
    setStates((st) => ({ ...st, [m.id]: 'accepted' }))
    showToast('Setup dates added to your plan', 'calendar')
  }
  const dismiss = (m) => setStates((st) => ({ ...st, [m.id]: 'dismissed' }))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="askbea-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} aria-hidden />
          <motion.section
            key="drawer"
            className="askbea"
            role="dialog"
            aria-label="Talk to Bea about your plan"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.42, ease }}
          >
            <header className="chat-head">
              <BeaAvatar size={40} thinking={busy} />
              <span className="chat-who"><b>Bea</b><small>{busy ? 'Having a look…' : 'Your Cafinity advisor'}</small></span>
              <button type="button" className="askbea-close" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
            </header>
            <BeaThread
              messages={messages}
              busy={busy}
              onSend={send}
              autoFocus
              listenSignal={listenSignal}
              placeholder="Ask Bea, or say “show me the costs”"
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
  )
}
