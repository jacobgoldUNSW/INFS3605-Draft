import React, { useEffect, useRef, useState } from 'react'
import CafeCanvas from './CafeCanvas'
import { CafeWorld } from '../../sim/world'
import { loadCafeImages } from '../../sim/assets'

export const TEASER_TEAM = ['square', 'lightspeed', 'marketman', 'canva', 'slang', 'podium']

/**
 * Non-interactive looping preview of the café for the Home page. Scripted only: it has no
 * requestStep hook, so it never calls the API (or any AI), and it makes no sound.
 * Parked at golden hour, the café's most flattering light. A signed-in owner sees their own
 * café name and team. `onMoment` hears each result as it lands, so the page can narrate it.
 */
export default function CafeTeaser({ className = '', cafeName = 'Little Fern', team = TEASER_TEAM, profile, onMoment }) {
  const worldRef = useRef(null)
  const momentRef = useRef(onMoment)
  momentRef.current = onMoment
  if (!worldRef.current) {
    const w = new CafeWorld({ teaser: true, cafeName, fixedPhase: 0.62, requestStep: null, onMoment: (m) => momentRef.current?.(m) })
    w.setWorkers(team.length ? team : TEASER_TEAM, { instant: true })
    w.setMode('after', { instant: true })
    w.setProfile({ employees: profile?.employees || '3-5', cafeType: profile?.cafeType || 'specialty' })
    worldRef.current = w
  }
  const [images, setImages] = useState(null)
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')

  useEffect(() => {
    let alive = true
    loadCafeImages().then((img) => alive && setImages(img)).catch(() => {})
    const on = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', on)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', on)
      worldRef.current?.destroy()
    }
  }, [])

  return (
    <div className={`teaser ${className}`} aria-hidden>
      <CafeCanvas world={worldRef.current} images={images} running={visible} interactive={false} />
      {!images && <div className="teaser-loading">☕</div>}
    </div>
  )
}
