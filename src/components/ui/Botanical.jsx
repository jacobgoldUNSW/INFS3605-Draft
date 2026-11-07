import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/* Hand-drawn style plant illustrations, generated from a few curves so they stay light and crisp.
   Line work uses currentColor; leaves carry a faint tint; coffee cherries are the only warm colour. */

const cub = (a, b, c, d, t) => {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}
const cubD = (a, b, c, d, t) => {
  const u = 1 - t
  return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c)
}
// a point and heading (degrees) along a chain of cubic segments [[x0,y0,x1,y1,x2,y2,x3,y3], ...]
function along(segs, T) {
  const n = segs.length
  const i = Math.min(n - 1, Math.floor(T * n))
  const t = T * n - i
  const s = segs[i]
  return {
    x: cub(s[0], s[2], s[4], s[6], t),
    y: cub(s[1], s[3], s[5], s[7], t),
    a: (Math.atan2(cubD(s[1], s[3], s[5], s[7], t), cubD(s[0], s[2], s[4], s[6], t)) * 180) / Math.PI,
  }
}
const segPath = (segs) => segs.map((s, i) => `${i ? '' : `M${s[0]} ${s[1]} `}C${s[2]} ${s[3]} ${s[4]} ${s[5]} ${s[6]} ${s[7]}`).join(' ')

// leaf shapes pointing along +x with the stalk at the origin
const leaf = (L, W) => `M0 0C${L * 0.2} ${-W} ${L * 0.7} ${-W * 0.92} ${L} 0C${L * 0.7} ${W * 0.92} ${L * 0.2} ${W} 0 0Z`
const heart = (L) => `M0 0C${-L * 0.16} ${-L * 0.44} ${L * 0.6} ${-L * 0.58} ${L} 0C${L * 0.6} ${L * 0.58} ${-L * 0.16} ${L * 0.44} 0 0Z`
const rib = (L) => `M${L * 0.04} 0L${L * 0.86} 0`

function useDraw(draw, i = 0, base = 0) {
  const reduce = useReducedMotion()
  if (!draw || reduce) return {}
  return {
    initial: { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, margin: '-40px' },
    transition: { pathLength: { duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: base + i * 0.05 }, opacity: { duration: 0.2, delay: base + i * 0.05 } },
  }
}

function Leaf({ x, y, a, d, ribD, draw, i, base, tint = 0.1, strokeWidth = 1.2 }) {
  const anim = useDraw(draw, i, base)
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})`}>
      <motion.path d={d} fill="currentColor" fillOpacity={tint} stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" {...anim} />
      {ribD && <motion.path d={ribD} fill="none" stroke="currentColor" strokeWidth={strokeWidth * 0.8} strokeLinecap="round" opacity={0.75} {...anim} />}
    </g>
  )
}

function Stem({ d, draw, width = 1.4 }) {
  const anim = useDraw(draw, 0, 0)
  return <motion.path d={d} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" {...anim} />
}

/** A trailing pothos vine, for top edges. */
function Vine({ draw }) {
  const segs = [
    [-10, 18, 90, -6, 170, 70, 270, 58],
    [270, 58, 370, 46, 420, 120, 520, 104],
    [520, 104, 590, 94, 615, 150, 640, 168],
  ]
  const leaves = useMemo(() => {
    const out = []
    const N = 15
    for (let k = 0; k < N; k++) {
      const T = 0.04 + (k / (N - 1)) * 0.92
      const p = along(segs, T)
      const side = k % 2 ? 1 : -1
      const L = 34 - k * 0.9
      out.push({ ...p, a: p.a + side * (58 + (k % 3) * 8), L })
    }
    return out
  }, [])
  return (
    <svg viewBox="0 0 640 200" fill="none" aria-hidden>
      <Stem d={segPath(segs)} draw={draw} />
      {leaves.map((l, i) => <Leaf key={i} x={l.x} y={l.y} a={l.a} d={heart(l.L)} ribD={rib(l.L)} draw={draw} i={i} base={0.25} />)}
    </svg>
  )
}

/** A fern frond rising from the bottom left. */
function Fern({ draw }) {
  const segs = [[30, 300, 70, 230, 120, 140, 230, 40]]
  const pinnae = useMemo(() => {
    const out = []
    const N = 17
    for (let k = 0; k < N; k++) {
      const T = 0.08 + (k / N) * 0.9
      const p = along(segs, T)
      const L = 58 * (1 - T * 0.82)
      for (const side of [-1, 1]) out.push({ ...p, a: p.a + side * 62, L, W: L * 0.2 })
    }
    return out
  }, [])
  return (
    <svg viewBox="0 0 260 310" fill="none" aria-hidden>
      <Stem d={segPath(segs)} draw={draw} />
      {pinnae.map((l, i) => <Leaf key={i} x={l.x} y={l.y} a={l.a} d={leaf(l.L, l.W)} draw={draw} i={i * 0.5} base={0.2} tint={0.08} strokeWidth={1.05} />)}
    </svg>
  )
}

/** A coffee branch: glossy paired leaves and ripe cherries. Our signature plant. */
function Coffee({ draw, cherries = true }) {
  const segs = [[10, 150, 90, 120, 170, 60, 300, 52], [300, 52, 360, 48, 400, 70, 440, 64]]
  const nodes = [0.1, 0.24, 0.38, 0.52, 0.66, 0.8, 0.93]
  const parts = useMemo(() => nodes.map((T, k) => {
    const p = along(segs, T)
    const L = 62 - k * 4.5
    return { ...p, L, k }
  }), [])
  const reduce = useReducedMotion()
  return (
    <svg viewBox="0 0 450 200" fill="none" aria-hidden>
      <Stem d={segPath(segs)} draw={draw} width={1.6} />
      {parts.map((n) => (
        <React.Fragment key={n.k}>
          <Leaf x={n.x} y={n.y} a={n.a - 52} d={leaf(n.L, n.L * 0.3)} ribD={rib(n.L)} draw={draw} i={n.k * 2} base={0.3} />
          <Leaf x={n.x} y={n.y} a={n.a + 48} d={leaf(n.L * 0.92, n.L * 0.28)} ribD={rib(n.L * 0.92)} draw={draw} i={n.k * 2 + 1} base={0.3} />
        </React.Fragment>
      ))}
      {cherries && parts.filter((n) => [1, 3, 5].includes(n.k)).map((n, j) => (
        <motion.g
          key={`c${n.k}`}
          initial={draw && !reduce ? { scale: 0, opacity: 0 } : false}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.1 + j * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
        >
          {[[-7, 6], [1, 9], [8, 4], [-1, 1]].slice(0, 3 + (j % 2)).map(([dx, dy], c) => (
            <circle key={c} cx={n.x + dx} cy={n.y + dy} r={4.6} fill={c % 2 ? 'var(--terracotta)' : 'var(--caramel)'} stroke="currentColor" strokeWidth={0.8} />
          ))}
        </motion.g>
      ))}
    </svg>
  )
}

/** A small sprig, for corners and dividers. */
function Sprig({ draw }) {
  const segs = [[8, 90, 30, 70, 60, 40, 110, 14]]
  const ls = useMemo(() => [0.18, 0.34, 0.5, 0.66, 0.82].flatMap((T, k) => {
    const p = along(segs, T)
    const L = 24 - k * 2.2
    return [{ ...p, a: p.a - 50, L }, { ...p, a: p.a + 50, L: L * 0.9 }]
  }), [])
  return (
    <svg viewBox="0 0 120 100" fill="none" aria-hidden>
      <Stem d={segPath(segs)} draw={draw} width={1.2} />
      {ls.map((l, i) => <Leaf key={i} x={l.x} y={l.y} a={l.a} d={leaf(l.L, l.L * 0.32)} draw={draw} i={i} base={0.15} strokeWidth={1.05} />)}
    </svg>
  )
}

const VARIANTS = { vine: Vine, fern: Fern, coffee: Coffee, sprig: Sprig }

export default function Botanical({ variant = 'sprig', className = '', style, draw = true, sway = false, ...rest }) {
  const C = VARIANTS[variant] || Sprig
  return (
    <div className={`botanical ${className}`} style={style} aria-hidden>
      <div className={sway ? 'sway' : undefined} style={{ transformOrigin: 'left bottom' }}>
        <C draw={draw} {...rest} />
      </div>
    </div>
  )
}
