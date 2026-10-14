import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { USE_CASES, DEPARTMENTS } from '../../data/products'

function ChipRow({ label, items, value, onChange, idp }) {
  return (
    <div className="chip-row">
      <span className="chip-label">{label}</span>
      <div className="chips">
        {[{ id: 'all', label: 'All', icon: '✨' }, ...items].map((it) => {
          const active = value === it.id
          return (
            <button key={it.id} className={`chip ${active ? 'active' : ''}`} onClick={() => onChange(it.id)}>
              {active && (
                <motion.span
                  layoutId={`chip-bg-${idp}`}
                  className="chip-bg"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="chip-content">
                <span>{it.icon}</span> {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function FilterBar({ query, setQuery, useCase, setUseCase, dept, setDept, count }) {
  const [focus, setFocus] = useState(false)
  return (
    <div className="filterbar">
      <div className="filter-top">
        <motion.label
          className={`search ${focus ? 'focus' : ''}`}
          animate={{ width: focus || query ? 380 : 260 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="Search tools…"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                className="clear"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                ✕
              </motion.button>
            )}
          </AnimatePresence>
        </motion.label>
        <div className="result-count">
          <motion.span key={count} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {count}
          </motion.span>{' '}
          tools brewing
        </div>
      </div>
      <ChipRow idp="uc" label="I need help with" items={USE_CASES} value={useCase} onChange={setUseCase} />
      <ChipRow idp="dp" label="In my department" items={DEPARTMENTS} value={dept} onChange={setDept} />
    </div>
  )
}
