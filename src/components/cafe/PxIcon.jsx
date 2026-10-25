import React from 'react'
import uiUrl from '../../assets/cafe/cafe_ui.png'
import UI from '../../sim/cafeUi.json'

// the sheet's size, from its sprites (tools/cafe/build_ui.py)
const SHEET_W = Math.max(...Object.values(UI).map(([x, , w]) => x + w))
const SHEET_H = Math.max(...Object.values(UI).map(([, y, , h]) => y + h))

/** One of LimeZu's pixel UI icons, drawn crisp at a whole-number scale. */
export default function PxIcon({ name, scale = 1, className = '', label }) {
  const s = UI[name]
  if (!s) return null
  const [x, y, w, h] = s
  return (
    <i
      className={`px-ico ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        width: w * scale,
        height: h * scale,
        backgroundImage: `url(${uiUrl})`,
        backgroundPosition: `${-x * scale}px ${-y * scale}px`,
        backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
      }}
    />
  )
}
