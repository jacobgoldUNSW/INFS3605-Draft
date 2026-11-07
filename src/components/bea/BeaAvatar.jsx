import React from 'react'
import { motion } from 'framer-motion'

/** Bea's mark: a serif "B" on forest green with a small leaf. A quiet line breathes underneath while she thinks. */
export default function BeaAvatar({ size = 40, thinking = false, className = '' }) {
  return (
    <span className={`bea-av ${thinking ? 'thinking' : ''} ${className}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <rect width="40" height="40" fill="var(--forest-800)" />
        <text x="18" y="28" textAnchor="middle" fontFamily="var(--f-serif)" fontSize="23" fill="var(--on-dark)">B</text>
        <path d="M29.5 9.5c-4.6.4-6.4 3.6-5.7 7.1 3.6.3 6.4-2.6 5.7-7.1z" fill="var(--sage)" />
        <path d="M24.2 16.2c1.3-1.8 2.7-3.2 4.4-4.6" stroke="var(--forest-800)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      </svg>
      {thinking && (
        <motion.i className="bea-av-line" initial={{ scaleX: 0.2, opacity: 0.4 }} animate={{ scaleX: [0.2, 1, 0.2], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
      )}
    </span>
  )
}
