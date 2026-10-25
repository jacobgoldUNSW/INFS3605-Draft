import React, { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp, surveyComplete } from '../../state'
import { PRODUCTS, getProduct } from '../../data/products'
import { PEER_STORIES, PEOPLE, AUTH_QUOTE, photo } from '../../data/people'
import IconTile, { Reveal } from '../ui/IconTile'
import CafeTeaser, { TEASER_TEAM } from '../cafe/CafeTeaser'
import PlaceholderTag from '../ui/PlaceholderTag'

const WORDS = [
  { text: 'Less', script: false },
  { text: 'paperwork.', script: false, br: true },
  { text: 'More', script: false },
  { text: 'flat whites.', script: true },
]

// shown until the teaser's own moments start arriving
const FLOATERS = [
  { icon: '⏱️', big: '+6 hrs', small: 'back every week', cls: 'f1' },
  { icon: '🧾', big: '+$49 saved', small: 'Dex caught an oat-milk overcharge', cls: 'f2' },
  { icon: '🌧️', big: 'Rainy-day deal', small: 'Cami asked you first ✓', cls: 'f3' },
]

function Seal() {
  return (
    <motion.div className="seal" aria-hidden initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 1.1 }}>
      <svg viewBox="0 0 120 120" width="112" height="112">
        <defs>
          <path id="seal-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <circle cx="60" cy="60" r="56" fill="#3B2416" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#F2B46D" strokeWidth="1.2" strokeDasharray="2 4" />
        <g className="seal-spin">
          <text fontFamily="'DM Sans', sans-serif" fontWeight="700" fontSize="9.4" fill="#FAF4EC">
            <textPath href="#seal-circle" textLength="272" lengthAdjust="spacing">BREWED FOR SMALL CAFÉS ✦ BREWED FOR SMALL CAFÉS ✦</textPath>
          </text>
        </g>
        <text x="60" y="70" textAnchor="middle" fontSize="28">☕</text>
      </svg>
    </motion.div>
  )
}

// the questions sceptical owners ask first, answered straight
const FAQS = [
  {
    q: 'Will it replace my staff?',
    a: 'No. These tools take the paperwork, not the people. Your team keeps making coffee and talking to customers while the tools handle invoices, rosters and reminders in the background.',
    quote: { person: 'chloe', text: 'A 5:30am sick text used to mean I worked a double. Now cover is sorted before I’m out of bed.' },
  },
  {
    q: 'Is my customers’ data safe?',
    a: 'Each tool keeps your data under its own privacy terms, and you can export it and leave. Start with tools that don’t hold customer details, like Dext or Deputy, and never paste customer details into a free chatbot.',
  },
  {
    q: 'What if it gets something wrong?',
    a: 'Nothing important happens without your yes. The tools draft; you approve anything that spends money, messages a customer or answers an allergy question. Check every draft for the first few weeks.',
    quote: { person: 'emma', text: 'We went from 4.3 to 4.7 stars in two months, and I still approve every allergy answer.' },
  },
  {
    q: 'Can I cancel? What will it really cost?',
    a: 'Most tools are month to month, and Square, Ordermentum, Mailchimp and Canva have free plans. A few, like Podium and Slang.ai, are sold after a demo, sometimes on a contract. Your plan shows the whole monthly bill before you sign up for anything.',
  },
]

function Story({ s, i }) {
  const { setOpenId } = useApp()
  const person = PEOPLE[s.person]
  return (
    <Reveal delay={i * 0.08} className="story-card">
      <div className="story-photo" style={{ backgroundImage: `url(${photo(s.person, 640, 480)})` }}>
        <span className="story-stat">{s.stat}</span>
      </div>
      <div className="story-body">
        <PlaceholderTag />
        <p className="story-skeptic">{s.skeptic}</p>
        <p className="story-win">{s.win}</p>
        <div className="story-foot">
          <div>
            <b>{person.name}</b>
            <span>{person.role} · {person.cafe}, {person.city}</span>
          </div>
          <div className="story-tools">
            {s.tools.map((id) => {
              const tool = getProduct(id)
              return (
                <button key={id} type="button" className="story-tool" title={`${tool.name}: ${tool.tagline}`} aria-label={`About ${tool.name}`} onClick={() => setOpenId(id, false)}>
                  <IconTile p={tool} size={26} radius={8} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Reveal>
  )
}

export function PeerStories({ stories = PEER_STORIES.slice(0, 3), title = 'From one café owner to another', note = 'real people, real evenings back' }) {
  return (
    <section className="home-sec">
      <Reveal className="home-sec-head">
        <span className="script-note">{note}</span>
        <h2>{title}</h2>
      </Reveal>
      <div className="story-grid">
        {stories.map((s, i) => <Story key={s.id} s={s} i={i} />)}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { setTab, setOpenId, guard, user, survey, selected } = useApp()
  const featured = ['dext', 'canva', 'deputy', 'square'].map(getProduct)
  const couple = PEOPLE[AUTH_QUOTE.person]
  // a returning owner sees their own café (name, team, size and type) in the preview
  const signedIn = !!user
  const ready = signedIn && surveyComplete(survey) && selected.length > 0
  const cafeLabel = signedIn ? (survey.name || user.cafeName || 'Your café') : 'Little Fern Café'
  const team = ready ? selected : TEASER_TEAM
  // the floating cards narrate what's happening in the preview, three slots that refresh in turn
  const [slots, setSlots] = useState(() => FLOATERS.map((f, i) => ({ ...f, key: `seed${i}` })))
  const nextSlot = useRef(0)
  const onMoment = useCallback((m) => {
    const n = nextSlot.current++
    setSlots((cur) => cur.map((x, i) => (i === n % 3 ? { ...m, key: `moment-${n}` } : x)))
  }, [])

  const brew = () => guard('brew', () => {
    setTab('dashboard')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  return (
    <div className="page home">
      {/* ----------------- Hero ----------------- */}
      <section className="home-hero two">
        <div className="hero-left">
          <motion.div className="hero-kicker" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <span className="script-note">for busy café owners, not tech bros</span>
          </motion.div>

          <h1 className="home-hero-title">
            {WORDS.map((w, i) => (
              <React.Fragment key={w.text}>
                <span className="word-mask">
                  <motion.span
                    className={`word ${w.script ? 'script' : ''}`}
                    initial={{ y: '110%', rotate: 3 }}
                    animate={{ y: 0, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.25 + i * 0.1 }}
                  >
                    {w.text}
                    {w.script && (
                      <svg className="hero-squiggle-under" viewBox="0 0 240 20" fill="none" aria-hidden>
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
                    )}
                  </motion.span>
                </span>
                {w.br && <br />}
              </React.Fragment>
            ))}
          </h1>

          <motion.p className="home-hero-sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
            Meet a friendly crew of helpers who take invoices, rosters and supplier orders off your plate —
            and always ask you before anything important.
          </motion.p>

          <motion.div className="home-hero-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6 }}>
            <motion.button className="btn primary hero-btn" onClick={brew} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              Brew my plan ✨
            </motion.button>
            <button
              className="btn ghost hero-btn"
              onClick={() => {
                setTab('marketplace')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              Browse the AI pantry →
            </button>
          </motion.div>
          {signedIn ? (
            <motion.div className="welcome-back" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
              <span className="wb-hi">Welcome back, <b>{cafeLabel}</b></span>
              <span className="wb-sub">{ready ? `${selected.length} AI team-mate${selected.length === 1 ? ' is' : 's are'} waiting in your café.` : 'Your plan is half-brewed. Pick up where you left off.'}</span>
              <button type="button" className="wb-go" onClick={brew}>{ready ? 'Open my café ▸' : 'Keep going ▸'}</button>
            </motion.div>
          ) : (
            <motion.div className="hero-trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
              <div className="hero-faces">
                {['mia', 'daniel', 'amira', 'jack'].map((k) => <img key={k} src={photo(k, 96, 96)} alt="" />)}
              </div>
              <span>Built for owners who swore they’d never use AI</span>
            </motion.div>
          )}
        </div>

        <motion.div className="hero-right" initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <div className="hero-window">
            <div className="hero-window-bar">
              <i /><i /><i />
              <span>{cafeLabel} · <em className="hwb-extra">golden hour · </em>a scripted preview</span>
            </div>
            <CafeTeaser
              key={`${cafeLabel}|${team.join(',')}`}
              cafeName={signedIn ? cafeLabel : 'Little Fern'}
              team={team}
              profile={signedIn ? { employees: survey.employees, cafeType: survey.cafeType } : undefined}
              onMoment={onMoment}
            />
          </div>
          {slots.map((f, i) => (
            <motion.div
              key={`slot${i}`}
              className={`hero-float f${i + 1}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{ opacity: { delay: 1 + i * 0.25 }, y: { duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 } }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={f.key} className="hf-inner" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.35 }}>
                  <span className="hf-ico">{f.icon}</span>
                  <span className="hf-text"><b>{f.big}</b><small>{f.small}</small></span>
                </motion.span>
              </AnimatePresence>
            </motion.div>
          ))}
          <Seal />
        </motion.div>
      </section>

      {/* ----------------- Peer stories ----------------- */}
      <PeerStories />

      {/* ----------------- How It Works ----------------- */}
      <section className="home-sec">
        <Reveal className="home-sec-head">
          <span className="script-note">simple as 1-2-3</span>
          <h2>How it works</h2>
        </Reveal>

        <div className="steps-grid">
          <Reveal delay={0.08} className="step-card">
            <div className="step-num-pill">Step 1</div>
            <div className="step-card-ico">☕</div>
            <h3>Tell us about your café</h3>
            <p>Eight quick taps about your team, your rushes and the headache that keeps you up at night.</p>
          </Reveal>

          <Reveal delay={0.16} className="step-card">
            <div className="step-num-pill">Step 2</div>
            <div className="step-card-ico">🧺</div>
            <h3>Browse &amp; pick your tools</h3>
            <p>Each tool is a friendly team-mate — Dex reads dockets, Cami makes the specials board. You stay the boss.</p>
          </Reveal>

          <Reveal delay={0.24} className="step-card">
            <div className="step-num-pill">Step 3</div>
            <div className="step-card-ico">🔁</div>
            <h3>See your before &amp; after</h3>
            <p>Watch your café run with and without them, then see the hours, dollars and quiet-Tuesday setup steps.</p>
          </Reveal>
        </div>
      </section>

      {/* ----------------- Fair questions ----------------- */}
      <section className="home-sec">
        <Reveal className="home-sec-head">
          <span className="script-note">fair questions</span>
          <h2>What sceptical owners ask us first</h2>
        </Reveal>
        <div className="faq-grid">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.06} className="faq-card">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
              {f.quote && (
                <figure className="faq-quote">
                  <img src={photo(f.quote.person, 80, 80)} alt="" />
                  <figcaption>
                    <PlaceholderTag />
                    <span>“{f.quote.text}”</span>
                    <small>{PEOPLE[f.quote.person].name}, {PEOPLE[f.quote.person].cafe}</small>
                  </figcaption>
                </figure>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------- Featured Shelf ----------------- */}
      <section className="home-sec">
        <Reveal className="home-sec-head between">
          <div>
            <span className="script-note">on the counter today</span>
            <h2>Popular tools café owners start with</h2>
          </div>
          <button
            className="link-btn see-all-btn"
            onClick={() => {
              setTab('marketplace')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            See all {PRODUCTS.length} tools in the pantry →
          </button>
        </Reveal>

        <div className="featured-grid">
          {featured.map((p, idx) => (
            <Reveal key={p.id} delay={idx * 0.08} className="featured-card" onClick={() => setOpenId(p.id, false)}>
              <div className="fc-top">
                <IconTile p={p} size={64} radius={18} />
                <span className="fc-badge">{p.priceLabel}</span>
              </div>
              <h4 className="fc-name">{p.name}</h4>
              <p className="fc-blurb">{p.tagline}</p>
              <span className="worker-pill soft">{p.worker.emoji} {p.worker.name} joins your café</span>
              <div className="fc-footer">
                <span className="fc-hrs">⏱️ ~{p.hrs} hrs/wk saved</span>
                <span className="fc-peek">Peek inside →</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------- Cozy Quote ----------------- */}
      <Reveal className="home-quote-card with-photo">
        <div className="quote-photo" style={{ backgroundImage: `url(${photo(AUTH_QUOTE.person, 560, 560)})` }} />
        <div>
          <PlaceholderTag />
          <div className="quote-mark">“</div>
          <p className="quote-text">
            We used to spend whole Sunday nights doing paper rosters and guessing next week’s milk orders.
            Handing the invoices and rosters to a couple of tools gave us our evenings back.
          </p>
          <div className="quote-author">
            <b>{couple.name}</b>
            <span>{couple.role} of {couple.cafe} · {couple.city}</span>
          </div>
        </div>
      </Reveal>

      {/* ----------------- One last nudge ----------------- */}
      <Reveal className="home-cta">
        <span className="script-note">ready when you are</span>
        <h2>See your own café, with your own team</h2>
        <p>It takes about four minutes: a few quick taps about your café, pick some tools, then watch.</p>
        <motion.button className="btn primary hero-btn" onClick={brew} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
          {ready ? 'Open my café plan ✨' : 'Brew my plan ✨'}
        </motion.button>
      </Reveal>
    </div>
  )
}
