import React, { useEffect, useRef } from 'react'
import CafeCanvas from './CafeCanvas'
import { CafeWorld } from '../../sim/world'
import { useCafeImages } from '../../sim/useCafeImages'
import { CURVEBALLS } from './EventRail'

// the curveball each worker is best known for
export const SIGNATURE = {
  copilot: 'sick', xero: 'delivery', dext: 'delivery', deputy: 'sick', square: 'rush', lightspeed: 'rush',
  marketman: 'rain', ordermentum: 'delivery', canva: 'rain', podium: 'review', slang: 'rush', mailchimp: 'rain',
}
export const signatureOf = (id) => CURVEBALLS.find((c) => c.id === SIGNATURE[id])

/**
 * A short scripted clip of the café with one worker handling their signature curveball, then again
 * every 16 seconds. Like the Home teaser it never calls the API or any AI, and it makes no sound.
 */
export default function ToolClip({ id }) {
  const images = useCafeImages()
  const worldRef = useRef(null)
  if (!worldRef.current) {
    const w = new CafeWorld({ teaser: true, clip: true, cafeName: 'Your café', fixedPhase: 0.42, requestStep: null })
    w.setWorkers([id], { instant: true })
    w.setProfile({ employees: '1-2', cafeType: 'specialty' })
    worldRef.current = w
  }
  useEffect(() => {
    const w = worldRef.current
    const fire = () => w.triggerEvent(SIGNATURE[id] || 'rain')
    const first = setTimeout(fire, 1200)
    const again = setInterval(fire, 16000)
    return () => { clearTimeout(first); clearInterval(again); w.destroy() }
  }, [id])
  return (
    <div className="tool-clip teaser" aria-hidden>
      <CafeCanvas world={worldRef.current} images={images} running interactive={false} quality="medium" />
      {!images && <div className="teaser-loading">☕</div>}
    </div>
  )
}
