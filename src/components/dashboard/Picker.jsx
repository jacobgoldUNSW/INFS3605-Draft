import React, { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { getProduct } from '../../data/products'
import { recommendProducts, PAIN_POINTS } from '../../data/mockDashboard'
import { CatalogBrowser } from '../marketplace/ProductGrid'
import IconTile from '../ui/IconTile'

const ease = [0.22, 1, 0.36, 1]

function RecCard({ p, index, why }) {
  const { selected, toggle, setOpenId } = useApp()
  const on = selected.includes(p.id)
  return (
    <motion.div
      className={`rec-card ${on ? 'on' : ''}`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.08, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={{ y: -5 }}
    >
      <div className="rec-top">
        <IconTile p={p} size={52} />
        <div className="rec-text">
          <div className="rec-name">{p.name}</div>
          <div className="rec-why">{why}</div>
        </div>
      </div>
      <div className="rec-actions">
        <button className="link-btn" onClick={() => setOpenId(p.id, false)}>Peek inside</button>
        <motion.button className={`mini-btn ${on ? 'on' : ''}`} whileTap={{ scale: 0.9 }} onClick={() => toggle(p.id)}>
          {on ? '✓ Added' : '+ Add'}
        </motion.button>
      </div>
    </motion.div>
  )
}

/** A little bean that flies from the tapped card into the tray. */
function Flyer({ f, onDone }) {
  return (
    <motion.div
      className="flyer"
      style={{ background: `linear-gradient(145deg, ${f.from}, ${f.to})` }}
      initial={{ left: f.x, top: f.y, width: f.w, height: f.w, opacity: 1, borderRadius: f.w * 0.27 }}
      animate={{
        left: f.tx, top: f.ty, width: 40, height: 40, borderRadius: 11, opacity: [1, 1, 0.9],
        scale: [1, 1.15, 0.8],
      }}
      transition={{ duration: 0.8, ease: [0.5, 0, 0.2, 1] }}
      onAnimationComplete={onDone}
    >
      <span style={{ fontSize: 20 }}>{f.emoji}</span>
    </motion.div>
  )
}

export default function Picker() {
  const { survey, selected, toggle, setStep, showToast } = useApp()
  const trayRef = useRef(null)
  const [flyers, setFlyers] = useState([])

  const recs = useMemo(() => recommendProducts(survey).slice(0, 6), [survey])
  const reasonFor = (p) => {
    const hit = survey.pains
      .map((id) => PAIN_POINTS.find((x) => x.id === id))
      .find((pp) => pp && pp.use.some((u) => p.useCases.includes(u)))
    return hit ? `Helps with “${hit.label.toLowerCase()}”` : 'Popular with cafés like yours'
  }

  const onPick = (p, el) => {
    const adding = !selected.includes(p.id)
    if (adding) {
      const icon = el.querySelector('.icon-tile')?.getBoundingClientRect()
      const tray = trayRef.current?.getBoundingClientRect()
      if (icon && tray) {
        setFlyers((f) => [
          ...f,
          {
            key: Date.now() + Math.random(), x: icon.left, y: icon.top, w: icon.width,
            tx: tray.left + 24 + selected.length * 30, ty: tray.top + (tray.height - 40) / 2,
            from: p.from, to: p.to, emoji: p.emoji,
          },
        ])
      }
    }
    toggle(p.id)
  }

  const go = () => {
    if (!selected.length) return showToast('Pick at least one tool first', '☝️')
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="picker">
      <motion.div className="picker-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
        <span className="script-note big">great, thanks{survey.name ? ` — ${survey.name}` : ''}!</span>
        <h1>Now pick the <span className="script">tools</span> you’re curious about</h1>
        <p>Tap tiles to add them to your plan. Not sure? Hit the <span className="inline-plus">+</span> for a peek inside.</p>
      </motion.div>

      {recs.length > 0 && (
        <div className="rec-section">
          <div className="rec-title"><span className="script-note">recommended for you</span><span className="rec-sub">based on your answers</span></div>
          <div className="rec-row">
            {recs.map((p, i) => (
              <RecCard key={p.id} p={p} index={i} why={reasonFor(p)} />
            ))}
          </div>
        </div>
      )}

      <div className="rec-title all"><span className="script-note">the whole menu</span></div>
      <CatalogBrowser mode="pick" onPick={onPick} recommendedIds={recs.map((r) => r.id)} />

      <div className="tray-spacer" />

      {/* ----- selection tray ----- */}
      <motion.div
        className="tray"
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.5 }}
      >
        <div className="tray-icons" ref={trayRef}>
          <AnimatePresence initial={false}>
            {selected.length === 0 && (
              <motion.span key="empty" className="tray-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, position: 'absolute' }}>
                Your plan is empty — tap a tile ☝️
              </motion.span>
            )}
            {selected.slice(0, 7).map((id, i) => {
              const p = getProduct(id)
              return (
                <motion.div
                  key={id}
                  layout
                  className="tray-ico"
                  style={{ zIndex: 10 - i }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.55 }}
                  onClick={() => toggle(id)}
                  title={`Remove ${p.name}`}
                >
                  <IconTile p={p} size={40} radius={11} />
                </motion.div>
              )
            })}
            {selected.length > 7 && (
              <motion.span key="more" layout className="tray-more">+{selected.length - 7}</motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="tray-count">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b key={selected.length} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
              {selected.length}
            </motion.b>
          </AnimatePresence>
          <span>selected</span>
        </div>

        <motion.button
          className="btn primary glow"
          onClick={go}
          animate={{ opacity: selected.length ? 1 : 0.55 }}
          whileHover={selected.length ? { scale: 1.05 } : undefined}
          whileTap={{ scale: 0.95 }}
        >
          Brew my plan ✨
        </motion.button>
      </motion.div>

      {flyers.map((f) => (
        <Flyer key={f.key} f={f} onDone={() => setFlyers((fl) => fl.filter((x) => x.key !== f.key))} />
      ))}
    </div>
  )
}
