import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp, surveyComplete } from '../../state'
import { hrefFor } from '../../router'
import { PRODUCTS, getProduct, PRICES_CHECKED } from '../../data/products'
import { PEER_STORIES, photo } from '../../data/people'
import { buildDashboard } from '../../data/mockDashboard'
import { WEEK, weekTotals, mins } from '../../data/week'
import { CASES, ADMIN_STAT, RESEARCH, EVIDENCE_CHECKED } from '../../data/evidence'
import IconTile, { Reveal } from '../ui/IconTile'
import Icon from '../ui/Icon'
import Botanical from '../ui/Botanical'
import AnimatedNumber from '../ui/AnimatedNumber'
import Rail from '../ui/Rail'
import WeekRail from '../shared/WeekRail'
import Stories from '../shared/Stories'
import { LazyTeaser } from '../cafe/LazyCafe'

const ease = [0.22, 1, 0.36, 1]
const money = (n) => `$${Math.round(n).toLocaleString('en-AU')}`

// the example plan shown in the hero and the proof strip, worked out with the same formulas as a real plan
const EXAMPLE = {
  survey: { name: 'Little Fern Café', employees: '3-5', revenue: '250-500', cafeType: 'specialty', goal: 'hours', pains: ['admin', 'staff', 'waste'], tech: 2, rant: '' },
  tools: ['dext', 'xero', 'deputy', 'square'],
}

const FAQS = [
  {
    q: 'Will it replace my staff?',
    a: 'No. These tools take the paperwork, not the people. Your team keeps making coffee and talking to customers while the tools handle invoices, rosters and reminders in the background.',
  },
  {
    q: 'Is my customers’ data safe?',
    a: 'Each tool keeps your data under its own privacy terms, and you can export it and leave. Start with tools that don’t hold customer details, like Dext or Deputy, and never paste customer details into a free chatbot. Every plan comes with a reality check on data.',
  },
  {
    q: 'What if a tool gets something wrong?',
    a: 'Nothing important happens without your yes. The tools draft; you approve anything that spends money, messages a customer or answers an allergy question. Check every draft for the first few weeks.',
  },
  {
    q: 'What will it really cost, and can I cancel?',
    a: 'Your plan shows the whole monthly bill before you sign up for anything. Most tools are month to month, and Square, Ordermentum, Mailchimp and Canva have free plans. A few, like Podium and Slang.ai, are sold after a demo, sometimes on a contract.',
  },
  {
    q: 'Who is Bea?',
    a: 'Bea is Cafinity’s AI advisor. You can type or talk to her: she asks about your café, explains your numbers and plans your setup. She only ever suggests; nothing changes on your plan until you say yes.',
  },
]

function Hero() {
  const { navigate, user, step, openBea, survey, selected } = useApp()
  const ex = useMemo(() => buildDashboard(EXAMPLE.survey, EXAMPLE.tools), [])
  const ready = !!user && step === 3 && selected.length > 0
  const exWeeks = ex.netGain > 0 ? Math.max(1, Math.ceil(((ex.toolCost * 2) / ex.netGain) * 4.33)) : null
  const start = () => navigate('plan')
  const talk = () => { navigate('plan'); if (user) openBea(true) }
  const words = ['See', 'what', 'AI', 'could', 'take', 'off', 'your', 'plate,']
  return (
    <section className="hero on-dark">
      <Botanical variant="vine" className="hero-vine" />
      <div className="wrap hero-in">
        <div className="hero-copy">
          <motion.span className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}>For independent cafés</motion.span>
          <h1 className="hero-title">
            {words.map((w, i) => (
              <React.Fragment key={i}>
                <span className="word-mask">
                  <motion.span className="word" initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.7, ease, delay: 0.15 + i * 0.05 }}>{w}</motion.span>
                </span>{' '}
              </React.Fragment>
            ))}
            <span className="word-mask">
              <motion.em className="word accent" initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.7, ease, delay: 0.6 }}>before you spend a cent.</motion.em>
            </span>
          </h1>
          <motion.p className="lede" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.6 }}>
            Cafinity looks at how your café runs, shows you which tools would genuinely help, what they’d save you each week and what they’d cost, then walks you through setting them up.
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
            <button className="btn btn-primary" onClick={start}>{ready ? 'Open my plan' : 'Start my café check-up'} <Icon name="arrowRight" size={18} className="go" /></button>
            <button className="btn btn-outline" onClick={talk}><Icon name="mic" size={18} /> Talk it through with Bea</button>
          </motion.div>
          <motion.ul className="hero-notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.6 }}>
            <li><Icon name="clock" size={16} /> About five minutes</li>
            <li><Icon name="receipt" size={16} /> Every price up front</li>
            <li><Icon name="shield" size={16} /> You approve anything that matters</li>
          </motion.ul>
          {ready && (
            <motion.p className="hero-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              Welcome back, <b>{survey.name || user.cafeName}</b>. Your plan has {selected.length} tool{selected.length === 1 ? '' : 's'} in it.
            </motion.p>
          )}
        </div>
        <div className="hero-visual">
          <motion.div className="hero-photo photo" initial={{ clipPath: 'inset(100% 0 0 0)' }} animate={{ clipPath: 'inset(0% 0 0 0)' }} transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.25 }}>
            <motion.img src={photo('amira', 900, 1100)} alt="A café owner at her counter" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease }} />
          </motion.div>
          <motion.div className="hero-card on-light" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.7, ease }}>
            <span className="label">An example plan · {EXAMPLE.survey.name}</span>
            <ul>
              <li><Icon name="clock" size={17} /><span>Admin a week</span><b className="num"><AnimatedNumber value={ex.before.adminHours} duration={1.2} /> → <AnimatedNumber value={ex.after.adminHours} duration={1.6} /> hrs</b></li>
              <li><Icon name="coins" size={17} /><span>Better off by</span><b className="num">~<AnimatedNumber value={ex.netGain} format={money} duration={1.6} /> a month</b></li>
              <li><Icon name="receipt" size={17} /><span>Tools cost</span><b className="num"><AnimatedNumber value={ex.toolCost} format={money} duration={1.6} /> a month</b></li>
              <li><Icon name="calendar" size={17} /><span>Pays for itself in</span><b className="num">{exWeeks} weeks</b></li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function ProofStrip() {
  const ex = useMemo(() => buildDashboard(EXAMPLE.survey, EXAMPLE.tools), [])
  const items = [
    { n: 20, unit: 'hrs', text: 'of research you don’t have to do. We’ve read up on a dozen café tools for you.' },
    { n: 5, unit: 'min', text: 'to your own plan, by chat, by voice or with a quick form.' },
    { n: ex.hoursSaved, unit: 'hrs', text: 'back each week on a typical plan for a small café, by our estimate.' },
    { n: PRODUCTS.length, unit: 'tools', text: `checked for Australian cafés, with prices checked ${PRICES_CHECKED}.` },
  ]
  return (
    <section className="proof">
      <div className="wrap proof-in">
        {items.map((it, i) => (
          <Reveal key={it.text} className="proof-item" delay={i * 0.08}>
            <span className="proof-n num"><AnimatedNumber value={it.n} duration={1.4} /><small>{it.unit}</small></span>
            <p>{it.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="sec problem">
      <Botanical variant="fern" className="problem-fern" sway />
      <div className="wrap problem-in">
        <Reveal className="problem-say">
          <span className="kicker">Why Cafinity</span>
          <h2>You don’t need convincing that AI exists. You need to see what it would <em className="accent">actually do</em> for your café.</h2>
          <p className="lede">Plenty of good tools are out there. The hard part is knowing which ones fit a café like yours, what they’d really save, and what they’d really cost, before you hand over a card. That’s what we show you.</p>
        </Reveal>
        <Reveal className="problem-stat" delay={0.1}>
          <span className="problem-n num">{ADMIN_STAT.value}</span>
          <p>{ADMIN_STAT.text}</p>
          <a className="link small" href={ADMIN_STAT.source.url} target="_blank" rel="noreferrer">{ADMIN_STAT.source.label} <Icon name="external" size={13} className="out" /></a>
        </Reveal>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { icon: 'chat', title: 'Tell us about your café', text: 'Chat with Bea, talk out loud, or tap through a short form: your team, your rushes, what eats your week.', time: 'About 5 minutes' },
    { icon: 'chart', title: 'See the difference', text: 'Your hours, your money and your week, with and without the tools. Every number shows its working.', time: 'Straight away' },
    { icon: 'calendar', title: 'Get set up', text: 'Step-by-step setup for a quiet afternoon, real prices, and honest reality checks, so nothing’s a surprise.', time: '15–45 min a tool' },
  ]
  return (
    <section className="sec band-paper how">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="kicker">How it works</span>
          <h2>Three steps, in plain English</h2>
        </Reveal>
        <ol className="how-steps">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} className="how-step" delay={i * 0.1}>
              <div className="how-top"><span className="how-n num">{String(i + 1).padStart(2, '0')}</span><Icon name={s.icon} size={26} className="how-ico" /></div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <span className="tag">{s.time}</span>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Week() {
  const t = weekTotals(WEEK)
  return (
    <section className="sec week">
      <div className="wrap">
        <Reveal className="sec-head row">
          <div>
            <span className="kicker">Your week, before and after</span>
            <h2>Where the time goes, and when the tools step in</h2>
            <p className="lede">An example week in a small café. Drag along: each moment shows the job, the time it takes now, and the time it takes with the right tool.</p>
          </div>
          <div className="week-sum">
            <span className="label">Across these jobs</span>
            <span className="week-sum-n"><span className="num was">{mins(t.before)}</span><Icon name="arrowRight" size={20} /><span className="num">{mins(t.after)}</span></span>
          </div>
        </Reveal>
        <WeekRail moments={WEEK} />
        <p className="fine week-note">Times are our estimates for a typical café with three to eight staff. Dark cards are the moments you’d spend with Cafinity itself.</p>
      </div>
    </section>
  )
}

function CaseCard({ c }) {
  const { navigate } = useApp()
  const tool = getProduct(c.tool)
  const max = Math.max(c.before?.value || 0, c.after?.value || 0, 1)
  return (
    <article className="case on-light">
      <header className="case-head">
        <div>
          <h3>{c.business}</h3>
          <span className="fine">{c.kind} · {c.place}</span>
        </div>
        <a className="case-tool" href={hrefFor('pantry', tool.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', tool.id) }}><IconTile p={tool} size={24} /> {tool.name}</a>
      </header>
      <p className="case-headline">{c.headline}</p>
      <div className="case-graph">
        <span className="label">{c.task}</span>
        {c.before ? (
          <div className="case-bars">
            <div className="cb"><span>Before</span><motion.i className="b" initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }} transition={{ duration: 0.9, ease }} /><em>{c.before.label}</em></div>
            <div className="cb"><span>After</span><motion.i className="a" initial={{ width: 0 }} whileInView={{ width: `${Math.max(3, (c.after.value / max) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease, delay: 0.3 }} /><em>{c.after.label}</em></div>
          </div>
        ) : (
          <div className="case-single num">{c.after.label}</div>
        )}
      </div>
      <p className="case-sum">{c.summary}</p>
      <a className="link small case-src" href={c.source.url} target="_blank" rel="noreferrer">{c.source.label} <Icon name="external" size={13} className="out" /></a>
    </article>
  )
}

function Cases() {
  return (
    <section className="sec band-dark cases on-dark">
      <div className="wrap">
        <Reveal className="sec-head">
          <span className="kicker">Real cafés, real numbers</span>
          <h2>What changed when they brought the tools in</h2>
          <p className="lede">Published results from cafés and restaurants using tools in our Pantry. Drag along to see more.</p>
        </Reveal>
        <Rail label="Case studies" width="minmax(300px, 360px)" gap={18}>
          {CASES.map((c) => <CaseCard key={c.id} c={c} />)}
        </Rail>
        <p className="fine cases-note">Each story is published by the tool’s maker, so read these as best cases rather than averages. Sources checked {EVIDENCE_CHECKED}.</p>
      </div>
    </section>
  )
}

function Research() {
  const diy = RESEARCH.diy
  const caf = RESEARCH.cafinity
  const total = diy.hours * 60
  const shades = ['var(--walnut-700)', 'var(--walnut-500)', 'var(--caramel)', 'var(--brass-2)']
  return (
    <section className="sec research">
      <div className="wrap research-in">
        <Reveal className="research-copy">
          <span className="kicker">The homework, done</span>
          <h2>About <span className="num hl">20 hours</span> of research, down to a coffee break</h2>
          <p className="lede">Working out which AI tools suit a café means reading reviews, sitting through demos and untangling price pages. We’ve done that for a dozen tools, so you can start from a plan.</p>
        </Reveal>
        <Reveal className="research-bars panel" delay={0.1}>
          <div className="rb-row">
            <div className="rb-head"><Icon name="hourglass" size={20} /><span>Working it out yourself</span><b className="num">≈ {diy.hours} hrs</b></div>
            <div className="rb-track">
              {diy.parts.map((p, i) => (
                <motion.span key={p.label} className="rb-seg" style={{ background: shades[i] }} title={`${p.label}: about ${p.hours} hrs`} initial={{ width: 0 }} whileInView={{ width: `${(p.hours * 60 / total) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease, delay: 0.1 + i * 0.12 }} />
              ))}
            </div>
            <ul className="rb-legend">{diy.parts.map((p, i) => <li key={p.label}><i style={{ background: shades[i] }} />{p.label} <span className="num">{p.hours} hrs</span></li>)}</ul>
          </div>
          <div className="rb-row">
            <div className="rb-head"><Icon name="leaf" size={20} /><span>With Cafinity</span><b className="num">≈ {caf.minutes} min</b></div>
            <div className="rb-track"><motion.span className="rb-seg caf" initial={{ width: 0 }} whileInView={{ width: `${Math.max(1.6, (caf.minutes / total) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.6, ease, delay: 0.9 }} /></div>
            <ul className="rb-legend">{caf.parts.map((p) => <li key={p.label}><i className="caf" />{p.label} <span className="num">{p.minutes} min</span></li>)}</ul>
          </div>
          <p className="fine">Our estimates. Setting each tool up still takes 15 to 45 minutes, and your plan walks you through it.</p>
        </Reveal>
      </div>
    </section>
  )
}

function Featured() {
  const { navigate } = useApp()
  const featured = ['dext', 'deputy', 'square', 'canva'].map(getProduct)
  return (
    <section className="sec band-oat featured">
      <div className="wrap">
        <Reveal className="sec-head row">
          <div>
            <span className="kicker">From the AI Pantry</span>
            <h2>Where most cafés start</h2>
          </div>
          <a className="link" href={hrefFor('pantry')} onClick={(e) => { e.preventDefault(); navigate('pantry') }}>See all {PRODUCTS.length} tools <Icon name="arrowRight" size={16} className="go" /></a>
        </Reveal>
        <div className="feat-grid">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.07}>
              <a className="feat card-link" href={hrefFor('pantry', p.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', p.id) }}>
                <div className="feat-top"><IconTile p={p} size={44} /><span className="num feat-price">{p.priceLabel}</span></div>
                <h3>{p.name}</h3>
                <p>{p.tagline}</p>
                <div className="feat-foot"><span><Icon name="clock" size={15} /> About {p.hrs} hrs a week</span><Icon name="arrowRight" size={18} className="go" /></div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sec faq">
      <div className="wrap faq-in">
        <Reveal className="sec-head">
          <span className="kicker">Fair questions</span>
          <h2>What sceptical owners ask us first</h2>
        </Reveal>
        <div className="acc">
          {FAQS.map((f, i) => (
            <div key={f.q} className={`acc-item ${open === i ? 'open' : ''}`}>
              <button type="button" className="acc-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                {f.q}<span className="pm"><Icon name="plus" size={18} /></span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div className="acc-a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
                    <div className="acc-a-in"><p>{f.a}</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SeeIt() {
  const { navigate, user, survey, selected, step } = useApp()
  const mine = !!user && surveyComplete(survey) && step === 3 && selected.length > 0
  const name = mine ? (survey.name || user.cafeName) : 'Little Fern Café'
  return (
    <section className="sec see">
      <div className="wrap see-in">
        <Reveal className="see-copy">
          <span className="kicker">See it in action</span>
          <h2>A day in a café, with the tools at work</h2>
          <p className="lede">A moving picture of a small café using these tools. The customers are pretend. It shows where the time goes, and the moments a tool would ask for your OK. On your own plan, it’s your café, your team and your tools.</p>
          <button className="btn btn-primary" onClick={() => navigate('plan', mine ? 'cafe' : null)}>{mine ? 'Open my café' : 'See my own café'} <Icon name="arrowRight" size={18} className="go" /></button>
        </Reveal>
        <Reveal className="window see-window" delay={0.1}>
          <div className="window-bar"><span>{name}</span><span className="label">A scripted preview</span></div>
          <LazyTeaser key={mine ? selected.join(',') : 'demo'} cafeName={mine ? name : 'Little Fern'} team={mine ? selected : undefined} profile={mine ? { employees: survey.employees, cafeType: survey.cafeType } : undefined} />
        </Reveal>
      </div>
    </section>
  )
}

function Closing() {
  const { navigate } = useApp()
  return (
    <section className="sec closing on-dark">
      <Botanical variant="coffee" className="closing-plant" sway />
      <div className="wrap-narrow closing-in">
        <span className="kicker">Ready when you are</span>
        <h2>See your own café, with your own numbers</h2>
        <p className="lede">Five minutes with Bea, and you’ll know what would help, what it would save, and what it would cost.</p>
        <button className="btn btn-primary" onClick={() => navigate('plan')}>Start my café check-up <Icon name="arrowRight" size={18} className="go" /></button>
      </div>
    </section>
  )
}

export default function HomePage() {
  const stories = PEER_STORIES
  return (
    <div className="home">
      <Hero />
      <ProofStrip />
      <Problem />
      <HowItWorks />
      <Week />
      <Cases />
      <Research />
      <section className="sec stories-sec">
        <div className="wrap">
          <Reveal className="sec-head">
            <span className="kicker">From one owner to another</span>
            <h2>Owners who started where you are</h2>
            <p className="lede">Tap a story to read it in full. These are placeholders until we finish interviewing real owners.</p>
          </Reveal>
          <Stories stories={stories} rail />
        </div>
      </section>
      <Featured />
      <Faq />
      <SeeIt />
      <Closing />
    </div>
  )
}
