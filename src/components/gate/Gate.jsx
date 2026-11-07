import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { api, gateStore } from '../../api'
import { LeafMark } from '../ui/Logo'
import Botanical from '../ui/Botanical'
import Icon from '../ui/Icon'

const ease = [0.22, 1, 0.36, 1]

/** The password page itself: one field, checked by the server (case doesn't matter). */
function GatePage({ state, onOpen, onRetry }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const inputRef = useRef(null)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!pw.trim()) { setError('Type the password first.'); inputRef.current?.focus(); return }
    setBusy(true)
    setError('')
    try {
      const r = await api.unlock(pw)
      if (r?.token) gateStore.set(r.token)
      onOpen()
    } catch (err) {
      setError(err.status === 0 ? 'We can’t reach Cafinity right now. Try again in a moment.' : err.message)
      setShake((n) => n + 1)
      setPw('')
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  // while we ask the server, just a quiet page (a returning visitor goes straight in);
  // a note appears only if the server is slow to wake
  if (state === 'checking') {
    return (
      <main className="gate gate-checking">
        <motion.p className="gate-wait" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.4 }}>
          <span className="live-dot" /> Opening up…
        </motion.p>
      </main>
    )
  }

  return (
    <main className="gate">
      <aside className="gate-art on-dark">
        <div className="gate-brand"><LeafMark size={30} /><span>Cafinity</span></div>
        <Botanical variant="coffee" className="gate-plant" sway />
        <p className="gate-art-line">See what AI could take off your plate, before you spend a cent.</p>
      </aside>
      <motion.section className="gate-form-wrap" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <motion.div key={shake} className="gate-card" animate={shake ? { x: [0, -10, 8, -5, 3, 0] } : undefined} transition={{ duration: 0.42 }}>
          {state === 'offline' ? (
            <>
              <span className="kicker">Back in a moment</span>
              <h1>We can’t reach the server just now</h1>
              <p className="lede">It’s usually back within a minute.</p>
              <button type="button" className="btn btn-primary" onClick={onRetry}><Icon name="refresh" size={17} /> Try again</button>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <span className="kicker">Private preview</span>
              <h1>This one’s just for our group</h1>
              <p className="lede">Cafinity is a prototype we’re building for INFS3605. Use the password from the group chat to come in.</p>
              <label htmlFor="gate-pw" className="field">
                <span>Password</span>
                <div className="gate-field">
                  <input
                    ref={inputRef}
                    id="gate-pw"
                    className="input"
                    type="password"
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); if (error) setError('') }}
                    autoComplete="current-password"
                    autoCapitalize="off"
                    spellCheck={false}
                    autoFocus
                    aria-invalid={!!error}
                    aria-describedby="gate-msg"
                  />
                  <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : <>Come in <Icon name="arrowRight" size={17} className="go" /></>}</button>
                </div>
              </label>
              <p id="gate-msg" className={`gate-msg ${error ? 'err' : ''}`} role="alert">{error || 'Capitals don’t matter.'}</p>
            </form>
          )}
        </motion.div>
        <p className="fine gate-fine"><Icon name="lock" size={14} /> The password keeps the AI, and its bill, to our group while we test.</p>
      </motion.section>
    </main>
  )
}

/**
 * Stands in front of the whole app. Asks the server whether this browser already has a pass; if not,
 * shows the password page. A pass lasts 30 days, and an expired one brings the page back.
 */
export default function Gate({ children }) {
  const [state, setState] = useState('checking') // checking · locked · offline · open

  const check = useCallback(async () => {
    setState('checking')
    try {
      const r = await api.gate()
      setState(!r.required || r.ok ? 'open' : 'locked')
    } catch {
      setState('offline')
    }
  }, [])

  useEffect(() => { check() }, [check])
  useEffect(() => {
    const onLocked = () => setState('locked')
    window.addEventListener('brewmind:locked', onLocked)
    return () => window.removeEventListener('brewmind:locked', onLocked)
  }, [])

  if (state === 'open') return children
  return <GatePage state={state} onOpen={() => setState('open')} onRetry={check} />
}
