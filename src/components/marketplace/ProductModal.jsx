import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEPARTMENTS, USE_CASES, PRICES_CHECKED, getProduct, connectionsFor, brandInk } from '../../data/products'
import { RISK_THEMES } from '../../data/risks'
import { useApp } from '../../state'
import IconTile, { BrandLogo } from '../ui/IconTile'
import AnimatedNumber from '../ui/AnimatedNumber'
import BeanBurst from '../ui/BeanBurst'
import PlaceholderTag from '../ui/PlaceholderTag'
import { PEOPLE, photo } from '../../data/people'
import { Portrait } from '../cafe/WorkerInspector'
import ToolClip, { signatureOf } from '../cafe/ToolClip'
import { useCafeImages } from '../../sim/useCafeImages'

const ease = [0.22, 1, 0.36, 1]

/** One to five coffee beans, with the word that says what it means. */
function Beans({ label, value, words }) {
  const n = Math.max(1, Math.min(5, Math.round(value / 20)))
  return (
    <div className="beans">
      <span className="beans-label">{label}</span>
      <span className="beans-row" role="img" aria-label={`${n} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} viewBox="0 0 20 26" width="15" height="19" className={i <= n ? 'on' : ''} aria-hidden>
            <ellipse cx="10" cy="13" rx="8.4" ry="11.4" />
            <path d="M10.6 2.6c-3.4 5.6 2.6 10.2-.6 20.8" fill="none" />
          </svg>
        ))}
      </span>
      <span className="beans-word">{words[n - 1]}</span>
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
  const { selected, toggle, showToast, openShared, guard } = useApp()
  const inPlan = selected.includes(p.id)
  const [burst, setBurst] = useState(0)
  const [clip, setClip] = useState(false)
  const images = useCafeImages()

  const handleAdd = () => guard('add', () => {
    if (!inPlan) {
      setBurst((b) => b + 1)
      showToast(`${p.worker.name} (${p.name}) joins your café`, '✅')
      toggle(p.id)
    } else {
      showToast(`${p.name} removed from your plan`, '👋')
      toggle(p.id)
    }
  })
  const person = PEOPLE[p.testimonial?.person]
  const depts = DEPARTMENTS.filter((d) => p.departments.includes(d.id))
  const ucs = USE_CASES.filter((u) => p.useCases.includes(u.id))
  const links = connectionsFor(p.id)
  const sig = signatureOf(p.id)
  const site = p.url ? new URL(p.url).hostname.replace(/^www\./, '') : null

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
        <aside className={`modal-hero ${brandInk(p) !== '#ffffff' ? 'light' : ''}`} style={{ background: `linear-gradient(160deg, ${p.from}, ${p.to})` }}>
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

          <motion.div variants={rise} className="modal-worker">
            <span className="mw-portrait"><Portrait images={images} sprite={p.id} size={34} /></span>
            <span><b>Meet {p.worker.name}</b><small>{p.worker.role}: {p.worker.job}</small></span>
          </motion.div>

          <motion.div variants={rise} className="modal-meta">
            <span className="pill glass">💲 {p.priceLabel}</span>
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
                      Add {p.worker.name} to my café
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            {p.url && (
              <a className="vendor-link" href={p.url} target="_blank" rel="noopener noreferrer">
                <span>Prices &amp; sign-up on {site} <span aria-hidden>↗</span></span>
                <small>{p.pricing?.trial || 'Opens the vendor’s own website'}</small>
              </a>
            )}
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
                <div className="stat-val price">{p.priceLabel}</div>
                <div className="stat-lab">checked {PRICES_CHECKED}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-ico">🛠️</div>
                <div className="stat-val"><AnimatedNumber value={p.weeks} duration={1} format={(n) => Math.round(n)} /><small> wk{p.weeks > 1 ? 's' : ''}</small></div>
                <div className="stat-lab">to set up</div>
              </div>
            </div>
            {p.pricing && <p className="price-note"><b>{p.pricing.plan}</b> · {p.pricing.note}. Prices change, so check {site || 'the vendor’s site'} before you sign up.</p>}
          </motion.section>

          {sig && (
            <motion.section variants={rise} className="m-sec">
              <h4 className="m-title"><span className="script-note">see it in action</span></h4>
              {clip ? (
                <>
                  <ToolClip id={p.id} />
                  <p className="clip-note">{p.worker.name} handles a {sig.title.toLowerCase()} in a pretend café. A scripted demo, so it doesn’t use AI.</p>
                </>
              ) : (
                <button type="button" className="clip-btn" onClick={() => setClip(true)}>
                  <span aria-hidden>▶</span> Watch {p.worker.name} handle {sig.id === 'rush' ? 'the morning rush' : sig.id === 'rain' ? 'a rainy morning' : sig.id === 'sick' ? 'a sick call-in' : sig.id === 'review' ? 'a new review' : 'a delivery'}
                </button>
              )}
            </motion.section>
          )}

          {person && (
            <motion.section variants={rise} className="m-sec">
              <div className="m-testimonial">
                <img src={photo(p.testimonial.person, 160, 160)} alt="" />
                <div>
                  <PlaceholderTag />
                  <p>“{p.testimonial.quote}”</p>
                  <span><b>{person.name}</b> · {person.role}, {person.cafe} · {person.city}</span>
                </div>
              </div>
            </motion.section>
          )}

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

          {p.setup && (
            <motion.section variants={rise} className="m-sec">
              <h4 className="m-title"><span className="script-note">how you’d set it up</span></h4>
              <div className="setup-peek">
                <div className="setup-peek-meta"><span>⏱️ about {p.setup.minutes} mins on a quiet afternoon</span><span>👤 {p.setup.owner}</span></div>
                <ol>{p.setup.steps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
                <p className="setup-peek-safe">🛡️ <b>First-week check:</b> {p.setup.safety}</p>
              </div>
            </motion.section>
          )}

          <motion.section variants={rise} className="m-sec two">
            <div>
              <h4 className="m-title"><span className="script-note">where it helps</span></h4>
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
            <div className="beans-box">
              <Beans label="Time saved" value={p.metrics.time} words={['A little time', 'Some time', 'Good time-saver', 'Big time-saver', 'Huge time-saver']} />
              <Beans label="Setup" value={p.metrics.setup} words={['Tricky', 'Takes effort', 'Fair', 'Easy', 'Very easy']} />
              <Beans label="Value" value={p.metrics.cost} words={['Pricey', 'Fair value', 'Good value', 'Great value', 'Excellent value']} />
            </div>
          </motion.section>

          {links.length > 0 && (
            <motion.section variants={rise} className="m-sec">
              <h4 className="m-title"><span className="script-note">works with</span></h4>
              <ul className="works-with">
                {links.map((c) => {
                  const other = getProduct(c.from === p.id ? c.to : c.from)
                  return (
                    <li key={c.from + c.to}>
                      <span className="ww-pair">
                        <span className="ww-logo" style={{ '--a': getProduct(c.from).from, '--b': getProduct(c.from).to }}><BrandLogo id={c.from} size={14} /></span>
                        <i aria-hidden>→</i>
                        <span className="ww-logo" style={{ '--a': getProduct(c.to).from, '--b': getProduct(c.to).to }}><BrandLogo id={c.to} size={14} /></span>
                      </span>
                      <span><b>{other.name}</b> · {c.what}</span>
                    </li>
                  )
                })}
              </ul>
            </motion.section>
          )}

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
            {p.wont && <p className="wont"><b>What it won’t do:</b> {p.wont}</p>}
          </motion.section>

          {p.risks?.length > 0 && (
            <motion.section variants={rise} className="m-sec">
              <h4 className="m-title"><span className="script-note">the honest version</span></h4>
              <div className="reality">
                <p className="reality-lede"><b>Risks &amp; limitations</b> worth knowing before you sign up. Not reasons to avoid {p.name}, just the questions to ask.</p>
                <ul className="reality-list">
                  {p.risks.map((r) => (
                    <motion.li key={r.title} variants={pop} className="reality-item">
                      <span className="reality-ico" aria-hidden>{RISK_THEMES[r.theme]?.icon}</span>
                      <div>
                        <b>{r.title}</b>
                        <span className="reality-theme">{RISK_THEMES[r.theme]?.title}</span>
                        <p>{r.detail}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.section>
          )}
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
    document.body.classList.add('modal-open', 'product-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('product-open')
      // the sign-in modal may still be open on top of this one
      if (!document.body.classList.contains('auth-open')) document.body.classList.remove('modal-open')
    }
  }, [openId])

  return (
    <AnimatePresence>
      {p && (
        <motion.div
          key="overlay"
          className="overlay product-overlay"
          onClick={close}
          initial={{ backgroundColor: 'rgba(59,36,22,0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
          animate={{ backgroundColor: 'rgba(59,36,22,0.38)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          exit={{ backgroundColor: 'rgba(59,36,22,0)', backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.45, ease }}
        >
          <Panel key={p.id} p={p} onClose={close} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
