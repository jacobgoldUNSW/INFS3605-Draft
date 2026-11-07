import React from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../state'
import { hrefFor } from '../../router'
import { PRODUCTS, USE_CASES, PRICES_CHECKED, getProduct, connectionsFor } from '../../data/products'
import { RISK_THEMES } from '../../data/risks'
import { PEOPLE, photo } from '../../data/people'
import { CASES } from '../../data/evidence'
import IconTile, { Reveal } from '../ui/IconTile'
import Icon from '../ui/Icon'
import PlaceholderTag from '../ui/PlaceholderTag'
import { AddButton } from './MarketplacePage'

const ease = [0.22, 1, 0.36, 1]
const THEME_ICON = { data: 'lock', accuracy: 'alert', control: 'sliders', legal: 'scale', customers: 'heart', people: 'people', lockin: 'link', cost: 'coins', outage: 'wave', skills: 'book' }
const SCORE = {
  time: ['A little time', 'Some time', 'A good time-saver', 'A big time-saver', 'A huge time-saver'],
  setup: ['Tricky to set up', 'Takes some effort', 'Fair to set up', 'Easy to set up', 'Very easy to set up'],
  cost: ['Pricey', 'Fair value', 'Good value', 'Great value', 'Excellent value'],
}
const scoreText = (k, v) => SCORE[k][Math.max(0, Math.min(4, Math.round(v / 20) - 1))]

function Meter({ label, value, k }) {
  return (
    <div className="tp-meter">
      <div className="tp-meter-top"><span className="label">{label}</span><span className="small">{scoreText(k, value)}</span></div>
      <div className="tp-meter-bar"><motion.i initial={{ width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease }} /></div>
    </div>
  )
}

export default function ToolPage({ id }) {
  const { navigate, prevRoute, selected } = useApp()
  const p = getProduct(id)
  if (!p) {
    return (
      <div className="wrap sec">
        <h1>We couldn’t find that tool</h1>
        <p className="lede">It may have moved. Have a look through the whole Pantry instead.</p>
        <p style={{ marginTop: 20 }}><a className="link" href={hrefFor('pantry')} onClick={(e) => { e.preventDefault(); navigate('pantry') }}>All tools <Icon name="arrowRight" size={16} /></a></p>
      </div>
    )
  }
  const fromPlan = prevRoute.current?.page === 'plan'
  const back = fromPlan ? { label: 'Back to your plan', go: () => navigate('plan', prevRoute.current.sub) } : { label: 'All tools', go: () => navigate('pantry') }
  const jobs = USE_CASES.filter((u) => p.useCases.includes(u.id))
  const links = connectionsFor(p.id)
  const cases = CASES.filter((c) => c.tool === p.id)
  const person = PEOPLE[p.testimonial?.person]
  const site = p.url ? new URL(p.url).hostname.replace(/^www\./, '') : null
  const related = PRODUCTS.filter((x) => x.id !== p.id && x.useCases.some((u) => p.useCases.includes(u))).slice(0, 3)
  const on = selected.includes(p.id)

  return (
    <article className="tp">
      <header className="tp-head">
        <div className="wrap">
          <nav className="tp-crumbs" aria-label="Breadcrumb">
            <button type="button" className="link small" onClick={back.go}><Icon name="arrowLeft" size={15} /> {back.label}</button>
            <span className="fine">AI Pantry / {p.name}</span>
          </nav>
          <div className="tp-head-in">
            <div className="tp-title">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease }}><IconTile p={p} size={72} /></motion.div>
              <div>
                <span className="kicker">{jobs.map((j) => j.label).join(' · ')}</span>
                <h1>{p.name}</h1>
                <p className="lede">{p.tagline}.</p>
              </div>
            </div>
            <div className="tp-buy">
              <div className="tp-price"><span className="label">Price</span><span className="num">{p.priceLabel}</span><span className="fine">{p.pricing?.plan}{p.pricing?.note ? `. ${p.pricing.note}` : ''}.</span></div>
              {p.pricing?.trial && <span className="tag">{p.pricing.trial}</span>}
              <div className="tp-actions">
                <AddButton p={p} size="md" />
                {p.url && <a className="btn btn-outline" href={p.url} target="_blank" rel="noreferrer">Visit {site} <Icon name="external" size={16} className="out" /></a>}
              </div>
              {on && <button type="button" className="link small" onClick={() => navigate('plan')}>See it in your plan <Icon name="arrowRight" size={14} className="go" /></button>}
            </div>
          </div>
        </div>
      </header>

      <div className="wrap tp-body">
        <div className="tp-main">
          <Reveal as="section" className="tp-sec">
            <h2 className="tp-h">What it does</h2>
            <p className="tp-desc">{p.description}</p>
            <ul className="tp-jobs">{p.useCaseItems.map((u) => <li key={u.t}><Icon name="check" size={16} /> {u.t}</li>)}</ul>
            {p.wont && <p className="tp-wont"><Icon name="info" size={17} /> <span><b>What it won’t do.</b> {p.wont}</span></p>}
          </Reveal>

          {cases.length > 0 && (
            <Reveal as="section" className="tp-sec">
              <h2 className="tp-h">In real cafés</h2>
              <div className="tp-cases">
                {cases.map((c) => (
                  <div key={c.id} className="tp-case">
                    <span className="label">{c.business} · {c.place}</span>
                    <p className="tp-case-h">{c.headline}</p>
                    <p className="small muted">{c.summary}</p>
                    <a className="link small" href={c.source.url} target="_blank" rel="noreferrer">{c.source.label} <Icon name="external" size={13} className="out" /></a>
                  </div>
                ))}
              </div>
              <p className="fine">Published by {p.name}’s maker, so read it as a best case.</p>
            </Reveal>
          )}

          <Reveal as="section" className="tp-sec tp-pc">
            <div>
              <h2 className="tp-h">What it’s good at</h2>
              <ul className="tp-list good">{p.pros.map((t) => <li key={t}><Icon name="check" size={16} /> {t}</li>)}</ul>
            </div>
            <div>
              <h2 className="tp-h">Watch out for</h2>
              <ul className="tp-list warn">{p.cons.map((t) => <li key={t}><Icon name="alert" size={16} /> {t}</li>)}</ul>
            </div>
          </Reveal>

          {p.risks?.length > 0 && (
            <Reveal as="section" className="tp-sec">
              <h2 className="tp-h">Risks and limitations</h2>
              <ul className="tp-risks">
                {p.risks.map((r) => (
                  <li key={r.title}>
                    <span className="tp-risk-ico"><Icon name={THEME_ICON[r.theme] || 'info'} size={18} /></span>
                    <div><h4>{r.title}</h4><p>{r.detail}</p><span className="fine">{RISK_THEMES[r.theme]?.title}</span></div>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          <Reveal as="section" className="tp-sec">
            <h2 className="tp-h">Getting set up</h2>
            <div className="tp-setup">
              <div className="tp-setup-meta">
                <span><Icon name="clock" size={16} /> About {p.setup.minutes} minutes</span>
                <span><Icon name="user" size={16} /> {p.setup.owner}</span>
                <span><Icon name="calendar" size={16} /> {p.setup.phase.split(' · ')[0]}</span>
              </div>
              <ol>{p.setup.steps.map((s, i) => <li key={s}><span className="num">{i + 1}</span>{s}</li>)}</ol>
              <p className="tp-safe"><Icon name="shield" size={17} /> <span><b>First-week check.</b> {p.setup.safety}</span></p>
            </div>
          </Reveal>
        </div>

        <aside className="tp-side">
          <Reveal className="panel tp-scores">
            <h3 className="tp-side-h">At a glance</h3>
            <dl className="tp-facts">
              <div><dt className="label">Time back</dt><dd className="num">~{p.hrs} hrs a week</dd></div>
              <div><dt className="label">Ready in</dt><dd className="num">{p.weeks} week{p.weeks === 1 ? '' : 's'}</dd></div>
              <div><dt className="label">Made by</dt><dd>{p.vendor}</dd></div>
            </dl>
            <Meter label="Time saved" value={p.metrics.time} k="time" />
            <Meter label="Setup" value={p.metrics.setup} k="setup" />
            <Meter label="Value" value={p.metrics.cost} k="cost" />
            <p className="fine">Prices checked {PRICES_CHECKED}. Check the vendor’s site before you buy.</p>
          </Reveal>

          {links.length > 0 && (
            <Reveal className="panel tp-links" delay={0.05}>
              <h3 className="tp-side-h">Works well with</h3>
              <ul>
                {links.map((c) => {
                  const other = getProduct(c.from === p.id ? c.to : c.from)
                  return (
                    <li key={c.from + c.to}>
                      <a href={hrefFor('pantry', other.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', other.id) }}><IconTile p={other} size={26} /> {other.name}</a>
                      <span className="small muted">{c.what}</span>
                    </li>
                  )
                })}
              </ul>
            </Reveal>
          )}

          {person && (
            <Reveal className="panel tp-quote" delay={0.1}>
              <PlaceholderTag />
              <p>“{p.testimonial.quote}”</p>
              <div className="tp-quote-who"><img src={photo(p.testimonial.person, 96, 96)} alt="" /><span><b>{person.name}</b><span className="fine">{person.cafe}, {person.city}</span></span></div>
            </Reveal>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="tp-related band-oat">
          <div className="wrap">
            <h2 className="tp-h">Tools that do similar jobs</h2>
            <ul className="tp-rel">
              {related.map((r) => (
                <li key={r.id}>
                  <a className="card-link" href={hrefFor('pantry', r.id)} onClick={(e) => { e.preventDefault(); navigate('pantry', r.id) }}>
                    <IconTile p={r} size={40} />
                    <span><b>{r.name}</b><span className="small muted">{r.tagline}</span></span>
                    <span className="num">{r.priceLabel}</span>
                    <Icon name="arrowRight" size={18} className="go" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  )
}
