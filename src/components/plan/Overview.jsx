import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { PEER_STORIES, photo } from '../../data/people'
import { PAIN_POINTS } from '../../data/mockDashboard'
import { usePlan, money, hoursFeel, flatWhites } from './PlanContext'
import HoursBreakdown from './HoursBreakdown'
import Stat from '../ui/Stat'
import Clock from '../ui/Clock'
import Icon from '../ui/Icon'
import IconTile, { Reveal } from '../ui/IconTile'
import AnimatedNumber from '../ui/AnimatedNumber'
import Stories from '../shared/Stories'

const ease = [0.22, 1, 0.36, 1]
const OWNER_PHOTO = { specialty: 'mia', bakery: 'sophie', drive: 'brothers', franchise: 'hiro' }
const list = (names) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)
const Why = ({ lines }) => <ol>{lines.map((l) => <li key={l}>{l}</li>)}</ol>

function SummaryCard() {
  const { survey, openBea } = useApp()
  const { d, plan, paybackWeeks, paybackWhy, freePlans } = usePlan()
  const who = OWNER_PHOTO[survey.cafeType] || 'mia'
  const names = d.picked.map((p) => p.name)
  const gain = d.netGain > 0
  return (
    <motion.section className="sum on-dark" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
      <div className="sum-photo photo">
        <img src={photo(who, 720, 960)} alt="A café owner behind the counter" />
        <span className="sum-photo-tag">The short version</span>
      </div>
      <div className="sum-main">
        <h2 className="sum-head">{plan.headline}</h2>
        <p className="sum-sub">
          {names.length ? <>With {list(names)}, set up one at a time over a few quiet afternoons.</> : 'Add a tool from your toolkit to see what it would do for you.'}
          {' '}
          <button type="button" className="link" onClick={() => openBea(false)}>Ask Bea about it</button>
        </p>
        <div className="sum-stats">
          <Stat
            icon="clock"
            label="Time back"
            visual={<Clock hours={d.hoursSaved} size={68} />}
            value={<AnimatedNumber value={d.hoursSaved} format={(n) => Math.round(n)} />}
            unit="hrs a week"
            blurb={`${hoursFeel(d.hoursSaved)}. ${d.ownerHours} of them yours.`}
            why={<Why lines={d.why.hours} />}
          />
          <Stat
            icon="coins"
            label="Better off by"
            value={gain ? <AnimatedNumber value={d.netGain} format={(n) => money(n)} /> : 'Your time'}
            unit={gain ? 'a month' : ''}
            blurb={gain ? `Likely ${money(d.range[0])}–${money(d.range[1])}. About ${flatWhites(d.netGain)} flat whites a day.` : 'In cash the tools about pay for themselves. The win is your hours.'}
            why={<Why lines={d.why.money} />}
          />
          <Stat
            icon="receipt"
            label="Costs"
            value={<AnimatedNumber value={d.toolCost} format={(n) => money(n)} />}
            unit="a month"
            blurb={`For ${d.picked.length} tool${d.picked.length === 1 ? '' : 's'}${freePlans ? `, ${freePlans} on a free plan` : ''}. Every price is on the Costs tab.`}
            why={<ul>{d.picked.map((p) => <li key={p.id}>{p.name}: {p.priceLabel}</li>)}</ul>}
          />
          <Stat
            icon="calendar"
            label="Pays for itself in"
            value={paybackWeeks ? <AnimatedNumber value={paybackWeeks} format={(n) => Math.round(n)} /> : '—'}
            unit={paybackWeeks ? (paybackWeeks === 1 ? 'week' : 'weeks') : ''}
            blurb={paybackWeeks ? 'Counting two months of subscriptions while you set up.' : 'Your time is the payoff here, not cash.'}
            why={<Why lines={paybackWhy} />}
          />
        </div>
      </div>
    </motion.section>
  )
}

export default function Overview() {
  const { survey, selected, toggle, showToast, navigate } = useApp()
  const { d, plan, name } = usePlan()
  const stories = useMemo(() => {
    const score = (s) => s.tools.filter((t) => selected.includes(t)).length * 2 + (s.type === survey.cafeType ? 1 : 0)
    return [...PEER_STORIES].sort((a, b) => score(b) - score(a)).slice(0, 3)
  }, [selected, survey.cafeType])
  const add = (id) => {
    if (!id || selected.includes(id)) return
    toggle(id)
    const p = d.unpicked.find((x) => x.id === id)
    showToast(`${p?.name || 'Tool'} added to your plan`, 'plus')
  }
  const reasonFor = (p) => {
    const pain = (survey.pains || []).map((id) => PAIN_POINTS.find((x) => x.id === id)).find((x) => x?.use.some((u) => p.useCases.includes(u)))
    return pain ? `Helps with “${pain.label.toLowerCase()}”. ${p.tagline}.` : `${p.tagline}.`
  }

  return (
    <div className="ov">
      <SummaryCard />

      <Reveal as="section" className="ov-sec">
        <div className="ov-head">
          <span className="kicker">Where your hours go</span>
          <h3>We estimate <span className="hl num">{d.before.adminHours}</span> hours of admin a week now. With these tools, about <span className="hl num">{d.after.adminHours}</span>.</h3>
        </div>
        <div className="panel">
          <HoursBreakdown before={d.allocBefore} after={d.allocAfter} totalBefore={d.before.adminHours} totalAfter={d.after.adminHours} />
        </div>
        <p className="fine ov-note">
          For a café your size we start from about 12 hours of admin a week, plus an hour for each team member, and cap what tools can save at 70% of it.{' '}
          <a className="link" href={hrefFor('plan', 'costs')} onClick={(e) => { e.preventDefault(); navigate('plan', 'costs') }}>See all the working</a>
        </p>
      </Reveal>

      <section className="ov-sec">
        <div className="ov-head">
          <span className="kicker">Owners who started where you are</span>
          <h3>Their stories, in their words</h3>
        </div>
        <Stories stories={stories} />
      </section>

      {d.unpicked.length > 0 && (
        <section className="ov-sec">
          <div className="ov-head">
            <span className="kicker">Worth a look</span>
            <h3>Other tools that fit {name}</h3>
            <p className="muted">Not on your plan yet. Add one and every number here updates.</p>
          </div>
          <ul className="others">
            {d.unpicked.map((p, i) => (
              <Reveal as="li" key={p.id} className="other" delay={i * 0.06}>
                <IconTile p={p} size={44} />
                <div className="other-txt">
                  <a className="other-name" href={hrefFor('pantry', p.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', p.id) }}>{p.name}</a>
                  <p>{reasonFor(p)}</p>
                  <span className="fine">{p.priceLabel} · about {p.hrs} hrs a week</span>
                </div>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => add(p.id)}><Icon name="plus" size={15} /> Add</button>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <p className="fine ov-disclaimer">{plan.source === 'gemini' ? 'Written for your café by our AI advisor; the numbers come from our own formulas. ' : ''}Every figure is an illustrative estimate for a prototype, not financial advice. Check prices with each vendor before you sign up.</p>
    </div>
  )
}
