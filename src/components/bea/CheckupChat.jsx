import React, { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { api } from '../../api'
import { getProduct } from '../../data/products'
import { EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS } from '../../data/mockDashboard'
import { Portrait } from '../cafe/WorkerInspector'
import AnimatedNumber from '../ui/AnimatedNumber'
import { useCafeImages } from '../../sim/useCafeImages'
import BeaThread from './BeaThread'
import BeaAvatar from './BeaAvatar'

const ease = [0.22, 1, 0.36, 1]
let uid = 0
const nextId = () => `m${Date.now().toString(36)}${++uid}`
const toTranscript = (msgs) => msgs.map((m) => ({ from: m.from, text: m.text }))
const label = (arr, id) => arr.find((x) => x.id === id)

function opening(survey) {
  const name = survey.name?.trim()
  if (name) {
    return {
      text: `Hi, I’m Bea! Lovely to meet you, ${name}. I’ll ask a few quick questions about your café, then suggest a small team of helpers. First up, how many people are on your team, you included?`,
      quickReplies: EMPLOYEE_OPTIONS.map((o) => `${o.label} people`),
    }
  }
  return { text: 'Hi, I’m Bea! I’ll ask a few quick questions about your café, then suggest a small team of helpers. First up, what’s your café called?', quickReplies: [] }
}

/** The profile Bea is building, written up like a recipe card. Each ingredient settles in as she learns it. */
function RecipeCard({ survey, onUseForm }) {
  const rows = [
    { k: 'name', icon: '🏷️', label: 'Café', value: survey.name?.trim() },
    { k: 'employees', icon: '👥', label: 'Team', value: label(EMPLOYEE_OPTIONS, survey.employees) && `${label(EMPLOYEE_OPTIONS, survey.employees).label} people` },
    { k: 'revenue', icon: '💰', label: 'Sales', value: label(REVENUE_OPTIONS, survey.revenue)?.label },
    { k: 'cafeType', icon: '🥐', label: 'Style', value: label(CAFE_TYPES, survey.cafeType)?.label },
    { k: 'goal', icon: '🎯', label: 'Main goal', value: label(PRIMARY_GOALS, survey.goal)?.label },
    { k: 'pains', icon: '😮‍💨', label: 'Time sinks', value: (survey.pains || []).map((p) => label(PAIN_POINTS, p)?.label).filter(Boolean).join(', ') },
    { k: 'tech', icon: '📱', label: 'With tech', value: label(TECH_LEVELS, survey.tech)?.label },
    { k: 'rant', icon: '☕', label: 'In your words', value: survey.rant?.trim() && `“${survey.rant.trim()}”`, optional: true },
  ]
  const need = rows.filter((r) => !r.optional)
  const have = need.filter((r) => r.value).length
  return (
    <aside className="recipe" aria-label="Your café, as Bea has noted it">
      <div className="recipe-head">
        <span className="script-note">your café recipe</span>
        <span className="recipe-count"><b>{have}</b> of {need.length}</span>
      </div>
      <div className="recipe-bar"><motion.i animate={{ scaleX: have / need.length }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></div>
      <ul className="recipe-list">
        {rows.map((r) => (
          <li key={r.k} className={r.value ? 'set' : ''}>
            <span className="recipe-ico" aria-hidden>{r.icon}</span>
            <span className="recipe-label">{r.label}</span>
            <span className="recipe-val">
              <AnimatePresence mode="popLayout" initial={false}>
                {r.value ? (
                  <motion.span key={r.value} className="recipe-ink" initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.45, ease }}>
                    {r.value}
                    <motion.i className="recipe-swash" initial={{ scaleX: 0, opacity: 0.9 }} animate={{ scaleX: 1, opacity: 0 }} transition={{ duration: 1.1, ease }} aria-hidden />
                  </motion.span>
                ) : (
                  <motion.span key="empty" className="recipe-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{r.optional ? 'optional' : '…'}</motion.span>
                )}
              </AnimatePresence>
            </span>
          </li>
        ))}
      </ul>
      <p className="recipe-fine">Bea fills this in as you chat. Want to set it yourself? <button type="button" className="link-btn" onClick={onUseForm}>Use the quick form</button></p>
    </aside>
  )
}

/** Bea's suggestion: who she'd put on the team, why, and what it would cost and save. */
function Shortlist({ proposal, live, onAccept, onPickMyself }) {
  const images = useCafeImages()
  const money = (n) => `$${Math.round(n).toLocaleString()}`
  return (
    <motion.div className={`shortlist ${live ? '' : 'old'}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.35 }}>
      <ul className="sl-tools">
        {proposal.tools.map((t, i) => {
          const p = getProduct(t.id)
          if (!p) return null
          return (
            <motion.li key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.12, duration: 0.45, ease }} style={{ '--a': p.from, '--b': p.to }}>
              <span className="sl-face"><Portrait images={images} sprite={t.id} size={32} /></span>
              <span className="sl-text">
                <b>{p.name}</b> <span className="sl-price">{p.priceLabel}</span>
                <span className="sl-why">{t.reason}</span>
              </span>
            </motion.li>
          )
        })}
      </ul>
      <div className="sl-nums">
        <span><b><AnimatedNumber value={proposal.bill} format={money} /></b> a month</span>
        <span><b><AnimatedNumber value={proposal.hours} /></b> hrs a week back</span>
        {proposal.net > 0
          ? <span>likely <b>{money(proposal.range[0])}–{money(proposal.range[1])}</b> a month better off</span>
          : <span>the payoff is <b>your time</b></span>}
      </div>
      {live && (
        <div className="sl-actions">
          <motion.button type="button" className="btn primary" onClick={onAccept} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>Brew my plan with these ✨</motion.button>
          <button type="button" className="btn ghost" onClick={onPickMyself}>I’d rather pick myself</button>
        </div>
      )}
      {live && <p className="sl-fine">Or tell Bea what to change, like “something cheaper” or “do I need all three?”</p>}
    </motion.div>
  )
}

/** The chat check-up: Bea gets to know the café, fills in its profile, then proposes a shortlist. */
export default function CheckupChat({ onUseForm }) {
  const { survey, setSurvey, setSelected, setStep, setGeminiPlan, beaChat, setBeaChat, showToast } = useApp()
  const [messages, setMessages] = useState(() => {
    const saved = beaChat.checkup || []
    if (saved.length) return saved.map((m) => ({ ...m, id: nextId(), fresh: false }))
    const o = opening(survey)
    return [{ id: nextId(), from: 'bea', ...o, fresh: true }]
  })
  const [busy, setBusy] = useState(false)
  const ctrl = useRef(null)
  const latestProposalId = useMemo(() => [...messages].reverse().find((m) => m.proposal)?.id, [messages])

  const send = async (text) => {
    const before = messages.map((m) => ({ ...m, fresh: false }))
    const withOwner = [...before, { id: nextId(), from: 'owner', text, fresh: true }]
    setMessages(withOwner)
    setBusy(true)
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    try {
      const r = await api.beaCheckup({ transcript: toTranscript(before), message: text, profile: survey }, ctrl.current.signal)
      setSurvey((s) => ({ ...s, ...r.profile }))
      const bea = { id: nextId(), from: 'bea', text: r.reply?.text || 'Thanks! Tell me a bit more?', quickReplies: r.reply?.quickReplies || [], multiSelect: !!r.reply?.multiSelect, proposal: r.proposal || null, fresh: true }
      const all = [...withOwner, bea]
      setMessages(all)
      setBeaChat((c) => ({ ...c, checkup: toTranscript(all).slice(-40) }))
    } catch (e) {
      if (e.name === 'AbortError') return
      const text2 = e.status === 429
        ? 'Give me a second to catch my breath, then send that again?'
        : 'Sorry, my coffee machine’s playing up and I can’t think straight. Your answers are saved, so you can carry on with the quick form.'
      setMessages([...withOwner, { id: nextId(), from: 'bea', text: text2, fresh: true, offline: e.status !== 429 }])
    } finally {
      setBusy(false)
    }
  }

  const accept = (proposal) => {
    setSelected(proposal.tools.map((t) => t.id))
    setGeminiPlan(null)
    showToast('Brewing your plan with Bea’s picks', '✨')
    setStep(2)
  }
  const pickMyself = (proposal) => {
    setSelected(proposal.tools.map((t) => t.id))
    setStep(1)
  }

  return (
    <div className="checkup">
      <motion.div className="checkup-intro" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
        <span className="script-note big">pull up a chair</span>
        <h1>Let’s get to know <span className="script">your café</span></h1>
        <p>Have a chat with Bea, our host. She’ll ask a few questions, then suggest a small team of helpers that fit. Prefer tapping? <button type="button" className="link-btn" onClick={onUseForm}>Use the quick form</button></p>
      </motion.div>
      <div className="checkup-grid">
        <motion.section className="checkup-chat" aria-label="Chat with Bea" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease, delay: 0.1 }}>
          <header className="chat-head">
            <BeaAvatar size={44} thinking={busy} />
            <span className="chat-who"><b>Bea</b><small>{busy ? 'writing…' : 'your Brewmind host'}</small></span>
          </header>
          <BeaThread
            messages={messages}
            busy={busy}
            onSend={send}
            autoFocus
            placeholder="Reply to Bea, or tap an answer"
            renderExtra={(m) => (
              <>
                {m.proposal?.kind === 'shortlist' && <Shortlist proposal={m.proposal} live={m.id === latestProposalId && !busy} onAccept={() => accept(m.proposal)} onPickMyself={() => pickMyself(m.proposal)} />}
                {m.offline && <button type="button" className="btn ghost bt-fallback" onClick={onUseForm}>Use the quick form</button>}
              </>
            )}
          />
        </motion.section>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.22 }}>
          <RecipeCard survey={survey} onUseForm={onUseForm} />
        </motion.div>
      </div>
    </div>
  )
}
