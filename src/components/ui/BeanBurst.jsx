import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

/** A burst of little coffee beans. Re-key the component to retrigger. */
export default function BeanBurst({ count = 14 }) {
  const beans = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const dist = 50 + Math.random() * 60
        return {
          i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 20,
          r: Math.random() * 360,
          s: 0.7 + Math.random() * 0.7,
          color: ['#6b3f23', '#D9772B', '#F2B46D', '#3B2416'][i % 4],
        }
      }),
    [count]
  )
  return (
    <span className="bean-burst" aria-hidden>
      {beans.map((b) => (
        <motion.span
          key={b.i}
          className="bean"
          style={{ background: b.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 36], scale: [0, b.s, b.s * 0.6], opacity: [1, 1, 0], rotate: b.r }}
          transition={{ duration: 0.95, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}
