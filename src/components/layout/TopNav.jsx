import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'

function Logo() {
  return (
    <div className="logo">
      <div className="logo-cup" aria-hidden>
        <svg viewBox="0 0 48 48" width="38" height="38">
          {[0, 1, 2].map((i) => (
            <motion.path
              key={i}
              d={`M${17 + i * 7} 14 q-4 -4 0 -8 q4 -4 0 -8`}
              transform="translate(0 8)"
              fill="none"
              stroke="#D9772B"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: [0, 0.9, 0], y: [4, -4, -9] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
            />
          ))}
          <path d="M9 24h26v8a10 10 0 0 1-10 10h-6A10 10 0 0 1 9 32z" fill="#3B2416" />
          <path d="M35 27h2.5a4.5 4.5 0 0 1 0 9H34" fill="none" stroke="#3B2416" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="22" cy="24" rx="13" ry="2.6" fill="#D9772B" />
        </svg>
      </div>
      <span className="logo-word">Brewmind</span>
    </div>
  )
}

export default function TopNav() {
  const { tab, setTab, selected, setOpenId } = useApp()
  const tabs = [
    { id: 'home', label: 'Home', icon: '☕' },
    { id: 'marketplace', label: 'Marketplace', icon: '🛍️' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  ]
  return (
    <motion.header
      className="topnav"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}
    >
      <button className="logo-btn" onClick={() => setTab('home')} aria-label="Brewmind home">
        <Logo />
      </button>

      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => {
              setOpenId(null)
              setTab(t.id)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            {tab === t.id && (
              <motion.span
                layoutId="tab-pill"
                className="tab-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="tab-label">
              <span className="tab-emoji">{t.icon}</span>
              {t.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="nav-right">
        <button
          className="plan-chip"
          onClick={() => {
            setTab('dashboard')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span>My plan</span>
          <span className="plan-count-wrap">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={selected.length}
                className="plan-count"
                initial={{ y: 14, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -14, opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              >
                {selected.length}
              </motion.span>
            </AnimatePresence>
          </span>
        </button>
      </div>
    </motion.header>
  )
}
