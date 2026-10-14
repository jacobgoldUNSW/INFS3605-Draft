import React, { useEffect, useRef } from 'react'
import { animate, useMotionValue } from 'framer-motion'

/** Smooth count-up / count-down number. */
export default function AnimatedNumber({
  value,
  from = 0,
  duration = 1.2,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}) {
  const ref = useRef(null)
  const fmt = useRef(format)
  fmt.current = format
  const mv = useMotionValue(from)

  useEffect(() => {
    const unsub = mv.on('change', (v) => {
      if (ref.current) ref.current.textContent = fmt.current(v)
    })
    return unsub
  }, [mv])

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [value, duration, mv])

  return (
    <span ref={ref} className={className}>
      {format(from)}
    </span>
  )
}
