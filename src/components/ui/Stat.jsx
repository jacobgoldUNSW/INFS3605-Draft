import React, { useId, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon'

/** A big number with a one-line meaning. Hover (or tap "How we got this") to see the working. */
export default function Stat({ icon, label, value, unit, blurb, why, visual, className = '', align = 'left' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div
      className={`stat ${className}`}
      onMouseEnter={() => why && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ textAlign: align }}
    >
      <div className="stat-top">
        {icon && <Icon name={icon} size={20} className="stat-ico" />}
        <span className="label">{label}</span>
      </div>
      <div className="stat-body">
        {visual}
        <div>
          <div className="stat-val">{value}{unit && <small>{unit}</small>}</div>
          {blurb && <p className="stat-blurb">{blurb}</p>}
        </div>
      </div>
      {why && (
        <button type="button" className="stat-why" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
          How we got this
        </button>
      )}
      <AnimatePresence>
        {open && why && (
          <motion.div id={id} role="note" className="pop" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }}>
            {why}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
