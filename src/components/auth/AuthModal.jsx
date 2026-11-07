import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { api } from '../../api'
import { AUTH_QUOTE, PEOPLE, photo } from '../../data/people'
import PlaceholderTag from '../ui/PlaceholderTag'
import Icon from '../ui/Icon'

const ease = [0.22, 1, 0.36, 1]

const REASONS = {
  plan: 'We save your answers, your tools and your plan, so you can pick up where you left off.',
  add: 'Sign in to add tools to your plan. We’ll keep everything saved for you.',
  brew: 'We’ll put your plan together and keep it safe for next time.',
}

function Field({ id, label, type = 'text', value, onChange, autoFocus, autoComplete, hint }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} autoComplete={autoComplete} />
      {hint && <em className="fine">{hint}</em>}
    </label>
  )
}

export default function AuthModal() {
  const { auth, closeAuth, completeAuth } = useApp()
  const [mode, setMode] = useState(auth.mode)
  const [f, setF] = useState({ cafeName: '', username: '', email: '', password: '', identifier: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    if (auth.open) { setMode(auth.mode); setError('') }
  }, [auth.open, auth.mode])

  useEffect(() => {
    if (!auth.open) return
    const onKey = (e) => e.key === 'Escape' && closeAuth()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [auth.open, closeAuth])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'signup') {
        const res = await api.signup({ cafeName: f.cafeName, username: f.username, email: f.email, password: f.password })
        completeAuth(res, true)
      } else {
        const res = await api.login({ identifier: f.identifier, password: f.password })
        completeAuth(res, false)
      }
      setF({ cafeName: '', username: '', email: '', password: '', identifier: '' })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const person = PEOPLE[AUTH_QUOTE.person]

  return (
    <AnimatePresence>
      {auth.open && (
        <motion.div key="auth" className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && closeAuth()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <motion.div
            className="modal auth"
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'signup' ? 'Create your Cafinity account' : 'Sign in to Cafinity'}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.32, ease }}
          >
            <button className="modal-x" onClick={closeAuth} aria-label="Close"><Icon name="close" size={18} /></button>
            <aside className="auth-photo photo">
              <img src={photo(AUTH_QUOTE.person, 720, 960)} alt="" />
              <blockquote className="auth-quote on-dark">
                <PlaceholderTag />
                <p>“{AUTH_QUOTE.quote}”</p>
                <footer><b>{person.name}</b> · {person.cafe}, {person.city}</footer>
              </blockquote>
            </aside>
            <form className="auth-form" onSubmit={submit}>
              <span className="kicker">{mode === 'signup' ? 'New here' : 'Welcome back'}</span>
              <h2>{mode === 'signup' ? 'Create your café’s account' : 'Sign in to your plan'}</h2>
              <p className="muted">{REASONS[auth.reason] || REASONS.plan}</p>

              <div className="auth-switch" role="tablist">
                {[['signup', 'New account'], ['login', 'I have an account']].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={mode === id} className={`auth-tab ${mode === id ? 'on' : ''}`} onClick={() => { setMode(id); setError('') }}>{label}</button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={mode} className="auth-fields" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.24, ease }}>
                  {mode === 'signup' ? (
                    <>
                      <Field id="a-cafe" label="Your café’s name" value={f.cafeName} onChange={set('cafeName')} autoFocus autoComplete="organization" />
                      <div className="auth-row">
                        <Field id="a-user" label="Username" value={f.username} onChange={set('username')} autoComplete="username" />
                        <Field id="a-email" label="Email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
                      </div>
                      <Field id="a-pass" label="Password" hint="At least 6 characters" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
                    </>
                  ) : (
                    <>
                      <Field id="a-id" label="Username or email" value={f.identifier} onChange={set('identifier')} autoFocus autoComplete="username" />
                      <Field id="a-pass2" label="Password" type="password" value={f.password} onChange={set('password')} autoComplete="current-password" />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.p className="auth-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Icon name="alert" size={16} /> {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'One moment…' : mode === 'signup' ? <>Create my account <Icon name="arrowRight" size={17} className="go" /></> : <>Sign in <Icon name="arrowRight" size={17} className="go" /></>}
              </button>
              <p className="fine auth-fine"><Icon name="lock" size={13} /> Only used to save your plan. No spam, no sharing.</p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
