import React, { forwardRef, useRef } from 'react'
import { motion } from 'framer-motion'
import IconTile from '../ui/IconTile'
import { useApp } from '../../state'
import { Portrait } from '../cafe/WorkerInspector'
import { useCafeImages } from '../../sim/useCafeImages'

/**
 * Square app-style product card.
 * mode "market": click opens popup. mode "pick": click toggles selection.
 */
const ProductCard = forwardRef(function ProductCard({ p, index = 0, mode = 'market', onPick, recommended = false }, slotRef) {
  const { setOpenId, selected } = useApp()
  const images = useCafeImages()
  const isSel = selected.includes(p.id)
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 11).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`)
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  const handleClick = (e) => {
    if (mode === 'pick') onPick?.(p, e.currentTarget)
    else setOpenId(p.id)
  }

  return (
    <motion.div
      layout
      ref={slotRef}
      className="card-slot"
      initial={{ opacity: 0, y: 36, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{
        type: 'spring', stiffness: 260, damping: 26,
        delay: Math.min(index * 0.04, 0.5),
        layout: { type: 'spring', stiffness: 300, damping: 32 },
      }}
    >
      <motion.div
        layoutId={`card-${p.id}`}
        className={`pcard ${isSel ? 'is-selected' : ''} ${mode === 'pick' ? 'is-pick' : ''}`}
        style={{ borderRadius: 26 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        ref={ref}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleClick(e))}
        aria-label={`${p.name} — ${mode === 'pick' ? 'toggle' : 'open details'}`}
      >
        <span className="pcard-glow" />
        <div className="pcard-inner">
          <button
            className="plus-btn"
            aria-label={`More about ${p.name}`}
            onClick={(e) => {
              e.stopPropagation()
              setOpenId(p.id)
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {recommended && <span className="rec-badge">✨ For you</span>}

          <div className="pcard-icon">
            <IconTile p={p} size={72} radius={20} />
            {isSel && (
              <motion.span
                className="sel-check"
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.1 }} />
                </svg>
              </motion.span>
            )}
          </div>
          <div className="pcard-name">{p.name}</div>
          <p className="pcard-blurb">{p.tagline}</p>
          <span className="worker-pill soft pcard-worker" style={{ '--a': p.from, '--b': p.to }}>
            {images ? <Portrait images={images} sprite={p.id} size={18} /> : <span aria-hidden>{p.worker.emoji}</span>}
            {mode === 'pick' ? `Unlocks ${p.worker.name} in your café` : `Meet ${p.worker.name}, your ${p.worker.role.split(' ')[0].toLowerCase()} help`}
          </span>

          <div className="pcard-footer">
            <span className="pcard-meta">⏱️ ~{p.hrs}h/wk · {p.priceLabel}</span>
            <span className={`pcard-pill ${isSel ? 'on' : ''}`}>
              {mode === 'pick' ? (isSel ? '✓ Added' : '+ Add to plan') : 'Peek inside →'}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})

export default ProductCard
