import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'

// The café simulation is the heaviest part of the app, and it sits at the bottom of pages now, so it's only
// downloaded when you get near it. The placeholder keeps its exact shape, so nothing jumps when it arrives.
const CafeTeaser = lazy(() => import('./CafeTeaser'))
const CafeStage = lazy(() => import('./CafeStage'))

const Placeholder = ({ label = 'Opening up the café…' }) => (
  <div className="cafe-placeholder" role="status"><span className="live-dot" /> {label}</div>
)

function useNear(margin = '400px') {
  const ref = useRef(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (!('IntersectionObserver' in window)) { setNear(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() } }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [near, margin])
  return [ref, near]
}

/** The scripted café preview, loaded as you scroll towards it. */
export function LazyTeaser(props) {
  const [ref, near] = useNear()
  return (
    <div ref={ref} className="cafe-lazy">
      {near ? <Suspense fallback={<Placeholder />}><CafeTeaser {...props} /></Suspense> : <Placeholder />}
    </div>
  )
}

/** The full simulation (its own tab), loaded on demand. */
export function LazyStage(props) {
  return <Suspense fallback={<div className="cafe-lazy stage-wait"><Placeholder /></div>}><CafeStage {...props} /></Suspense>
}
