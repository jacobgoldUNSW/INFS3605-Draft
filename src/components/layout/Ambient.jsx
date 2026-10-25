import React from 'react'

const BEANS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 83) % 100}%`,
  size: 14 + ((i * 7) % 16),
  dur: 18 + ((i * 5) % 14),
  delay: -((i * 3) % 18),
}))

/** The soft colour blobs and slowly drifting coffee beans behind every page. */
export default function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      {BEANS.map((b, i) => (
        <span key={i} className="float-bean" style={{ left: b.left, width: b.size, height: b.size * 1.35, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  )
}
