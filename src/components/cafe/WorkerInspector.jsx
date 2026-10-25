import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CHARS } from '../../sim/assets'
import { getProduct } from '../../data/products'
import IconTile from '../ui/IconTile'
import ArtifactCard from './ArtifactCard'

/** Pixel portrait: the worker's front-facing frame, scaled up crisply. */
export function Portrait({ images, sprite, size = 72 }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !images) return
    const meta = CHARS.chars[sprite]
    if (!meta) return
    const ctx = cv.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, cv.width, cv.height)
    const staff = meta.kind === 'staff'
    const sx = staff ? 43 * 32 : 18 * 32
    const sy = meta.y + (staff ? 2 * 64 : 0)
    // crop the top of the 32x64 frame (head + shoulders)
    ctx.drawImage(images.chars, sx, sy + 14, 32, 34, 0, 0, cv.width, cv.height)
  }, [images, sprite])
  return <canvas ref={ref} className="portrait" width={size} height={Math.round(size * 34 / 32)} aria-hidden />
}

const ago = (s) => (s < 5 ? 'just now' : s < 60 ? `${Math.round(s)}s ago` : `${Math.round(s / 60)} min ago`)

export default function WorkerInspector({ info, images, now, impact, onClose, onApprove, onToggle }) {
  if (!info) return null
  const p = getProduct(info.id)
  return (
    <motion.aside
      className="inspector"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="dialog"
      aria-label={`${info.name}, ${p?.name}`}
    >
      <button className="insp-close" onClick={onClose} aria-label="Close inspector">✕</button>

      {/* 1 · who */}
      <div className="insp-head" style={{ '--brand-a': p?.from, '--brand-b': p?.to }}>
        <div className="insp-portrait"><Portrait images={images} sprite={info.id} size={66} /></div>
        <div className="insp-who">
          <span className="script-note">peek under the hood</span>
          <h4>{info.name}<span> · {info.role}</span></h4>
          <div className="insp-tool">
            {p && <IconTile p={p} size={22} radius={7} />}
            <b>{p?.name}</b>
            <em>{p?.priceLabel}</em>
          </div>
        </div>
      </div>
      <div className={`insp-state ${info.busy ? 'busy' : ''}`}>
        <span className="insp-dot" /> {info.status}
      </div>

      {/* 2 · what I just made */}
      <div className="insp-block">
        <div className="insp-label">What I just created</div>
        <ArtifactCard artifact={info.artifact} approvalId={info.approvalId} onApprove={onApprove} />
      </div>

      {/* 3 · chatter + impact */}
      <div className="insp-block">
        <div className="insp-label">Team chatter</div>
        {info.log.length ? (
          <ul className="insp-log">
            {info.log.map((l, i) => (
              <li key={i}><span>{ago(now - l.t)}</span>{l.text}</li>
            ))}
          </ul>
        ) : (
          <p className="insp-quiet">Nothing yet — they’re settling in.</p>
        )}
      </div>
      <div className="insp-impact">
        ✨ Session impact: <b>{impact.promos}</b> promo{impact.promos === 1 ? '' : 's'} · <b>+{impact.customers}</b> customers · <b>${impact.waste}</b> waste saved · <b>${impact.dollars}</b> kept · <b>{impact.calls}</b> calls answered
      </div>
      {onToggle && (
        <button className="link-btn insp-toggle" onClick={() => onToggle(info.id)}>
          {info.onTeam ? `Send ${info.name} home (remove ${p?.name})` : `Hire ${info.name} — add ${p?.name} to my plan`}
        </button>
      )}
    </motion.aside>
  )
}
