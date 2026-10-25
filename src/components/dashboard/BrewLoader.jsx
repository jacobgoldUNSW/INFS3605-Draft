import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp, planKey } from '../../state'
import { api } from '../../api'
import { fallbackPersonalisation } from '../../../shared/personalise.js'

const MESSAGES = [
  'Grinding your answers…',
  'Weighing up your tools…',
  'Steaming the numbers…',
  'Writing your quiet-Tuesday steps…',
  'Adding a little latte art…',
  'Nearly there — warming the cups…',
]
const MIN_MS = 5800
const MAX_MS = 11000

export default function BrewLoader() {
  const { setStep, survey, selected, setGeminiPlan } = useApp()
  const [i, setI] = useState(0)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    // Personalise in the background while the cup fills, so the dashboard opens ready.
    const ctrl = new AbortController()
    const key = planKey(survey, selected)
    let done = false
    api.personalise({ survey, selected }, ctrl.signal)
      .then((r) => { setGeminiPlan({ ...r.plan, key }); done = true })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setGeminiPlan({ ...fallbackPersonalisation(survey, selected), key })
        done = true
      })
    const m = setInterval(() => setI((x) => Math.min(x + 1, MESSAGES.length - 1)), 1150)
    const start = performance.now()
    let raf
    const tick = (t) => {
      const el = t - start
      // the cup fills over ~6s; if Gemini is still writing we keep brewing (gently) up to ~11s
      const p = done ? Math.min(el / MIN_MS, 1) : Math.min(el / MIN_MS, 0.92) + Math.min(0.06, Math.max(0, (el - MIN_MS) / (MAX_MS - MIN_MS)) * 0.06)
      setPct(Math.min(p, 1))
      if ((done && el >= MIN_MS) || el >= MAX_MS) {
        if (!done) setGeminiPlan({ ...fallbackPersonalisation(survey, selected), key, pending: true })
        setPct(1)
        setTimeout(() => setStep(3), 450)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      // a late Gemini answer still lands (and replaces the house version) after we move on
      clearInterval(m)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStep])

  const fillY = 194 - pct * 92

  return (
    <motion.div className="brew" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.5 }}>
      <div className="brew-stage">
        <svg viewBox="0 0 240 240" width="280" height="280" className="brew-svg">
          <defs>
            <clipPath id="cupclip">
              <path d="M44 92h126v40a54 54 0 0 1-54 54h-18a54 54 0 0 1-54-54z" />
            </clipPath>
            <linearGradient id="coffee" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#D9772B" />
              <stop offset="1" stopColor="#5a3420" />
            </linearGradient>
          </defs>

          {/* steam */}
          {[0, 1, 2].map((s) => (
            <motion.path
              key={s}
              d={`M${88 + s * 26} 78 q-12 -14 0 -28 q12 -14 0 -28`}
              fill="none"
              stroke="#D9772B"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 0.8, 0], y: [10, -8, -22] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: s * 0.6, ease: 'easeOut' }}
            />
          ))}

          {/* cup */}
          <path d="M162 108h14a22 22 0 0 1 0 44h-20" fill="none" stroke="#3B2416" strokeWidth="12" strokeLinecap="round" />
          <path d="M44 92h126v40a54 54 0 0 1-54 54h-18a54 54 0 0 1-54-54z" fill="#FFF8F0" stroke="#3B2416" strokeWidth="8" strokeLinejoin="round" />

          {/* coffee fill */}
          <g clipPath="url(#cupclip)">
            <motion.g animate={{ y: fillY - 150 }} transition={{ ease: 'linear', duration: 0.1 }}>
              <rect x="30" y="150" width="160" height="120" fill="url(#coffee)" />
              <motion.path
                d="M20 150 q 20 -12 40 0 t 40 0 t 40 0 t 40 0 t 40 0 v 20 h -200z"
                fill="#E48E3F"
                animate={{ x: [0, -40] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.g>
          </g>
          <ellipse cx="107" cy="205" rx="82" ry="9" fill="rgba(59,36,22,0.12)" />
          <ellipse cx="107" cy="213" rx="64" ry="6" fill="rgba(59,36,22,0.07)" />
        </svg>

        {[0, 1, 2, 3, 4].map((b) => (
          <motion.span
            key={b}
            className="drop-bean"
            style={{ left: `${30 + b * 10}%` }}
            initial={{ y: -40, opacity: 0, rotate: 0 }}
            animate={{ y: [ -40, 90 ], opacity: [0, 1, 0], rotate: 220 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: b * 0.32, ease: 'easeIn' }}
          />
        ))}
      </div>

      <h2 className="brew-title">
        Brewing a plan for <span className="script">{survey.name || 'your café'}</span>
      </h2>

      <div className="brew-msg">
        <AnimatePresence mode="wait">
          <motion.span key={i} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.3 }}>
            {MESSAGES[i]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="brew-bar">
        <motion.div className="brew-bar-fill" style={{ scaleX: pct }} />
      </div>
      <div className="brew-pct">{Math.round(pct * 100)}%</div>
    </motion.div>
  )
}
