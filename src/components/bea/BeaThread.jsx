import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BeaAvatar from './BeaAvatar'

const ease = [0.22, 1, 0.36, 1]
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Bea's words drift in a few at a time, as if she's writing them on the note. */
function Written({ text, fresh }) {
  if (!fresh || reduceMotion()) return <>{text}</>
  const words = text.split(/(\s+)/)
  return (
    <motion.span initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.022 } } }}>
      {words.map((w, i) => (/^\s+$/.test(w)
        ? w
        : <motion.span key={i} className="bt-word" variants={{ hidden: { opacity: 0, y: 4, filter: 'blur(3px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } }} transition={{ duration: 0.32, ease }}>{w}</motion.span>))}
    </motion.span>
  )
}

/** Tap-to-answer chips under Bea's latest note; several can be picked when she asks a "pick any" question. */
function QuickReplies({ options, multi, onSend }) {
  const [picked, setPicked] = useState([])
  const toggle = (o) => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
  const join = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr.at(-1)}`)
  return (
    <motion.div className="bt-quick" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.25 } } }}>
      {options.map((o) => (
        <motion.button
          key={o}
          type="button"
          className={`bt-chip ${picked.includes(o) ? 'on' : ''}`}
          variants={{ hidden: { opacity: 0, y: 8, scale: 0.94 }, show: { opacity: 1, y: 0, scale: 1 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => (multi ? toggle(o) : onSend(o))}
          aria-pressed={multi ? picked.includes(o) : undefined}
        >
          {multi && <span className="bt-tick" aria-hidden>{picked.includes(o) ? '✓' : '+'}</span>}{o}
        </motion.button>
      ))}
      <AnimatePresence>
        {multi && picked.length > 0 && (
          <motion.button key="send" type="button" className="bt-chip send" onClick={() => onSend(join(picked))}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }}>
            That’s it ›
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** "Bea is writing…": steam curling from a cup. */
function Steam() {
  return (
    <motion.div className="bt-row bea" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3, ease }}>
      <div className="bt-note bt-typing" role="status" aria-label="Bea is writing">
        <svg viewBox="0 0 44 30" width="44" height="30" aria-hidden>
          <path className="bt-wisp w1" d="M14 15c-3-3 3-5 0-9" />
          <path className="bt-wisp w2" d="M21 15c-3-3 3-5 0-9" />
          <path className="bt-wisp w3" d="M28 15c-3-3 3-5 0-9" />
          <path d="M9 17h24v4a7 7 0 0 1-7 7h-10a7 7 0 0 1-7-7z" fill="#3B2416" />
          <path d="M33 19h2a3 3 0 0 1 0 6h-2" fill="none" stroke="#3B2416" strokeWidth="2" />
        </svg>
      </div>
    </motion.div>
  )
}

/**
 * The conversation with Bea, shared by the check-up and "Ask Bea". Bea's messages are paper notes, the
 * owner's are latte chips. `renderExtra` adds anything under a message (a shortlist or a plan change).
 */
export default function BeaThread({ messages, busy, onSend, placeholder = 'Type a reply…', renderExtra, disabled = false, autoFocus = false }) {
  const [draft, setDraft] = useState('')
  const scroller = useRef(null)
  const input = useRef(null)
  const last = messages[messages.length - 1]
  const showQuick = !busy && !disabled && last?.from === 'bea' && last.quickReplies?.length > 0

  // keep the newest message in view, inside the thread (never scrolls the page)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }, [messages.length, busy])
  useEffect(() => { if (autoFocus && !busy) input.current?.focus({ preventScroll: true }) }, [autoFocus, busy, messages.length])

  const send = (text) => {
    const t = String(text || '').trim()
    if (!t || busy || disabled) return
    onSend(t)
    setDraft('')
  }
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft) }
  }

  return (
    <div className="bt">
      <div className="bt-scroll" ref={scroller}>
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const firstOfRun = messages[i - 1]?.from !== m.from
            return (
              <motion.div
                key={m.id}
                layout="position"
                className={`bt-row ${m.from} ${firstOfRun ? 'first' : ''}`}
                initial={m.fresh ? { opacity: 0, y: 12, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                {m.from === 'bea' && firstOfRun && <span className="bt-name">Bea</span>}
                <div className={m.from === 'bea' ? 'bt-note' : 'bt-mine'}>
                  {m.from === 'bea' ? <Written text={m.text} fresh={m.fresh} /> : m.text}
                </div>
                {renderExtra?.(m)}
              </motion.div>
            )
          })}
          {busy && <Steam key="steam" />}
        </AnimatePresence>
        {showQuick && <QuickReplies key={last.id} options={last.quickReplies} multi={last.multiSelect} onSend={send} />}
      </div>
      <form className="bt-compose" onSubmit={(e) => { e.preventDefault(); send(draft) }}>
        <BeaAvatar size={32} thinking={busy} className="bt-compose-av" />
        <label htmlFor="bt-input" className="sr-only">Message Bea</label>
        <textarea
          id="bt-input"
          ref={input}
          rows={1}
          value={draft}
          maxLength={500}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          disabled={disabled}
        />
        <motion.button type="submit" className="bt-send" disabled={!draft.trim() || busy || disabled} whileTap={{ scale: 0.92 }} aria-label="Send">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h13M13 6l6 6-6 6" /></svg>
        </motion.button>
      </form>
    </div>
  )
}
