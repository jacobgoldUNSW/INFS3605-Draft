import React, { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'

/** Horizontal scroller: snap, drag with the mouse, arrow buttons, keyboard, and a progress hairline. */
export default function Rail({ children, label, width, gap = 20, bleed = true, className = '', showCount = true }) {
  const ref = useRef(null)
  const [s, setS] = useState({ left: 0, size: 1, atStart: true, atEnd: false, idx: 1, count: 0 })
  const count = React.Children.count(children)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const first = el.firstElementChild
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth
    setS({
      left: el.scrollWidth ? el.scrollLeft / el.scrollWidth : 0,
      size: el.scrollWidth ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft >= max - 4,
      idx: Math.min(count, Math.round(el.scrollLeft / step) + 1),
      count,
    })
  }, [count, gap])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', measure); ro.disconnect() }
  }, [measure])

  // drag to scroll with a mouse (touch already swipes natively)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let down = null
    let moved = false
    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      down = { x: e.clientX, left: el.scrollLeft }
      moved = false
    }
    const onMove = (e) => {
      if (!down) return
      const dx = e.clientX - down.x
      if (!moved && Math.abs(dx) > 5) { moved = true; el.classList.add('dragging') }
      if (moved) el.scrollLeft = down.left - dx
    }
    const onUp = () => {
      if (!down) return
      down = null
      if (moved) {
        el.classList.remove('dragging')
        // settle on the nearest card
        const first = el.firstElementChild
        const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth
        el.scrollTo({ left: Math.round(el.scrollLeft / step) * step, behavior: 'smooth' })
        const stop = (ev) => { ev.stopPropagation(); ev.preventDefault() }
        el.addEventListener('click', stop, { capture: true, once: true })
        setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 50)
      }
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gap])

  const by = (dir) => {
    const el = ref.current
    if (!el) return
    const first = el.firstElementChild
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth * 0.8
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); by(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); by(-1) }
  }

  return (
    <div className={`rail ${bleed ? 'bleed' : ''} ${className}`} style={{ '--rail-w': width, '--rail-gap': `${gap}px` }}>
      <div className="rail-track" ref={ref} role="list" aria-label={label} tabIndex={0} onKeyDown={onKey}>
        {React.Children.map(children, (c) => <div role="listitem" className="rail-item">{c}</div>)}
      </div>
      {s.size < 0.995 && (
        <div className="rail-bar">
          {showCount && <span className="rail-count">{String(s.idx).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>}
          <div className="rail-progress" aria-hidden>
            <i style={{ left: `${s.left * 100}%`, width: `${s.size * 100}%`, transition: 'left 120ms linear, width 200ms ease' }} />
          </div>
          <div className="rail-btns">
            <button type="button" className="rail-btn" onClick={() => by(-1)} disabled={s.atStart} aria-label="Scroll back"><Icon name="chevronLeft" size={18} /></button>
            <button type="button" className="rail-btn" onClick={() => by(1)} disabled={s.atEnd} aria-label="Scroll on"><Icon name="chevronRight" size={18} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
