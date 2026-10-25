import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import AnimatedNumber from '../ui/AnimatedNumber'

const ease = [0.22, 1, 0.36, 1]
const spring = { type: 'spring', stiffness: 120, damping: 20 }

/* ---------------------------------- Bar chart --------------------------------- */
/** Admin hours by day: today as a pale ghost bar, with your team as the solid bar in front. */
export function BarChart({ days, before, after }) {
  const W = 480, H = 250, pl = 34, pb = 34, pt = 16
  const data = after
  const max = Math.max(...before) * 1.2
  const bw = 30
  const step = (W - pl - 10) / days.length
  const ch = H - pb - pt
  const [hover, setHover] = useState(null)
  const color = '#D9772B'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" onMouseLeave={() => setHover(null)}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={pl} x2={W - 6} y1={pt + ch * (1 - t)} y2={pt + ch * (1 - t)} stroke="rgba(139,94,60,0.12)" strokeDasharray="4 6" />
          <text x={pl - 8} y={pt + ch * (1 - t) + 4} textAnchor="end" className="axis">{Math.round(max * t)}</text>
        </g>
      ))}
      {days.map((d, i) => {
        const h = (data[i] / max) * ch
        const x = pl + i * step + (step - bw) / 2
        const ghost = (before[i] / max) * ch
        return (
          <g key={d} onMouseEnter={() => setHover(i)}>
            {/* today, as a ghost behind the bar */}
            <motion.rect
              x={x} width={bw} rx="9" fill="rgba(139,94,60,0.14)"
              initial={{ y: pt + ch, height: 0, opacity: 0 }}
              animate={{ y: pt + ch - ghost, height: ghost, opacity: 1 }}
              transition={{ ...spring, delay: i * 0.04 }}
            />
            <motion.rect
              x={x} width={bw} rx="9"
              initial={{ y: pt + ch, height: 0 }}
              animate={{ y: pt + ch - h, height: h, fill: color }}
              transition={{ ...spring, delay: i * 0.05 }}
              style={{ filter: hover === i ? 'brightness(1.1)' : 'none' }}
            />
            <rect x={pl + i * step} y={pt} width={step} height={ch} fill="transparent" />
            <text x={x + bw / 2} y={H - 12} textAnchor="middle" className="axis">{d}</text>
            {hover === i && (
              <motion.g initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <rect x={x + bw / 2 - 46} y={pt + ch - h - 32} width="92" height="24" rx="12" fill="#3B2416" />
                <text x={x + bw / 2} y={pt + ch - h - 16} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{data[i]}h · now {before[i]}h</text>
              </motion.g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ---------------------------------- Donut chart --------------------------------- */
/** What fills the admin week with your team, and how many hours it was before. */
export function Donut({ before, after }) {
  const data = after
  const was = before.reduce((s, d) => s + d.hours, 0)
  const r = 66
  const C = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.hours, 0)
  let acc = 0
  const gap = 4
  const [hover, setHover] = useState(null)

  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 180 180" width="190" height="190">
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(139,94,60,0.08)" strokeWidth="26" />
          <g transform="rotate(-90 90 90)">
            {data.map((d, i) => {
              const len = Math.max((d.hours / total) * C - gap, 1)
              const off = -acc
              acc += (d.hours / total) * C
              return (
                <motion.circle
                  key={d.label}
                  cx="90" cy="90" r={r} fill="none" stroke={d.color} strokeWidth={hover === i ? 31 : 26} strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: 0 }}
                  animate={{ strokeDasharray: `${len} ${C - len}`, strokeDashoffset: off }}
                  transition={{ duration: 1, ease, delay: i * 0.06 }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                />
              )
            })}
          </g>
        </svg>
        <div className="donut-center">
          <div className="donut-num"><AnimatedNumber value={hover !== null ? data[hover].hours : total} duration={0.8} /></div>
          <div className="donut-lab">{hover !== null ? `hrs · ${data[hover].label.split(' ')[0]} (now ${before[hover].hours})` : `admin hrs / wk (now ${was})`}</div>
        </div>
      </div>
      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={hover === i ? 'hl' : ''}>
            <span className="dot" style={{ background: d.color }} />
            <span className="leg-label">{d.label}</span>
            <b><AnimatedNumber value={d.hours} duration={0.9} />h</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------------------------- Line chart --------------------------------- */
function smooth(points) {
  // Catmull-Rom → cubic bezier (always the same command count so Framer can morph it)
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/** Profit over the next year: with your team (solid, ramping up as tools bed in) against nothing changing (dashed). */
export function LineChart({ months, before, after }) {
  const W = 620, H = 270, pl = 52, pr = 16, pt = 20, pb = 34
  const all = [...before, ...after]
  const lo = Math.min(...all) * 0.8
  const hi = Math.max(...all) * 1.1
  const x = (i) => pl + (i * (W - pl - pr)) / (months.length - 1)
  const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb)
  const pts = (arr) => arr.map((v, i) => [x(i), y(v)])
  const cur = after
  const dMain = smooth(pts(cur))
  const dGhost = smooth(pts(before))
  const dArea = `${dMain} L${x(months.length - 1)},${H - pb} L${x(0)},${H - pb} Z`
  const [hover, setHover] = useState(null)
  const svgRef = useRef(null)
  const color = '#D9772B'
  const fmt = (v) => `$${Math.round(v).toLocaleString()}`

  const onMove = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const idx = Math.round(((px - pl) / (W - pl - pr)) * (months.length - 1))
    setHover(Math.max(0, Math.min(months.length - 1, idx)))
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="chart-svg" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
          <motion.stop offset="0" animate={{ stopColor: color }} stopOpacity="0.32" />
          <motion.stop offset="1" animate={{ stopColor: color }} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const v = lo + (hi - lo) * t
        const yy = y(v)
        return (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={yy} y2={yy} stroke="rgba(139,94,60,0.12)" strokeDasharray="4 6" />
            <text x={pl - 10} y={yy + 4} textAnchor="end" className="axis">${Math.round(v / 100) / 10}k</text>
          </g>
        )
      })}
      {months.map((m, i) => (
        <text key={m} x={x(i)} y={H - 10} textAnchor="middle" className="axis">{m}</text>
      ))}

      <motion.path d={dArea} fill="url(#areaFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} />
      <motion.path
        d={dGhost} fill="none" stroke="#8B5E3C" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
      />
      <motion.path
        d={dMain} fill="none" strokeWidth="4" strokeLinecap="round"
        initial={{ pathLength: 0, d: dMain, stroke: color }}
        animate={{ d: dMain, pathLength: 1, stroke: color }}
        transition={{ d: { duration: 1.1, ease }, pathLength: { duration: 1.4, ease }, stroke: { duration: 0.6 } }}
      />
      {cur.map((v, i) => (
        <motion.circle
          key={i} r={hover === i ? 7 : 4} fill="#fff" strokeWidth="3"
          initial={{ cx: x(i), cy: y(v), opacity: 0 }}
          animate={{ cx: x(i), cy: y(v), opacity: 1, stroke: color }}
          transition={{ duration: 0.8, delay: 0.5 + i * 0.04, ease }}
        />
      ))}
      {hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={pt} y2={H - pb} stroke={color} strokeOpacity="0.3" />
          <rect x={Math.min(Math.max(x(hover) - 78, pl), W - pr - 156)} y={y(cur[hover]) - 42} width="156" height="26" rx="13" fill="#3B2416" />
          <text x={Math.min(Math.max(x(hover), pl + 78), W - pr - 78)} y={y(cur[hover]) - 24} textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="700">{fmt(cur[hover])} · now {fmt(before[hover])}</text>
        </g>
      )}
    </svg>
  )
}
