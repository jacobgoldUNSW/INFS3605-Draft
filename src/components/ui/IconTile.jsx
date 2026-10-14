import React from 'react'
import { motion } from 'framer-motion'

/** Gradient app-style icon tile. */
export default function IconTile({ p, size = 84, radius, className = '', style }) {
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
    >
      <span className="icon-emoji">{p.emoji}</span>
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
