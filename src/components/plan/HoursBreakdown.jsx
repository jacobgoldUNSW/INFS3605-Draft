import React, { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

/** "We estimate ___ now → ___ with your tools", split by the kind of work, with hover detail. */
export default function HoursBreakdown({ before, after, totalBefore, totalAfter }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-40px' })
  const [hover, setHover] = useState(null)
  const max = Math.max(totalBefore, 1)
  const back = Math.max(0, totalBefore - totalAfter)

  const seg = (it, i, row) => (
    <motion.span
      key={it.id}
      className={`hb-seg ${hover && hover !== it.id ? 'dim' : ''}`}
      style={{ background: it.color }}
      initial={{ width: 0 }}
      animate={{ width: seen ? `${(it.hours / max) * 100}%` : 0 }}
      transition={{ duration: 0.9, ease, delay: seen ? (row ? 0.5 : 0.1) + i * 0.07 : 0 }}
      onMouseEnter={() => setHover(it.id)}
      onMouseLeave={() => setHover(null)}
      title={`${it.label}: ${it.hours} hrs`}
    />
  )

  return (
    <div className="hb" ref={ref}>
      <div className="hb-row">
        <div className="hb-label"><span className="label">Today, our estimate</span><span className="hb-total num">{totalBefore}<small> hrs a week</small></span></div>
        <div className="hb-track">{before.map((it, i) => seg(it, i, 0))}</div>
      </div>
      <div className="hb-row">
        <div className="hb-label"><span className="label">With your tools</span><span className="hb-total num">{totalAfter}<small> hrs a week</small></span></div>
        <div className="hb-track">
          {after.map((it, i) => seg(it, i, 1))}
          {back > 0 && (
            <motion.span className="hb-back" initial={{ opacity: 0 }} animate={{ opacity: seen ? 1 : 0 }} transition={{ delay: 1.3, duration: 0.5 }}>
              <span>{back} hrs back</span>
            </motion.span>
          )}
        </div>
      </div>
      <ul className="hb-legend">
        {before.map((b) => {
          const a = after.find((x) => x.id === b.id) || b
          const cut = b.hours - a.hours
          return (
            <li key={b.id} className={hover && hover !== b.id ? 'dim' : ''} onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)}>
              <i style={{ background: b.color }} />
              <span className="hb-l-name">{b.label}</span>
              <span className="hb-l-num num">{b.hours} <span aria-hidden>→</span><span className="sr-only">to</span> {a.hours}</span>
              <span className="hb-l-by">{cut > 0 && a.tools?.length ? `${a.tools.join(', ')}` : cut > 0 ? '' : 'No tool on this yet'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
