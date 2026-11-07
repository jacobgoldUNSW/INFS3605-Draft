import React, { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'

const C = 50
const R = 42
const rad = (deg) => ((deg - 90) * Math.PI) / 180
function sector(deg) {
  const d = Math.max(0, Math.min(deg, 359.99))
  if (d <= 0.01) return `M${C} ${C}Z`
  const x = C + R * Math.cos(rad(d))
  const y = C + R * Math.sin(rad(d))
  return `M${C} ${C}L${C} ${C - R}A${R} ${R} 0 ${d > 180 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`
}

/** A clock face whose hands wind round to show the hours you get back each week (one hour = one hour mark). */
export default function Clock({ hours = 0, size = 112, tone = 'dark' }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-30px' })
  const reduce = useReducedMotion()
  const h = Math.max(0, hours)
  const target = (Math.min(h, 12) / 12) * 360
  const deg = useMotionValue(0)
  const d = useTransform(deg, sector)
  const minute = useTransform(deg, (v) => v * 12)

  useEffect(() => {
    if (!seen) return
    if (reduce) { deg.set(target); return }
    const c = animate(deg, target, { duration: 1.9, ease: [0.65, 0, 0.35, 1], delay: 0.15 })
    return () => c.stop()
  }, [seen, target, reduce, deg])

  const dark = tone === 'dark'
  const ink = dark ? 'var(--on-dark)' : 'var(--ink)'
  const tick = dark ? 'var(--on-dark-3)' : 'var(--line-3)'
  return (
    <svg ref={ref} className="clock" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${Math.round(h)} hours a week back`}>
      <circle cx={C} cy={C} r={R + 4} fill="none" stroke={dark ? 'var(--line-dark-2)' : 'var(--line-2)'} strokeWidth="1" />
      <motion.path d={d} fill={dark ? 'rgba(169, 183, 159, 0.32)' : 'rgba(91, 118, 83, 0.18)'} stroke="var(--brass-2)" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = rad(i * 30)
        const r1 = i % 3 === 0 ? R - 7 : R - 4
        return <line key={i} x1={C + r1 * Math.cos(a)} y1={C + r1 * Math.sin(a)} x2={C + R * Math.cos(a)} y2={C + R * Math.sin(a)} stroke={tick} strokeWidth={i % 3 === 0 ? 1.6 : 1} />
      })}
      {/* hands: each group carries an invisible full circle so it turns about the clock's centre */}
      <motion.g style={{ rotate: minute }}>
        <circle cx={C} cy={C} r={R} fill="none" />
        <line x1={C} y1={C + 5} x2={C} y2={C - R + 8} stroke={ink} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </motion.g>
      <motion.g style={{ rotate: deg }}>
        <circle cx={C} cy={C} r={R} fill="none" />
        <line x1={C} y1={C + 4} x2={C} y2={C - R + 18} stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      </motion.g>
      <circle cx={C} cy={C} r="2.6" fill="var(--brass-2)" />
      {h > 12 && <text x={C} y={C + 22} textAnchor="middle" fontFamily="var(--f-serif)" fontSize="10" fill={ink}>+{Math.round(h - 12)}</text>}
    </svg>
  )
}
