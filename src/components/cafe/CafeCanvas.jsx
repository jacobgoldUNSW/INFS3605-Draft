import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { WORLD_W, WORLD_H } from '../../sim/assets'
import { drawCafe } from '../../sim/render'
import { getProduct, brandInk } from '../../data/products'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const EDGE = 6 // px a bubble keeps clear of the café's edges

/**
 * Pixel café canvas + crisp DOM bubbles that follow the characters.
 * `running` gates the simulation clock (pause / hidden tab / off-screen all stop it).
 * The lofi light layer steps down by itself (high → medium → low) if a device can't keep up.
 */
export default function CafeCanvas({ world, images, running = true, interactive = true, onPick, onApprove, onInspect, className = '', apiRef, quality: q0 = 'high' }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const nodes = useRef(new Map())
  const hoverRef = useRef(null)
  const sizeRef = useRef({ w: 960, h: 544, dpr: 1 })
  const runningRef = useRef(running)
  const inView = useRef(true)
  const quality = useRef(q0)
  const [, setOverlayRev] = useState(0)
  const [hoverId, setHoverId] = useState(null)
  runningRef.current = running

  // size the backing store to the element × devicePixelRatio (lower on the cheapest quality)
  useLayoutEffect(() => {
    const el = wrapRef.current
    const cv = canvasRef.current
    if (!el || !cv) return
    const fit = () => {
      const w = el.clientWidth || 960
      const h = Math.round((w * WORLD_H) / WORLD_W)
      const dpr = Math.min(window.devicePixelRatio || 1, quality.current === 'high' || quality.current === 'medium' ? 2 : 1)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      cv.style.height = `${h}px`
      sizeRef.current = { w, h, dpr }
      // on a small café (phones), name tags and bubbles shrink to match the people under them
      el.classList.toggle('compact', w < 640)
    }
    fit()
    sizeRef.current.refit = fit
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => { inView.current = e.isIntersecting }, { threshold: 0.05 })
    io.observe(el)
    return () => { ro.disconnect(); io.disconnect() }
  }, [])

  // world → screen (relative to the canvas element), used by the tour's spotlight
  useEffect(() => {
    if (!apiRef) return
    apiRef.current = {
      toScreen: (x, y) => {
        const r = canvasRef.current?.getBoundingClientRect()
        if (!r) return null
        return { x: r.left + (x / WORLD_W) * r.width, y: r.top + (y / WORLD_H) * r.height, k: r.width / WORLD_W }
      },
      rect: () => canvasRef.current?.getBoundingClientRect() || null,
    }
    return () => { if (apiRef) apiRef.current = null }
  }, [apiRef])

  // the animation loop
  useEffect(() => {
    if (!world || !images) return
    const cv = canvasRef.current
    const ctx = cv.getContext('2d', { alpha: false })
    const reduced = prefersReducedMotion()
    let raf
    let last = performance.now()
    let seen = -1
    let frame = 0
    let sampled = 0
    let sum = 0
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const ms = now - last
      const dt = Math.max(0, Math.min(0.05, ms / 1000))
      last = now
      if (!inView.current) return
      frame++
      const live = runningRef.current
      if (live) world.update(dt)
      if (live || frame % 8 === 0) {
        drawCafe(ctx, world, images, cv.width / WORLD_W, live ? dt : 0, { quality: quality.current, reducedMotion: reduced })
        // if this device can't hold ~25 fps, step the light layer down (high → medium → low → minimal).
        // Frames slower than 250 ms mean the page is being throttled (hidden pane, background window), not slow.
        if (live && frame > 6 && ms < 250 && document.visibilityState === 'visible') {
          sampled++
          sum += ms
          if (sampled >= 24) {
            if (sum / sampled > 40 && quality.current !== 'minimal') {
              quality.current = { high: 'medium', medium: 'low', low: 'minimal' }[quality.current]
              sizeRef.current.refit?.()
            }
            sampled = 0
            sum = 0
          }
        }
      }
      if (world.overlayVersion !== seen) {
        seen = world.overlayVersion
        setOverlayRev(seen)
      }
      // move every bubble to its character. Near the edge of the café a bubble slides back into view while
      // its tail keeps pointing at the speaker (--nudge). All widths are read before anything is written.
      const W = sizeRef.current.w
      const k = W / WORLD_W
      const moves = []
      for (const [id, el] of nodes.current) {
        const o = id === '__hover' ? hoverRef.current : world.overlays.get(id)
        if (!o) continue
        const p = world.overlayAnchor(o)
        if (!p) { el.classList.remove('placed'); continue }
        moves.push([el, o, p.x * k, p.y * k, (el.firstElementChild?.offsetWidth || 0) / 2])
      }
      for (const [el, o, x, y, half] of moves) {
        const nudge = Math.round(Math.max(EDGE + half - x, Math.min(0, W - EDGE - half - x)))
        el.style.transform = `translate3d(${(x + nudge).toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        if (el._nudge !== nudge) { el._nudge = nudge; el.style.setProperty('--nudge', `${nudge}px`) }
        if (!el.classList.contains('placed')) el.classList.add('placed')
        if (o.type === 'ask') {
          const ring = el.querySelector('.ask-ring-fill')
          if (ring) ring.style.strokeDashoffset = String(Math.min(1, (world.t - o.start) / o.dur) * 62.8)
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [world, images])

  const toWorld = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * WORLD_W, ((e.clientY - r.top) / r.height) * WORLD_H]
  }
  const onMove = (e) => {
    if (!interactive || !world) return
    const id = world.hitTest(...toWorld(e))
    if (id !== hoverId) {
      setHoverId(id)
      hoverRef.current = id === 'cat' ? { x: world.catSpot().x, y: world.catSpot().y } : id ? { actorId: id } : null
    }
  }
  const onClick = (e) => {
    if (!interactive || !world) return
    const id = world.hitTest(...toWorld(e))
    if (id) onPick?.(id)
  }

  const ref = (id) => (el) => {
    if (el) nodes.current.set(id, el)
    else nodes.current.delete(id)
  }

  const list = world ? [...world.overlays.values()] : []
  // people wearing a name tag get their bubbles lifted above it, so the tag never hides
  const tagged = new Set(list.filter((o) => o.type === 'tag').map((o) => o.actorId))
  const hoverActor = hoverId && hoverId !== 'cat' && world?.actors.get(hoverId)
  const hoverTool = hoverActor && getProduct(hoverId)
  const hoverLabel = hoverId === 'cat' ? 'The café cat · give her a scratch'
    : !hoverActor ? null
      : hoverActor.kind === 'owner' ? 'You (the owner)'
        : hoverTool ? toolHover(hoverTool)
          : hoverActor.kind === 'barista' || hoverActor.kind === 'crew' ? `${hoverActor.name} · one of your staff`
            : hoverActor.name

  return (
    <div ref={wrapRef} className={`cafe-canvas ${className}`}>
      <canvas
        ref={canvasRef}
        className={`cafe-cv ${hoverId ? 'hovering' : ''}`}
        onPointerMove={onMove}
        onPointerLeave={() => { setHoverId(null); hoverRef.current = null }}
        onClick={onClick}
        aria-label="Live pixel-art café simulation"
        role="img"
      />
      <div className="cafe-overlays" aria-live="polite">
        {list.map((o) => <Bubble key={o.id} o={o} refFn={ref(o.id)} onApprove={onApprove} onInspect={onInspect} interactive={interactive} lifted={o.type !== 'tag' && tagged.has(o.actorId)} hovered={hoverId === o.actorId} />)}
        {hoverLabel && !list.some((o) => o.actorId === hoverId && o.type === 'tag') && (
          <div ref={ref('__hover')} className="cb cb-tag hover">
            <span>{hoverLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// AI workers are labelled by their tool, never a person's name: the short name on the tag
// ("Microsoft Copilot" → "Copilot"), the full name and job on hover
const toolTag = (p) => p.name.replace(/^Microsoft\s+/, '')
const toolHover = (p) => `${p.name} · ${p.worker.role}`

function Bubble({ o, refFn, onApprove, onInspect, interactive, lifted, hovered }) {
  const p = o.actorId ? getProduct(o.actorId) : null
  const lift = lifted ? ' lifted' : ''
  // a worker's lines are edged in their brand colour, and longer ones say which tool is talking
  const spk = p && (o.type === 'say' || o.type === 'think') ? { '--spk': p.from } : undefined
  const who = spk && String(o.text || '').length > 60 ? <em className="cb-who">{toolTag(p)}</em> : null
  if (o.type === 'tag') {
    const you = o.actorId === 'owner'
    const label = !you && p ? (hovered ? toolHover(p) : toolTag(p)) : o.text
    return (
      <div ref={refFn} className={`cb cb-tag ${you ? 'you' : 'brand'} ${hovered ? 'hovered' : ''}`} style={!you && p ? { '--brand': `linear-gradient(135deg, ${p.from}, ${p.to})`, '--brand-ink': brandInk(p) } : undefined}>
        <span>{label}</span>
      </div>
    )
  }
  if (o.type === 'emote') return <div ref={refFn} className={`cb cb-emote${lift}`}><span>{o.text}</span></div>
  if (o.type === 'badge') return <div ref={refFn} className="cb cb-badge"><span>{o.text}</span></div>
  if (o.type === 'note') return <div ref={refFn} className={`cb cb-note ${o.tone || ''}`}><span>{o.text}</span></div>
  if (o.type === 'think') return <div ref={refFn} className={`cb cb-think${lift}${spk ? ' spk' : ''}`} style={spk}><span>{who}{o.text}</span></div>
  if (o.type === 'ask') {
    return (
      <div ref={refFn} className={`cb cb-ask${lift} ${interactive ? 'interactive' : ''}`} data-ask={o.approvalId}>
        <div className="ask-inner">
          <div className="ask-head">
            <svg className="ask-ring" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
              <circle className="ask-ring-fill" cx="12" cy="12" r="10" fill="none" stroke="#F2B46D" strokeWidth="3" strokeDasharray="62.8" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 12 12)" />
            </svg>
            <p>{o.text}</p>
          </div>
          {interactive && (
            <div className="ask-actions">
              <button className="ask-btn yes" onClick={(e) => { e.stopPropagation(); onApprove?.(o.approvalId) }}>✓ Approve</button>
              <button className="ask-btn peek" onClick={(e) => { e.stopPropagation(); onInspect?.(o.actorId) }}>👁️ Inspect</button>
            </div>
          )}
        </div>
      </div>
    )
  }
  return <div ref={refFn} className={`cb cb-say${lift}${spk ? ' spk' : ''}`} style={spk}><span>{who}{o.text}</span></div>
}
