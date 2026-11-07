import React from 'react'

/** The Cafinity mark: a coffee leaf whose midrib doubles as a coffee bean's crease. */
export function LeafMark({ size = 26, leaf = 'var(--sage)', crease = 'var(--forest-800)', className = '' }) {
  return (
    <svg className={`brand-mark ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 4.5C9.4 8.6 8.3 17.6 16 27.5c7.7-9.9 6.6-18.9 0-23z" fill={leaf} />
      <path d="M16 7.2c-2.7 5.1-.2 9.6 0 17.6" fill="none" stroke={crease} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ onClick, href = '#/', size = 26, light = true }) {
  return (
    <a className="brand" href={href} onClick={onClick} aria-label="Cafinity home">
      <LeafMark size={size} leaf={light ? 'var(--sage)' : 'var(--moss)'} crease={light ? 'var(--forest-800)' : 'var(--almond)'} />
      <span className="brand-word">Cafinity</span>
    </a>
  )
}
