import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { api } from '../../api'
import { AUTH_QUOTE, PEOPLE, photo } from '../../data/people'
import PlaceholderTag from '../ui/PlaceholderTag'

const ease = [0.22, 1, 0.36, 1]

const REASONS = {
  plan: 'Your answers, tools and café team are saved, so you can pick up right where you left off.',
  add: 'Sign in to add tools to your plan — we’ll keep everything saved for you.',
  brew: 'We’ll brew your plan and keep it safe for next time.',
}

function Field({ id, label, type = 'text', value, onChange, autoFocus, autoComplete }) {
  return (
    <div className="float-input auth-input">
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder=" " autoFocus={autoFocus} autoComplete={autoComplete} />
      <label htmlFor={id}>{label}</label>
      <motion.span className="input-underline" animate={{ scaleX: value ? 1 : 0 }} transition={{ duration: 0.4, ease }} />
    </div>
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
    // `auth-open` is what lets the overlay take clicks (see v2.css), so a closed modal can never block the page
    document.body.classList.add('modal-open', 'auth-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('auth-open')
      // a product popup may still be open underneath
      if (!document.body.classList.contains('product-open')) document.body.classList.remove('modal-open')
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
      setError(err.message || 'Something went wrong — please try again.')
    } finally {
      setBusy(false)
    }
  }

  const person = PEOPLE[AUTH_QUOTE.person]

  return (
    <AnimatePresence>
      {auth.open && (
        <motion.div
          key="auth-overlay"
          className="overlay auth-overlay"
          onClick={closeAuth}
          initial={{ backgroundColor: 'rgba(59,36,22,0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
          animate={{ backgroundColor: 'rgba(59,36,22,0.38)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          exit={{ backgroundColor: 'rgba(59,36,22,0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.45, ease }}
        >
          <motion.div
            className="auth-card"
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to Brewmind"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 60, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 230, damping: 28 }}
          >
            <button className="modal-close" onClick={closeAuth} aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>

            <aside className="auth-photo" style={{ backgroundImage: `url(${photo(AUTH_QUOTE.person, 720, 900)})` }}>
              <div className="auth-photo-shade" />
              <motion.blockquote className="auth-quote" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6, ease }}>
                <PlaceholderTag />
                <span className="auth-quote-mark">“</span>
                <p>{AUTH_QUOTE.quote}</p>
                <footer><b>{person.name}</b><span>{person.cafe} · {person.city}</span></footer>
              </motion.blockquote>
            </aside>

            <form className="auth-form" onSubmit={submit}>
              <span className="script-note">pull up a chair</span>
              <h2>{mode === 'signup' ? 'Create your café’s account' : 'Welcome back'}</h2>
              <p className="auth-sub">{REASONS[auth.reason] || REASONS.plan}</p>

              {/* a plain CSS pill: a layoutId pill here kept the closing modal mounted (and catching clicks) after sign-in */}
              <div className={`auth-toggle ${mode}`} role="tablist">
                <span className="auth-pill" aria-hidden />
                {[['signup', 'New here'], ['login', 'I have an account']].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={mode === id} className={`auth-tab ${mode === id ? 'on' : ''}`} onClick={() => { setMode(id); setError('') }}>
                    <span className="auth-label">{label}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={mode} className="auth-fields" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28, ease }}>
                  {mode === 'signup' ? (
                    <>
                      <Field id="a-cafe" label="Your café’s name" value={f.cafeName} onChange={set('cafeName')} autoFocus autoComplete="organization" />
                      <div className="auth-row">
                        <Field id="a-user" label="Username" value={f.username} onChange={set('username')} autoComplete="username" />
                        <Field id="a-email" label="Email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
                      </div>
                      <Field id="a-pass" label="Password (6+ characters)" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
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
                  <motion.div className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <span>🫖</span> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" className="btn primary auth-submit" whileHover={{ scale: busy ? 1 : 1.02 }} whileTap={{ scale: 0.97 }} disabled={busy}>
                {busy ? 'Warming up the machine…' : mode === 'signup' ? 'Create my café ✨' : 'Sign in ☕'}
              </motion.button>
              <p className="auth-fine">🔒 Only used to save your plan. No spam, no sharing — ever.</p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
