import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { api } from '../../api'
import { getProduct } from '../../data/products'
import { EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS } from '../../data/mockDashboard'
import AnimatedNumber from '../ui/AnimatedNumber'
import IconTile from '../ui/IconTile'
import Icon from '../ui/Icon'
import BeaThread from './BeaThread'
import BeaAvatar from './BeaAvatar'
import { voiceSupport } from '../../voice/useVoice'
import { guidedTurn } from './guided'

const ease = [0.22, 1, 0.36, 1]
let uid = 0
const nextId = () => `m${Date.now().toString(36)}${++uid}`
const toTranscript = (msgs) => msgs.map((m) => ({ from: m.from, text: m.text }))
const label = (arr, id) => arr.find((x) => x.id === id)
const money = (n) => `$${Math.round(n).toLocaleString('en-AU')}`

function opening(survey) {
  const name = survey.name?.trim()
  if (name) {
    return {
      text: `Hi, I’m Bea, Cafinity’s café advisor. Lovely to meet you, ${name}. I’ll ask a few quick questions, then suggest a couple of tools that fit and show you what they’d save. First up: how many people are on your team, you included?`,
      quickReplies: EMPLOYEE_OPTIONS.map((o) => `${o.label} people`),
    }
  }
  return { text: 'Hi, I’m Bea, Cafinity’s café advisor. I’ll ask a few quick questions, then suggest a couple of tools that fit. First up: what’s your café called?', quickReplies: [] }
}

/** What Bea has noted so far. Each line fills in as she learns it. */
function SoFar({ survey, onUseForm }) {
  const rows = [
    { k: 'name', icon: 'store', label: 'Café', value: survey.name?.trim() },
    { k: 'employees', icon: 'people', label: 'Team', value: label(EMPLOYEE_OPTIONS, survey.employees) && `${label(EMPLOYEE_OPTIONS, survey.employees).label} people` },
    { k: 'revenue', icon: 'coins', label: 'Sales a year', value: label(REVENUE_OPTIONS, survey.revenue)?.label },
    { k: 'cafeType', icon: 'cup', label: 'Style', value: label(CAFE_TYPES, survey.cafeType)?.label },
    { k: 'goal', icon: 'flag', label: 'Main goal', value: label(PRIMARY_GOALS, survey.goal)?.label },
    { k: 'pains', icon: 'clock', label: 'Time sinks', value: (survey.pains || []).map((p) => label(PAIN_POINTS, p)?.label).filter(Boolean).join(', ') },
    { k: 'tech', icon: 'bolt', label: 'With tech', value: label(TECH_LEVELS, survey.tech)?.label },
    { k: 'rant', icon: 'quote', label: 'In your words', value: survey.rant?.trim() && `“${survey.rant.trim()}”`, optional: true },
  ]
  const need = rows.filter((r) => !r.optional)
  const have = need.filter((r) => r.value).length
  return (
    <aside className="sofar" aria-label="Your café, as Bea has noted it">
      <div className="sofar-head">
        <span className="label">Your café so far</span>
        <span className="sofar-count num">{have} of {need.length}</span>
      </div>
      <div className="sofar-bar"><motion.i animate={{ width: `${(have / need.length) * 100}%` }} transition={{ duration: 0.6, ease }} /></div>
      <ul className="sofar-list">
        {rows.map((r) => (
          <li key={r.k} className={r.value ? 'set' : ''}>
            <Icon name={r.icon} size={16} />
            <span className="sofar-label">{r.label}</span>
            <span className="sofar-val">
              <AnimatePresence mode="popLayout" initial={false}>
                {r.value
                  ? <motion.span key={r.value} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease }}>{r.value}</motion.span>
                  : <motion.span key="empty" className="sofar-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{r.optional ? 'optional' : '—'}</motion.span>}
              </AnimatePresence>
            </span>
          </li>
        ))}
      </ul>
      <p className="fine">Bea fills this in as you talk. Rather set it yourself? <button type="button" className="link small" onClick={onUseForm}>Use the quick form</button></p>
    </aside>
  )
}

/** Bea's suggestion: which tools, why, what they cost and what they'd save. */
function Shortlist({ proposal, live, onAccept, onPickMyself }) {
  return (
    <motion.div className={`shortlist ${live ? '' : 'old'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease, delay: 0.3 }}>
      <span className="label">Bea suggests</span>
      <ul className="sl-tools">
        {proposal.tools.map((t, i) => {
          const p = getProduct(t.id)
          if (!p) return null
          return (
            <motion.li key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1, duration: 0.4, ease }}>
              <IconTile p={p} size={32} />
              <span className="sl-text"><b>{p.name}</b><span className="sl-why">{t.reason}</span></span>
              <span className="sl-price num">{p.priceLabel}</span>
            </motion.li>
          )
        })}
      </ul>
      <div className="sl-nums">
        <span><b className="num"><AnimatedNumber value={proposal.bill} format={money} /></b> a month</span>
        <span><b className="num"><AnimatedNumber value={proposal.hours} /></b> hrs a week back</span>
        {proposal.net > 0
          ? <span>likely <b className="num">{money(proposal.range[0])}–{money(proposal.range[1])}</b> a month better off</span>
          : <span>the payoff is <b>your time</b></span>}
      </div>
      {live && (
        <div className="sl-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onAccept}>Build my plan with these <Icon name="arrowRight" size={16} className="go" /></button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={onPickMyself}>I’d rather choose myself</button>
        </div>
      )}
      {live && <p className="fine">Or tell Bea what to change, like “something cheaper” or “do I need all of these?”</p>}
    </motion.div>
  )
}

/** The chat check-up: Bea gets to know the café, fills in its profile, then proposes a shortlist. */
export default function CheckupChat({ onUseForm }) {
  const { survey, setSurvey, setSelected, setStep, setGeminiPlan, beaChat, setBeaChat, showToast, bea, closeBea } = useApp()
  const [messages, setMessages] = useState(() => {
    const saved = beaChat.checkup || []
    if (saved.length) return saved.map((m) => ({ ...m, id: nextId(), fresh: false }))
    const o = opening(survey)
    return [{ id: nextId(), from: 'bea', ...o, fresh: true }]
  })
  const [busy, setBusy] = useState(false)
  const [listen, setListen] = useState(0)
  const ctrl = useRef(null)
  // without the AI, Bea runs the same check-up herself (see guided.js)
  const guided = useRef(false)
  const gState = useRef({ askedRant: false, proposed: false })
  const surveyRef = useRef(survey)
  surveyRef.current = survey
  const latestProposalId = useMemo(() => [...messages].reverse().find((m) => m.proposal)?.id, [messages])

  // "Talk to Bea" from the top bar: start listening here
  useEffect(() => {
    if (bea.open && bea.listen) { setListen(bea.n); closeBea() }
  }, [bea, closeBea])

  const runGuided = (text, withOwner) => {
    const { update, reply } = guidedTurn(text, surveyRef.current, gState.current)
    if (update && Object.keys(update).length) setSurvey((s) => ({ ...s, ...update }))
    const b = { id: nextId(), from: 'bea', text: reply.text, quickReplies: reply.quickReplies || [], multiSelect: !!reply.multiSelect, proposal: reply.proposal || null, fresh: true }
    const all = [...withOwner, b]
    setMessages(all)
    setBeaChat((c) => ({ ...c, checkup: toTranscript(all).slice(-40) }))
  }

  const send = async (text) => {
    const before = messages.map((m) => ({ ...m, fresh: false }))
    const withOwner = [...before, { id: nextId(), from: 'owner', text, fresh: true }]
    setMessages(withOwner)
    setBusy(true)
    if (guided.current) {
      setTimeout(() => { runGuided(text, withOwner); setBusy(false) }, 650)
      return
    }
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const r = await api.beaCheckup({ transcript: toTranscript(before), message: text, profile: survey }, ctrl.current.signal)
      setSurvey((s) => ({ ...s, ...r.profile }))
      const b = { id: nextId(), from: 'bea', text: r.reply?.text || 'Thanks! Tell me a bit more?', quickReplies: r.reply?.quickReplies || [], multiSelect: !!r.reply?.multiSelect, proposal: r.proposal || null, fresh: true }
      const all = [...withOwner, b]
      setMessages(all)
      setBeaChat((c) => ({ ...c, checkup: toTranscript(all).slice(-40) }))
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 429) {
        setMessages([...withOwner, { id: nextId(), from: 'bea', text: 'Give me a second, then send that again?', fresh: true }])
      } else {
        // the AI isn't reachable: carry on with the guided check-up, starting from this very answer
        guided.current = true
        runGuided(text, withOwner)
      }
    } finally {
      setBusy(false)
    }
  }

  const accept = (proposal) => {
    setSelected(proposal.tools.map((t) => t.id))
    setGeminiPlan(null)
    showToast('Putting your plan together with Bea’s picks', 'leaf')
    setStep(2)
  }
  const pickMyself = (proposal) => {
    setSelected(proposal.tools.map((t) => t.id))
    setStep(1)
  }

  return (
    <div className="checkup">
      <div className="checkup-intro">
        <h1>Let’s get to know your café</h1>
        <p className="lede">
          Bea, our café advisor, asks a few questions and suggests tools that fit. {voiceSupport !== 'none' ? 'Type, tap an answer, or press the microphone and just talk.' : 'Type or tap an answer.'}{' '}
          Prefer a form? <button type="button" className="link" onClick={onUseForm}>Use the quick form</button>
        </p>
      </div>
      <div className="checkup-grid">
        <section className="checkup-chat" aria-label="Chat with Bea">
          <header className="chat-head">
            <BeaAvatar size={40} thinking={busy} />
            <span className="chat-who"><b>Bea</b><small>{busy ? 'Writing…' : 'Your Cafinity advisor'}</small></span>
          </header>
          <BeaThread
            messages={messages}
            busy={busy}
            onSend={send}
            autoFocus
            listenSignal={listen}
            placeholder="Reply to Bea, or tap an answer"
            renderExtra={(m) => (
              <>
                {m.proposal?.kind === 'shortlist' && <Shortlist proposal={m.proposal} live={m.id === latestProposalId && !busy} onAccept={() => accept(m.proposal)} onPickMyself={() => pickMyself(m.proposal)} />}
                {m.offline && <button type="button" className="btn btn-quiet btn-sm bt-fallback" onClick={onUseForm}>Use the quick form</button>}
              </>
            )}
          />
        </section>
        <SoFar survey={survey} onUseForm={onUseForm} />
      </div>
    </div>
  )
}
