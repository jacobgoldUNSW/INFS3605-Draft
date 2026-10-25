import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PRODUCTS } from '../../data/products'
import { BrandLogo } from '../ui/IconTile'
import { Portrait } from './WorkerInspector'

const ease = [0.22, 1, 0.36, 1]

function stateOf(on, w) {
  if (!on) return 'off'
  if (w?.needsYou) return 'needs'
  if (w?.busy) return 'busy'
  return w?.here ? 'here' : 'arriving'
}

/** One worker: a single tidy row. Tap it for what they do and what they cost. */
function Row({ p, on, w, images, open, onOpen, onToggle, onInspect, onDetails, onHover }) {
  const state = stateOf(on, w)
  const status = !on ? p.worker.job : w?.status || 'Heading in…'
  return (
    <li
      className={`tm-row ${on ? 'on' : 'off'} st-${state} ${open ? 'open' : ''}`}
      style={{ '--brand-a': p.from, '--brand-b': p.to }}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      data-worker={p.id}
    >
      <div className="tm-main">
        <button type="button" className="tm-hit" onClick={() => onOpen(open ? null : p.id)} aria-expanded={open} aria-label={`${p.worker.name}, ${p.name}: ${open ? 'hide' : 'show'} details`}>
          <span className="tm-portrait">
            <Portrait images={images} sprite={p.id} size={30} />
            {state === 'needs' && <span className="tm-ping" aria-hidden />}
          </span>
          <span className="tm-text">
            <span className="tm-name">
              <b>{p.worker.name}</b>
              <span className="tm-tool"><BrandLogo id={p.id} size={12} className="tm-logo" />{p.name}</span>
            </span>
            <span className={`tm-status ${state}`}><i aria-hidden />{state === 'needs' ? 'Waiting for your OK' : status}</span>
          </span>
        </button>
        {on ? (
          <button
            type="button"
            className="wswitch on"
            role="switch"
            aria-checked
            aria-label={`Send ${p.worker.name} (${p.name}) home`}
            title={`On shift. Tap to send ${p.worker.name} home`}
            onClick={() => onToggle(p.id)}
          >
            <span className="wswitch-knob" />
          </button>
        ) : (
          <button type="button" className="tm-hire" onClick={() => onToggle(p.id)} aria-label={`Hire ${p.worker.name} (${p.name}), ${p.priceLabel}`}>
            + Hire
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="tm-more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease }}>
            <div className="tm-more-inner">
              <p>{p.worker.job}</p>
              <div className="tm-facts">
                <span><b>~{p.hrs} hrs</b> back a week</span>
                <span><b>{p.priceLabel}</b></span>
                <span><b>{p.weeks} wk{p.weeks > 1 ? 's' : ''}</b> to set up</span>
              </div>
              <div className="tm-actions">
                {on
                  ? <button type="button" className="tc-btn primary" onClick={() => onInspect(p.id)}>See what {p.worker.name} is doing</button>
                  : <button type="button" className="tc-btn primary" onClick={() => onToggle(p.id)}>+ Hire {p.worker.name}</button>}
                <button type="button" className="tc-btn" onClick={() => onDetails(p.id)}>About {p.name} ↗</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/** "Your team": who's on shift and what they're doing, then who you could still hire. */
export default function TeamPanel({ selected, snap, images, onToggle, onInspect, onDetails, onHover }) {
  const [open, setOpen] = useState(null)
  const hired = PRODUCTS.filter((p) => selected.includes(p.id))
  const rest = PRODUCTS.filter((p) => !selected.includes(p.id))
  const bill = hired.reduce((s, p) => s + p.cost, 0)
  const needs = hired.filter((p) => snap.workers?.[p.id]?.needsYou).length
  const row = (p) => (
    <Row
      key={p.id} p={p} on={selected.includes(p.id)} w={snap.workers?.[p.id]} images={images}
      open={open === p.id} onOpen={setOpen} onToggle={onToggle} onInspect={onInspect} onDetails={onDetails} onHover={onHover}
    />
  )
  return (
    <div className="team-panel">
      <div className="tm-sum">
        <b>{hired.length ? `${hired.length} on your team` : 'Nobody hired yet'}</b>
        {hired.length > 0 && <span>about ${bill}/mo</span>}
        {needs > 0 && <em>{needs} waiting for you</em>}
      </div>
      {hired.length > 0 && (
        <section className="tm-group" aria-label="On your team">
          <h5>On shift</h5>
          <ul>{hired.map(row)}</ul>
        </section>
      )}
      {rest.length > 0 && (
        <section className="tm-group" aria-label="Available to hire">
          <h5>Available to hire <span>{rest.length}</span></h5>
          <ul>{rest.map(row)}</ul>
        </section>
      )}
      <p className="tm-fine">Each worker is a real tool. Tap one to see what it does and costs.</p>
    </div>
  )
}
