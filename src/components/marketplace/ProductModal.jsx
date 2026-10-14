import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEPARTMENTS, USE_CASES, getProduct } from '../../data/products'
import { useApp } from '../../state'
import IconTile from '../ui/IconTile'
import AnimatedNumber from '../ui/AnimatedNumber'
import BeanBurst from '../ui/BeanBurst'

const ease = [0.22, 1, 0.36, 1]

function Gauge({ label, value, color, delay = 0, display }) {
  const r = 34
  return (
    <div className="gauge">
      <div className="gauge-ring">
        <svg viewBox="0 0 80 80" width="84" height="84">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(139,94,60,0.14)" strokeWidth="8" />
          <motion.circle
            cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            transform="rotate(-90 40 40)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: value / 100 }}
            transition={{ duration: 1.3, delay: 0.55 + delay, ease }}
          />
        </svg>
        <div className="gauge-num">
          <AnimatedNumber value={value} duration={1.3} format={(n) => display ?? `${Math.round(n)}`} />
        </div>
      </div>
      <div className="gauge-label">{label}</div>
    </div>
  )
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, delay: 0.12, staggerChildren: 0.06, delayChildren: 0.28 } },
}
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
}
const pop = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 22 } },
}

function Panel({ p, onClose }) {
  const { selected, toggle, showToast, openShared } = useApp()
  const inPlan = selected.includes(p.id)
  const [burst, setBurst] = useState(0)

  const handleAdd = () => {
    if (!inPlan) {
      setBurst((b) => b + 1)
      showToast(`${p.name} added to your plan`, '✅')
    } else showToast(`${p.name} removed from your plan`, '👋')
    toggle(p.id)
  }

  const depts = DEPARTMENTS.filter((d) => p.departments.includes(d.id))
  const ucs = USE_CASES.filter((u) => p.useCases.includes(u.id))

  return (
    <motion.div
      layoutId={openShared ? `card-${p.id}` : undefined}
      className="modal"
      style={{ borderRadius: 32 }}
      initial={openShared ? undefined : { opacity: 0, y: 60, scale: 0.92 }}
      animate={openShared ? undefined : { opacity: 1, y: 0, scale: 1 }}
      exit={openShared ? undefined : { opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 230, damping: 30, mass: 0.9 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${p.name} details`}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.button
        className="modal-close"
        onClick={onClose}
        aria-label="Close"
        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ rotate: 90, scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </motion.button>

      <motion.div className="modal-content" initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.12 } }} variants={stagger}>
        {/* ---------- Left: hero ---------- */}
        <aside className="modal-hero" style={{ background: `linear-gradient(160deg, ${p.from}, ${p.to})` }}>
          <div className="hero-orbs" aria-hidden>
            {[...p.useCaseItems.map((u) => u.i), p.emoji].slice(0, 5).map((e, i) => (
              <motion.span
                key={i}
                className="orb"
                style={{ left: `${[8, 78, 18, 70, 44][i]}%`, top: `${[10, 16, 76, 70, 90][i]}%`, fontSize: [28, 22, 24, 30, 20][i] }}
                animate={{ y: [0, -10, 0], rotate: [0, i % 2 ? 8 : -8, 0] }}
                transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              >
                {e}
              </motion.span>
            ))}
          </div>

          <motion.div variants={pop} className="hero-icon">
            <IconTile p={p} size={112} radius={30} className="big" />
          </motion.div>
          <motion.h2 variants={rise} className="modal-name">{p.name}</motion.h2>
          <motion.p variants={rise} className="modal-tag">{p.tagline}</motion.p>
          <motion.p variants={rise} className="modal-desc">{p.description}</motion.p>

          <motion.div variants={rise} className="modal-meta">
            <span className="pill glass">💲 {p.price}</span>
            {ucs.slice(0, 2).map((u) => (
              <span key={u.id} className="pill glass">{u.icon} {u.label}</span>
            ))}
          </motion.div>

          <motion.div variants={rise} className="modal-cta-wrap">
            <motion.button
              className={`cta ${inPlan ? 'added' : ''}`}
              onClick={handleAdd}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
            >
              <BeanBurstHost k={burst} />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={inPlan ? 'in' : 'out'}
                  className="cta-inner"
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {inPlan ? (
                    <>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      In my plan
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      Add to my plan
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </aside>

        {/* ---------- Right: visual details ---------- */}
        <div className="modal-body">
          <motion.section variants={rise} className="m-sec">
            <h4 className="m-title"><span className="script-note">at a glance</span></h4>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="stat-ico">⏱️</div>
                <div className="stat-val"><AnimatedNumber value={p.hrs} duration={1} format={(n) => Math.round(n)} /><small> hrs</small></div>
                <div className="stat-lab">saved / week</div>
              </div>
              <div className="stat-tile">
                <div className="stat-ico">💳</div>
                <div className="stat-val">~$<AnimatedNumber value={p.cost} duration={1} format={(n) => Math.round(n)} /><small>/mo</small></div>
                <div className="stat-lab">typical cost</div>
              </div>
              <div className="stat-tile">
                <div className="stat-ico">🛠️</div>
                <div className="stat-val"><AnimatedNumber value={p.weeks} duration={1} format={(n) => Math.round(n)} /><small> wk{p.weeks > 1 ? 's' : ''}</small></div>
                <div className="stat-lab">to set up</div>
              </div>
            </div>
          </motion.section>

          <motion.section variants={rise} className="m-sec">
            <h4 className="m-title"><span className="script-note">what it does for your café</span></h4>
            <div className="uc-grid">
              {p.useCaseItems.map((u) => (
                <motion.div key={u.t} variants={pop} className="uc-tile" whileHover={{ y: -4, rotate: -1.5 }}>
                  <span className="uc-ico">{u.i}</span>
                  <span>{u.t}</span>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={rise} className="m-sec two">
            <div>
              <h4 className="m-title"><span className="script-note">best for</span></h4>
              <div className="dept-row">
                {depts.map((d) => (
                  <motion.span key={d.id} variants={pop} className="dept"><i>{d.icon}</i>{d.label}</motion.span>
                ))}
              </div>
              <div className="dept-row mt">
                {p.bestFor.map((b) => (
                  <motion.span key={b} variants={pop} className="dept soft">☕ {b}</motion.span>
                ))}
              </div>
            </div>
            <div className="gauges">
              <Gauge label="Time saved" value={p.metrics.time} color="#D9772B" />
              <Gauge label="Easy setup" value={p.metrics.setup} color="#6F9560" delay={0.1} />
              <Gauge label="Value" value={p.metrics.cost} color="#8B5E3C" delay={0.2} />
            </div>
          </motion.section>

          <motion.section variants={rise} className="m-sec">
            <div className="proscons">
              <div className="pc pros">
                <h4><span className="pc-badge good">👍</span> The good stuff</h4>
                {p.pros.map((t) => (
                  <motion.div key={t} variants={pop} className="pc-item good">
                    <span className="pc-mark">✓</span>{t}
                  </motion.div>
                ))}
              </div>
              <div className="pc cons">
                <h4><span className="pc-badge bad">⚠️</span> Keep in mind</h4>
                {p.cons.map((t) => (
                  <motion.div key={t} variants={pop} className="pc-item bad">
                    <span className="pc-mark">!</span>{t}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </motion.div>
  )
}

function BeanBurstHost({ k }) {
  if (!k) return null
  return <BeanBurst key={k} />
}

export default function ProductModal() {
  const { openId, setOpenId } = useApp()
  const p = openId ? getProduct(openId) : null
  const close = () => setOpenId(null)

  useEffect(() => {
    if (!openId) return
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [openId])

  return (
    <AnimatePresence>
      {p && (
        <motion.div
          key="overlay"
          className="overlay"
          onClick={close}
          initial={{ backgroundColor: 'rgba(59,36,22,0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
          animate={{ backgroundColor: 'rgba(59,36,22,0.38)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          exit={{ backgroundColor: 'rgba(59,36,22,0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.45, ease }}
        >
          <Panel p={p} onClose={close} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
