import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BeaAvatar from './BeaAvatar'
import MicButton from './MicButton'
import Icon from '../ui/Icon'
import { useVoice, speak, hush, speakPref, canSpeak } from '../../voice/useVoice'

const ease = [0.22, 1, 0.36, 1]
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Bea's words settle in a few at a time, as if she's writing them. */
function Written({ text, fresh }) {
  if (!fresh || reduceMotion()) return <>{text}</>
  const words = text.split(/(\s+)/)
  return (
    <motion.span initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.018 } } }}>
      {words.map((w, i) => (/^\s+$/.test(w)
        ? w
        : <motion.span key={i} className="bt-word" variants={{ hidden: { opacity: 0, y: 3 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.28, ease }}>{w}</motion.span>))}
    </motion.span>
  )
}

/** Tap-to-answer options under Bea's latest message; several can be picked when she asks a "pick any" question. */
function QuickReplies({ options, multi, onSend }) {
  const [picked, setPicked] = useState([])
  const toggle = (o) => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
  const join = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr.at(-1)}`)
  return (
    <motion.div className="bt-quick" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.2 } } }}>
      {options.map((o) => (
        <motion.button
          key={o}
          type="button"
          className={`bt-chip ${picked.includes(o) ? 'on' : ''}`}
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.25, ease }}
          onClick={() => (multi ? toggle(o) : onSend(o))}
          aria-pressed={multi ? picked.includes(o) : undefined}
        >
          {multi && <Icon name={picked.includes(o) ? 'check' : 'plus'} size={13} />}{o}
        </motion.button>
      ))}
      <AnimatePresence>
        {multi && picked.length > 0 && (
          <motion.button key="send" type="button" className="bt-chip send" onClick={() => onSend(join(picked))} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            That’s it <Icon name="arrowRight" size={13} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Typing() {
  return (
    <motion.div className="bt-row bea" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="bt-note bt-typing" role="status" aria-label="Bea is writing">
        {[0, 1, 2].map((i) => <motion.i key={i} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} />)}
      </div>
    </motion.div>
  )
}

/**
 * The conversation with Bea, shared by the check-up and "Ask Bea". Type, tap a suggested answer, or talk.
 * `renderExtra` adds anything under a message (a shortlist or a proposed change). Bumping `listenSignal`
 * starts the microphone (used by "Talk to Bea" in the top bar).
 */
export default function BeaThread({ messages, busy, onSend, placeholder = 'Type a reply…', renderExtra, disabled = false, autoFocus = false, listenSignal = 0 }) {
  const [draft, setDraft] = useState('')
  const [talkBack, setTalkBack] = useState(() => speakPref.get())
  const scroller = useRef(null)
  const input = useRef(null)
  const spoken = useRef(new Set(messages.map((m) => m.id)))
  const last = messages[messages.length - 1]
  const showQuick = !busy && !disabled && last?.from === 'bea' && last.quickReplies?.length > 0

  const send = (text) => {
    const t = String(text || '').trim()
    if (!t || busy || disabled) return
    hush()
    onSend(t)
    setDraft('')
  }
  const voice = useVoice({ onFinal: (t) => send(t) })

  // keep the newest message in view, inside the thread (never scrolls the page)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }, [messages.length, busy])
  useEffect(() => { if (autoFocus && !busy && voice.state === 'idle') input.current?.focus({ preventScroll: true }) }, [autoFocus, busy, messages.length, voice.state])
  // read Bea's new replies aloud, if the owner asked her to
  useEffect(() => {
    if (!last || last.from !== 'bea' || spoken.current.has(last.id)) return
    spoken.current.add(last.id)
    if (talkBack && last.fresh) speak(last.text)
  }, [last, talkBack])
  useEffect(() => { if (listenSignal) voice.start() }, [listenSignal]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => hush(), [])

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft) }
  }
  const listening = voice.state === 'listening'
  const flipTalkBack = () => {
    const next = !talkBack
    setTalkBack(next)
    speakPref.set(next)
    if (!next) hush()
    else if (last?.from === 'bea') speak(last.text)
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
                initial={m.fresh ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease }}
              >
                {m.from === 'bea' && firstOfRun && <span className="bt-name"><BeaAvatar size={20} /> Bea</span>}
                <div className={m.from === 'bea' ? 'bt-note' : 'bt-mine'}>
                  {m.from === 'bea' ? <Written text={m.text} fresh={m.fresh} /> : m.text}
                </div>
                {renderExtra?.(m)}
              </motion.div>
            )
          })}
          {busy && <Typing key="typing" />}
        </AnimatePresence>
        {showQuick && <QuickReplies key={last.id} options={last.quickReplies} multi={last.multiSelect} onSend={send} />}
      </div>
      <AnimatePresence>
        {(listening || voice.state === 'working' || voice.error) && (
          <motion.p className={`bt-voice ${voice.error ? 'err' : ''}`} role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {voice.error
              ? <><Icon name="alert" size={15} /> {voice.error} <button type="button" className="link small" onClick={() => voice.setError('')}>OK</button></>
              : voice.state === 'working' ? 'Working out what you said…'
                : voice.interim ? <><span className="live-dot" /> “{voice.interim}”</> : <><span className="live-dot" /> Listening. Speak now, then tap the mic to send.</>}
          </motion.p>
        )}
      </AnimatePresence>
      <form className="bt-compose" onSubmit={(e) => { e.preventDefault(); send(draft) }}>
        <MicButton voice={voice} disabled={busy || disabled} />
        <label htmlFor="bt-input" className="sr-only">Message Bea</label>
        <textarea
          id="bt-input"
          ref={input}
          rows={1}
          value={listening ? voice.interim : draft}
          maxLength={500}
          placeholder={listening ? 'Listening…' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          disabled={disabled}
          readOnly={listening}
        />
        {canSpeak && (
          <button type="button" className={`bt-talk ${talkBack ? 'on' : ''}`} onClick={flipTalkBack} aria-pressed={talkBack} title={talkBack ? 'Bea reads replies aloud' : 'Have Bea read replies aloud'} aria-label="Read Bea’s replies aloud">
            <Icon name={talkBack ? 'speaker' : 'speakerOff'} size={18} />
          </button>
        )}
        <button type="submit" className="bt-send" disabled={!draft.trim() || busy || disabled || listening} aria-label="Send">
          <Icon name="arrowRight" size={18} stroke={1.8} />
        </button>
      </form>
    </div>
  )
}
