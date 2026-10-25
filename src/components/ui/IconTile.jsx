import React from 'react'
import { motion } from 'framer-motion'

/* Simplified, hand-drawn brand marks (white on the brand gradient tile). viewBox 0 0 48 48 */
const W = '#fff'
export const LOGOS = {
  copilot: (
    <>
      <path d="M15.5 35c-4.6 0-7-4.3-5.2-8.4l6-13.4C17.6 10.1 20.4 8 24 8h7.6c-3.5 0-6.2 2-7.6 5.2l-6 13.4c-1.4 3.2-1.2 8.4-2.5 8.4z" fill={W} />
      <path d="M32.5 13c4.6 0 7 4.3 5.2 8.4l-6 13.4C30.4 37.9 27.6 40 24 40h-7.6c3.5 0 6.2-2 7.6-5.2l6-13.4c1.4-3.2 1.2-8.4 2.5-8.4z" fill={W} opacity="0.72" />
      <circle cx="35.5" cy="11.5" r="2.4" fill={W} />
    </>
  ),
  xero: (
    <>
      <circle cx="24" cy="24" r="17" fill="none" stroke={W} strokeWidth="3.4" />
      <text x="24" y="28.6" textAnchor="middle" fontFamily="'DM Sans', system-ui, sans-serif" fontWeight="700" fontSize="12.5" fill={W} letterSpacing="-0.3">xero</text>
    </>
  ),
  // tiny tiles: the wordmark is unreadable, so show Xero's bold "x" in the circle instead
  xeroSmall: (
    <>
      <circle cx="24" cy="24" r="18" fill="none" stroke={W} strokeWidth="4" />
      <path d="M17 17l14 14M31 17L17 31" stroke={W} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  dext: (
    <>
      <circle cx="21" cy="27" r="8.6" fill="none" stroke={W} strokeWidth="5" />
      <rect x="27.2" y="8" width="5" height="28.5" rx="2.5" fill={W} />
      <circle cx="37" cy="36" r="2.6" fill={W} />
    </>
  ),
  deputy: (
    <>
      <path d="M13 9h11.5C33.6 9 40 15.3 40 24s-6.4 15-15.5 15H13z" fill={W} />
      <path d="M19.5 15.5h5c5.2 0 8.6 3.4 8.6 8.5s-3.4 8.5-8.6 8.5h-5z" fill="#1B4FB8" />
      <path d="M8 31l7-3v7z" fill={W} />
    </>
  ),
  square: (
    <>
      <rect x="9" y="9" width="30" height="30" rx="7" fill="none" stroke={W} strokeWidth="4.2" />
      <rect x="18.5" y="18.5" width="11" height="11" rx="2.4" fill={W} />
    </>
  ),
  lightspeed: (
    <path d="M24.6 6c1.6 6.2-2.3 9.4-5.2 12.6-3.3 3.6-5.4 7-5.4 11.1C14 36.1 18.6 41 24.5 41S35 36.4 35 30.3c0-4.1-2-6.9-4.1-9.6.3 3.4-.9 6.1-3.4 7 .9-6.6-1.1-15.6-2.9-21.7zM24.4 39c-3 0-5.1-2.2-5.1-5 0-3.2 2.6-4.9 4.3-7.1.4 2.8 2.1 3.7 3.6 4.7 1.4 1 2.4 2.1 2.4 3.4 0 2.6-2.2 4-5.2 4z" fill={W} />
  ),
  marketman: (
    <>
      <path d="M9 35V15.5c0-1.4 1.7-2.1 2.7-1.1L24 26.4l12.3-12c1-1 2.7-.3 2.7 1.1V35" fill="none" stroke={W} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 40h20" stroke={W} strokeWidth="3.2" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  ordermentum: (
    <>
      <circle cx="21" cy="25" r="11" fill="none" stroke={W} strokeWidth="5" />
      <path d="M30 9.5h9v9" fill="none" stroke={W} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38.2 10.3l-8.4 8.4" stroke={W} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  canva: (
    <>
      <circle cx="24" cy="24" r="17.5" fill={W} />
      <text x="24.5" y="32.5" textAnchor="middle" fontFamily="'Pacifico', cursive" fontSize="22" fill="#5B39D9">C</text>
    </>
  ),
  podium: (
    <>
      <path d="M10 13.5C10 10.5 12.5 8 15.5 8h17c3 0 5.5 2.5 5.5 5.5v13c0 3-2.5 5.5-5.5 5.5H22l-7.5 7.2V32h-1A3.5 3.5 0 0 1 10 28.5z" fill={W} />
      <path d="M24 12.6l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" fill="#4F46E5" />
    </>
  ),
  slang: (
    <>
      {[[8, 20, 8], [14.5, 14, 20], [21, 8, 32], [27.5, 13, 22], [34, 18, 12], [40.5, 21.5, 5]].map(([x, y, h], i) => (
        <rect key={i} x={x - 2.4} y={y} width="4.8" height={h} rx="2.4" fill={W} />
      ))}
    </>
  ),
  mailchimp: (
    <>
      <circle cx="12.5" cy="22" r="5" fill={W} />
      <circle cx="35.5" cy="22" r="5" fill={W} />
      <ellipse cx="24" cy="23" rx="12.5" ry="13.5" fill={W} />
      <ellipse cx="24" cy="29.5" rx="8.3" ry="6.4" fill="#F7D774" />
      <circle cx="19.6" cy="20.3" r="1.9" fill="#3B2416" />
      <path d="M26.6 20.4h4" stroke="#3B2416" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M20.6 30.6c2.2 1.9 4.8 1.9 7 0" fill="none" stroke="#3B2416" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
}

const logoFor = (id, size) => (id === 'xero' && size < 44 ? LOGOS.xeroSmall : LOGOS[id])

export function BrandLogo({ id, size = 24, className = '' }) {
  const logo = logoFor(id, size)
  if (!logo) return null
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden>
      {logo}
    </svg>
  )
}

/** Gradient app-style icon tile with the tool's brand mark. */
export default function IconTile({ p, size = 84, radius, className = '', style }) {
  const logo = logoFor(p.id, size)
  return (
    <div
      className={`icon-tile ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.27,
        background: `linear-gradient(145deg, ${p.from}, ${p.to})`,
        fontSize: size * 0.5,
        ...style,
      }}
      title={p.name}
    >
      {logo ? (
        <svg className="icon-emoji icon-logo" viewBox="0 0 48 48" width={size * 0.62} height={size * 0.62} aria-hidden>
          {logo}
        </svg>
      ) : (
        <span className="icon-emoji">{p.emoji}</span>
      )}
      <span className="icon-gloss" />
    </div>
  )
}

/** Fade-up reveal on scroll. */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div', ...rest }) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Comp>
  )
}
