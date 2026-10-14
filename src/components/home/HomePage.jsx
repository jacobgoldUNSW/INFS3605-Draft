import React from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../state'
import { PRODUCTS } from '../../data/products'
import IconTile, { Reveal } from '../ui/IconTile'

const WORDS = [
  { text: 'Smarter', script: false },
  { text: 'cafés', script: true },
  { text: 'start', script: false },
  { text: 'here.', script: false },
]

export default function HomePage() {
  const { setTab, setOpenId } = useApp()
  const featured = PRODUCTS.slice(0, 4)

  return (
    <div className="page home">
      {/* ----------------- Hero ----------------- */}
      <section className="home-hero">
        <motion.div
          className="hero-kicker"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <span className="script-note">fresh-brewed</span> AI tools for independent café owners
        </motion.div>

        <h1 className="home-hero-title">
          {WORDS.map((w, i) => (
            <span className="word-mask" key={w.text}>
              <motion.span
                className={`word ${w.script ? 'script' : ''}`}
                initial={{ y: '110%', rotate: 3 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.25 + i * 0.1 }}
              >
                {w.text}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className="home-hero-sub"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          No Silicon Valley jargon. No endless slide decks. Just friendly, down-to-earth AI tools
          that help small coffee shops, bakeries, and brunch spots save time, reduce food waste, and win back their evenings.
        </motion.p>

        <motion.div
          className="home-hero-actions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.6 }}
        >
          <button
            className="btn primary hero-btn"
            onClick={() => {
              setTab('marketplace')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Browse the AI Pantry →
          </button>
          <button
            className="btn ghost hero-btn"
            onClick={() => {
              setTab('dashboard')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Brew My Custom Plan ✨
          </button>
        </motion.div>

        <motion.div
          className="hero-squiggle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          aria-hidden
        >
          <svg viewBox="0 0 240 20" width="240" height="20" fill="none">
            <motion.path
              d="M3 14 C 26 2, 42 20, 65 10 S 105 2, 128 12 S 170 20, 192 10 S 226 4, 238 12"
              stroke="#C85A24"
              strokeWidth="3.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.3, delay: 1, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>
      </section>

      {/* ----------------- How It Works ----------------- */}
      <section className="home-sec">
        <Reveal className="home-sec-head">
          <span className="script-note">simple as 1-2-3</span>
          <h2>How Brewmind works for your shop</h2>
        </Reveal>

        <div className="steps-grid">
          <Reveal delay={0.08} className="step-card">
            <div className="step-num-pill">Step 1</div>
            <div className="step-card-ico">☕</div>
            <h3>Explore the AI Pantry</h3>
            <p>
              Browse 24 handpicked AI tools tailored for cafés. Each tile gives you a clear 1-line blurb,
              plus deep-dive details on setup time, typical costs, and pros & cons.
            </p>
          </Reveal>

          <Reveal delay={0.16} className="step-card">
            <div className="step-num-pill">Step 2</div>
            <div className="step-card-ico">📝</div>
            <h3>Share Your Setup</h3>
            <p>
              Take a friendly 7-question survey about your team size, morning rushes, and biggest time sinks.
              Pick the tools you are curious about to add to your plan.
            </p>
          </Reveal>

          <Reveal delay={0.24} className="step-card">
            <div className="step-num-pill">Step 3</div>
            <div className="step-card-ico">📊</div>
            <h3>Sip Your Custom Plan</h3>
            <p>
              Review a personalised dashboard with an interactive "Before / After" toggle showing
              projected hours saved, monthly net gains, phased rollout steps, and real risks to watch.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ----------------- Featured Shelf ----------------- */}
      <section className="home-sec">
        <Reveal className="home-sec-head between">
          <div>
            <span className="script-note">on the counter</span>
            <h2>Popular tools cafe owners start with</h2>
          </div>
          <button
            className="link-btn see-all-btn"
            onClick={() => {
              setTab('marketplace')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            See all 24 tools in the Marketplace →
          </button>
        </Reveal>

        <div className="featured-grid">
          {featured.map((p, idx) => (
            <Reveal
              key={p.id}
              delay={idx * 0.08}
              className="featured-card"
              onClick={() => setOpenId(p.id, false)}
            >
              <div className="fc-top">
                <IconTile p={p} size={64} radius={18} />
                <span className="fc-badge">{p.price}</span>
              </div>
              <h4 className="fc-name">{p.name}</h4>
              <p className="fc-blurb">{p.tagline}</p>
              <div className="fc-footer">
                <span className="fc-hrs">⏱️ ~{p.hrs} hrs/wk saved</span>
                <span className="fc-peek">Peek inside →</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------- Cozy Quote ----------------- */}
      <Reveal className="home-quote-card">
        <div className="quote-mark">“</div>
        <p className="quote-text">
          We used to spend whole Sunday nights doing paper rosters and guessing next week’s milk orders.
          Setting up smart scheduling and invoice capture gave us our evenings back.
        </p>
        <div className="quote-author">
          <b>Sam & Mia</b>
          <span>Owners of The Corner Grinder · Sydney, NSW</span>
        </div>
      </Reveal>
    </div>
  )
}
