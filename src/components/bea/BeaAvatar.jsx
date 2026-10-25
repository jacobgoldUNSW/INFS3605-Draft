import React, { useEffect, useRef } from 'react'
import { CHARS } from '../../sim/assets'
import { useCafeImages } from '../../sim/useCafeImages'

// Bea's sprite (tools/cafe/build_chars.py): head and shoulders of her front-facing idle frame
const CROP = { y: 10, w: 32, h: 46 }
// where her eyes sit in that crop, so she can blink
const EYES = [[10, 30], [20, 30]]

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Bea, drawn in the café's own pixel art. She bobs gently, blinks now and then, and a wisp of steam
 * rises from her cup while she's thinking.
 */
export default function BeaAvatar({ size = 56, thinking = false, className = '' }) {
  const images = useCafeImages()
  const ref = useRef(null)
  const scale = Math.max(1, Math.round(size / CROP.w))

  useEffect(() => {
    const cv = ref.current
    const meta = CHARS.chars.bea
    if (!cv || !images || !meta) return
    const ctx = cv.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const draw = (blink) => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.drawImage(images.chars, 43 * 32, meta.y + 2 * 64 + CROP.y, CROP.w, CROP.h, 0, 0, CROP.w * scale, CROP.h * scale)
      if (!blink) return
      const skin = ctx.getImageData(13 * scale, 31 * scale, 1, 1).data
      for (const [x, y] of EYES) {
        ctx.fillStyle = `rgb(${skin[0]},${skin[1]},${skin[2]})`
        ctx.fillRect(x * scale, y * scale, 2 * scale, 4 * scale)
        ctx.fillStyle = '#4a3436'
        ctx.fillRect((x - 1) * scale, (y + 2) * scale, 4 * scale, 2 * scale)
      }
    }
    draw(false)
    if (reduceMotion()) return
    let t1
    let t2
    const loop = () => {
      t1 = setTimeout(() => {
        draw(true)
        t2 = setTimeout(() => { draw(false); loop() }, 140)
      }, 2600 + Math.random() * 2600)
    }
    loop()
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [images, scale])

  return (
    <span className={`bea-av ${thinking ? 'thinking' : ''} ${className}`} style={{ '--bea-size': `${size}px` }} aria-hidden>
      <span className="bea-av-steam"><i /><i /><i /></span>
      <span className="bea-av-frame">
        {images && CHARS.chars.bea
          ? <canvas ref={ref} width={CROP.w * scale} height={CROP.h * scale} className="bea-av-cv" />
          : <span className="bea-av-fallback">B</span>}
      </span>
    </span>
  )
}
