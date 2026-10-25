import React from 'react'
import { TEMPLATES, AGENT_META } from '../../../shared/agentScenarios.js'
import { getProduct } from '../../data/products'
import { BrandLogo } from '../ui/IconTile'

export const CURVEBALLS = [
  { id: 'rain', icon: '🌧️', title: 'Rain', what: 'It’s pouring and walk-ins drop off.' },
  { id: 'rush', icon: '🏃', title: 'Morning rush', what: 'Six people at once, and the phone rings.' },
  { id: 'sick', icon: '🤒', title: 'Sick call-in', what: 'Josh can’t make his 6am shift.' },
  { id: 'delivery', icon: '📦', title: 'Delivery drop', what: 'Dairy arrives with a paper docket.' },
  { id: 'review', icon: '⭐', title: 'New review', what: 'A review lands, with an allergy question.' },
]

// the person an owner would expect to handle each one (suggested when nobody on the team fits)
const NATURAL = { rain: 'marketman', rush: 'square', sick: 'deputy', delivery: 'dext', review: 'podium' }

// who could step in for each curveball, most likely first (from the workflow templates)
const RESPONDERS = Object.fromEntries(CURVEBALLS.map((c) => {
  const score = { [NATURAL[c.id]]: 100 }
  for (const t of TEMPLATES) {
    if (t.event !== c.id) continue
    score[t.primary] = (score[t.primary] || 0) + 3
    for (const k of t.collaborator || []) score[k] = (score[k] || 0) + 1
  }
  return [c.id, Object.keys(score).sort((a, b) => score[b] - score[a])]
}))

const STEPS = [
  { id: 'noticed', label: 'Noticed' },
  { id: 'working', label: 'On it' },
  { id: 'needs-you', label: 'Needs you' },
  { id: 'done', label: 'Done' },
]
export const stepIndex = (s) => ({ noticed: 0, thinking: 0, queued: 1, working: 1, 'needs-you': 2, done: 3 }[s] ?? -1)
export const stepLabel = (s) => (s === 'solo' ? 'You’re on your own' : STEPS[stepIndex(s)]?.label || 'On it')

function Face({ id }) {
  const p = getProduct(id)
  return (
    <span className="docket-face" style={{ '--a': p?.from, '--b': p?.to }} title={`${AGENT_META[id].name} · ${AGENT_META[id].tool}`}>
      <BrandLogo id={id} size={12} />
    </span>
  )
}

function Docket({ c, ev, mode, present, hired, cooling, onFire }) {
  const can = RESPONDERS[c.id].filter((id) => present.includes(id))
  const coming = RESPONDERS[c.id].filter((id) => hired.includes(id) && !present.includes(id))
  const live = ev && !['done', 'solo', 'stopped'].includes(ev.status)
  const solo = ev?.status === 'solo'
  const idx = stepIndex(ev?.status)
  const disabled = live || cooling
  const who = mode === 'before'
    ? <em>You’d handle it alone</em>
    : can.length
      ? <>{can.slice(0, 3).map((id) => <Face key={id} id={id} />)}<em>{can.length === 1 ? `${AGENT_META[can[0]].name} steps in` : `${AGENT_META[can[0]].name} + ${can.length - 1} more`}</em></>
      : coming.length
        ? <><Face id={coming[0]} /><em>{AGENT_META[coming[0]].name}’s on the way in</em></>
        : <em className="hire">Hire {AGENT_META[NATURAL[c.id]].name} ({AGENT_META[NATURAL[c.id]].tool}) for this</em>
  return (
    <button
      type="button"
      className={`docket ${live ? 'live' : ''} ${ev?.status === 'needs-you' ? 'needs' : ''} ${solo ? 'solo' : ''} ${ev?.status === 'done' ? 'done' : ''}`}
      onClick={() => onFire(c.id)}
      disabled={disabled}
      data-docket={c.id}
      aria-label={`${c.title}: ${c.what}`}
    >
      <span className="docket-ico" aria-hidden>{c.icon}</span>
      <span className="docket-text">
        <b>{c.title}</b>
        <span className="docket-what">{c.what}</span>
        {ev && (solo || idx >= 0) ? (
          solo ? <span className="docket-state solo">😮‍💨 You’re on your own</span> : (
            <span className="docket-steps">
              {STEPS.map((s, i) => <span key={s.id} className={`dstep ${i < idx ? 'past' : i === idx ? 'now' : ''}`}>{s.label}</span>)}
            </span>
          )
        ) : <span className="docket-who">{who}</span>}
      </span>
      <span className="docket-go" aria-hidden>{live ? '…' : cooling ? 'soon' : 'Throw ▸'}</span>
    </button>
  )
}

/** The five curveballs you can throw at the café; each docket tracks who responds and how far they've got. */
export default function CurveballMenu({ snap, mode, hired = [], cool, onFire }) {
  return (
    <div className="curveballs">
      <p className="px-sub">{mode === 'before' ? 'See how a normal day goes when it’s just you.' : 'Pick one, then watch who notices it, who they hand it to, and when they check with you.'}</p>
      <div className="docket-list">
        {CURVEBALLS.map((c) => (
          <Docket key={c.id} c={c} ev={snap.events?.[c.id]} mode={mode} present={snap.present || []} hired={hired} cooling={!!cool[c.id]} onFire={onFire} />
        ))}
      </div>
    </div>
  )
}
