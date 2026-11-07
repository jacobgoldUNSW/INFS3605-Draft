import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import Logo from '../ui/Logo'
import Icon from '../ui/Icon'

function Account() {
  const { user, signOut, openAuth, navigate } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const off = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', off)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('pointerdown', off); window.removeEventListener('keydown', esc) }
  }, [open])

  if (!user) {
    return <button className="nav-signin" onClick={() => openAuth('plan', () => navigate('plan'), 'login')}>Sign in</button>
  }
  return (
    <div className="nav-user-wrap" ref={ref}>
      <button className="nav-user" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Account: ${user.cafeName}`}>
        {(user.cafeName || user.username || '?').trim()[0]?.toUpperCase()}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="nav-menu" role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <div className="nav-menu-head">
              <b>{user.cafeName}</b>
              <span>Signed in as {user.username}</span>
            </div>
            <button role="menuitem" className="nav-menu-item" onClick={() => { setOpen(false); navigate('plan') }}>
              <Icon name="doc" size={18} /> My café plan
            </button>
            <button role="menuitem" className="nav-menu-item" onClick={() => { setOpen(false); signOut() }}>
              <Icon name="door" size={18} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const NAV = [
  { page: 'home', label: 'Home' },
  { page: 'plan', label: 'My café plan' },
  { page: 'pantry', label: 'AI Pantry' },
]

export default function TopNav() {
  const { route, navigate, selected, user, step, openBea } = useApp()
  const [menu, setMenu] = useState(false)
  useEffect(() => setMenu(false), [route.page, route.sub])

  const follow = (page) => (e) => {
    e.preventDefault()
    navigate(page)
  }
  // talk to Bea from anywhere: on a finished plan she opens right here; otherwise she runs the check-up
  const talk = () => {
    if (!user) return navigate('plan')
    if (step < 3) navigate('plan')
    openBea(true)
  }
  const planCount = user && step === 3 ? selected.length : 0

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Logo onClick={follow('home')} />
        <nav className="nav-links" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.page} className="nav-link" href={hrefFor(n.page)} onClick={follow(n.page)} aria-current={route.page === n.page ? 'page' : undefined}>
              {n.label}
              {n.page === 'plan' && planCount > 0 && <span className="nav-count num" aria-label={`${planCount} tools`}>{planCount}</span>}
              {route.page === n.page && <motion.span layoutId="nav-ind" className="nav-ind" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="nav-bea" onClick={talk} aria-label="Talk to Bea, our café advisor">
            <span className="mic-dot"><Icon name="mic" size={15} stroke={1.8} /></span>
            <span className="lbl">Talk to Bea</span>
          </button>
          <Account />
          <button className="nav-burger" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu">
            <Icon name={menu ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {menu && (
          <motion.nav className="nav-drawer" aria-label="Main" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {NAV.map((n) => (
              <a key={n.page} href={hrefFor(n.page)} onClick={follow(n.page)} aria-current={route.page === n.page ? 'page' : undefined}>
                {n.label} <Icon name="arrowRight" size={20} />
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
