import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { api, gateStore } from '../../api'
import Ambient from '../layout/Ambient'
import { Logo } from '../layout/TopNav'

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
      setError(err.status === 0 ? 'We can’t reach Brewmind right now. Try again in a moment.' : err.message)
      setShake((n) => n + 1)
      setPw('')
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  // while we ask the server, just the page's background (a returning visitor goes straight in);
  // a note appears only if the server is slow to wake
  if (state === 'checking') {
    return (
      <main className="gate">
        <Ambient />
        <motion.p className="gate-wait" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.4 }}>
          ☕ Warming up the machine…
        </motion.p>
      </main>
    )
  }

  return (
    <main className="gate">
      <Ambient />
      <motion.div className="gate-wrap" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <div className="gate-sign" aria-hidden><span>Private preview</span></div>
        <motion.div
          key={shake}
          className="gate-card"
          animate={shake ? { x: [0, -12, 10, -7, 4, 0] } : undefined}
          transition={{ duration: 0.45 }}
        >
          <Logo />
          {state === 'offline' ? (
            <>
              <h1>The café’s closed for a moment</h1>
              <p className="gate-lede">We can’t reach the Brewmind server right now. It’s usually back within a minute.</p>
              <button type="button" className="btn primary gate-go" onClick={onRetry}>Try again</button>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <span className="script-note">pull up a chair</span>
              <h1>This one’s just for our group</h1>
              <p className="gate-lede">Brewmind is a prototype we’re building for INFS3605. Pop in the password from the group chat to come inside.</p>
              <label htmlFor="gate-pw" className="sr-only">Password</label>
              <div className="gate-field">
                <input
                  ref={inputRef}
                  id="gate-pw"
                  type="password"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); if (error) setError('') }}
                  placeholder="Password"
                  autoComplete="current-password"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoFocus
                  aria-invalid={!!error}
                  aria-describedby="gate-msg"
                />
                <button type="submit" className="btn primary gate-go" disabled={busy}>{busy ? 'Checking…' : 'Come in ☕'}</button>
              </div>
              <p id="gate-msg" className={`gate-msg ${error ? 'err' : ''}`} role="alert">{error || 'Capitals don’t matter.'}</p>
            </form>
          )}
        </motion.div>
        <p className="gate-fine">🔒 The password keeps the AI (and its bill) to our group while we test.</p>
      </motion.div>
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
