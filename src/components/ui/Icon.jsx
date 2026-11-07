import React from 'react'

/* One thin-line icon set for the whole app (24 × 24, stroke = currentColor). Replaces emoji in the interface. */
const P = {
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  hourglass: <><path d="M7 3.5h10M7 20.5h10" /><path d="M8 3.5v2.4a4 4 0 0 0 1.6 3.2L12 11l2.4-1.9A4 4 0 0 0 16 5.9V3.5M8 20.5v-2.4a4 4 0 0 1 1.6-3.2L12 13l2.4 1.9a4 4 0 0 1 1.6 3.2v2.4" /></>,
  coins: <><ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" /><path d="M5.5 6.5v4c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-4" /><path d="M5.5 10.5v4c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-4" /><path d="M5.5 14.5v3c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-3" /></>,
  receipt: <><path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15.5" rx="0.5" /><path d="M4 9.5h16M8.5 3v4M15.5 3v4" /></>,
  leaf: <><path d="M5 19c0-8.2 5.2-14 14-14 0 8.8-5.8 14-14 14z" /><path d="M5 19c3-3.2 6.2-6.3 9.4-9.4" /></>,
  sprout: <><path d="M12 21v-8.5" /><path d="M12 12.5c0-3.9-2.9-6.3-7-6.3 0 3.9 2.9 6.3 7 6.3z" /><path d="M12 10.5c0-3.4 2.5-5.6 6.4-5.6 0 3.5-2.5 5.6-6.4 5.6z" /></>,
  cup: <><path d="M5 9h11v4.5A5.5 5.5 0 0 1 10.5 19h0A5.5 5.5 0 0 1 5 13.5z" /><path d="M16 10.5h1.2a2.4 2.4 0 0 1 0 4.8H16" /><path d="M8.5 3.5c0 1.3.9 1.4.9 2.8M12 3.5c0 1.3.9 1.4.9 2.8" /><path d="M4 21h13" /></>,
  milk: <><path d="M9 3h6v3l2 3v12H7V9l2-3z" /><path d="M7 13h10" /></>,
  phone: <><path d="M7 3.5h2.6l1.5 4.2-1.9 1.3a11 11 0 0 0 5.8 5.8l1.3-1.9 4.2 1.5V17a2.5 2.5 0 0 1-2.5 2.5A15 15 0 0 1 4.5 6 2.5 2.5 0 0 1 7 3.5z" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M16.2 14.1c2.6.4 4.3 2.6 4.3 5.4" /></>,
  user: <><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" /></>,
  doc: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
  chart: <><path d="M4 20h16" /><path d="M7.5 16.5v-4M12 16.5V7.5M16.5 16.5V10" /></>,
  trendDown: <><path d="M4 7l6 6 3.5-3.5L20 16" /><path d="M20 11.5V16h-4.5" /></>,
  trendUp: <><path d="M4 17l6-6 3.5 3.5L20 8" /><path d="M20 12.5V8h-4.5" /></>,
  arrowRight: <><path d="M4.5 12h15M13.5 6l6 6-6 6" /></>,
  arrowLeft: <><path d="M19.5 12h-15M10.5 6l-6 6 6 6" /></>,
  external: <><path d="M7 17L17 7M9 7h8v8" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  close: <><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></>,
  chevronDown: <><path d="M6 9.5l6 6 6-6" /></>,
  chevronUp: <><path d="M6 14.5l6-6 6 6" /></>,
  chevronRight: <><path d="M9.5 6l6 6-6 6" /></>,
  chevronLeft: <><path d="M14.5 6l-6 6 6 6" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" /></>,
  micOff: <><path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 9.5V6a3 3 0 0 0-5.7-1.3" /><path d="M5.5 11a6.5 6.5 0 0 0 10.6 5M18.5 11c0 .8-.1 1.5-.4 2.2M12 17.5V21M9 21h6M4 4l16 16" /></>,
  speaker: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.5 7.5 0 0 1 0 10.4" /></>,
  speakerOff: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  music: <><path d="M9 18V5.5l10-2V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>,
  play: <><path d="M8 5.5v13l10.5-6.5z" /></>,
  pause: <><path d="M9 5.5v13M15 5.5v13" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.1" /></>,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4.5M12 17.2v.1" /></>,
  shield: <><path d="M12 3.5l7 2.8v5.6c0 4.3-2.9 7.6-7 8.6-4.1-1-7-4.3-7-8.6V6.3z" /><path d="M9 12l2.2 2.2L15.5 10" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M19.5 19.5L15.5 15.5" /></>,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  store: <><path d="M4.5 10.5V20h15v-9.5" /><path d="M3 5h18l-1.2 4.2a2.6 2.6 0 0 1-5 0 2.6 2.6 0 0 1-5 0 2.6 2.6 0 0 1-5 0z" /><path d="M10 20v-5h4v5" /></>,
  truck: <><path d="M3 6.5h11v9.5H3zM14 10h3.8l3.2 3.2V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="0.5" /><path d="M4 7l8 6 8-6" /></>,
  megaphone: <><path d="M4 10v4h3l8.5 5V5L7 10z" /><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" /></>,
  box: <><path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z" /><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9" /></>,
  book: <><path d="M5 5a2 2 0 0 1 2-2h11v15H7a2 2 0 0 0-2 2z" /><path d="M5 20a2 2 0 0 0 2 1h11v-3" /></>,
  chat: <><path d="M4 5h16v11H9.5L5 19.5V16H4z" /><path d="M8 9.5h8M8 12.5h5" /></>,
  palette: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.7-.8 1.7-1.6 0-1.1-.9-1.5-.9-2.5 0-.9.8-1.6 1.7-1.6h2a4 4 0 0 0 4-4c0-4.1-3.8-7.3-8.5-7.3z" /><circle cx="7.8" cy="11.5" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="8" r="1" /></>,
  star: <><path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" /></>,
  quote: <><path d="M10 7c-2.4.9-3.8 3-3.8 6v4.5H10V13H7.8M18 7c-2.4.9-3.8 3-3.8 6v4.5H18V13h-2.2" /></>,
  sun: <><circle cx="12" cy="12" r="3.8" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,
  moon: <><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" /></>,
  rain: <><path d="M7 15.5a4 4 0 0 1-.5-7.9 5.5 5.5 0 0 1 10.6 1.1A3.5 3.5 0 0 1 17 15.5z" /><path d="M8.5 18.5l-1 2M12.5 18.5l-1 2M16.5 18.5l-1 2" /></>,
  pencil: <><path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z" /><path d="M14 6.8l3.2 3.2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="0.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  dollar: <><path d="M12 3v18" /><path d="M16.2 7.5c-.8-1.2-2.4-2-4.2-2-2.3 0-4.1 1.3-4.1 3.1s1.8 2.6 4.1 3.1 4.2 1.3 4.2 3.1-1.9 3.1-4.2 3.1c-1.9 0-3.5-.8-4.3-2.1" /></>,
  scale: <><path d="M12 4v16M7.5 20h9M5 7.5h14" /><path d="M5 7.5L2.5 13a2.7 2.7 0 0 0 5 0zM19 7.5L16.5 13a2.7 2.7 0 0 0 5 0z" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" /><rect x="13.5" y="4" width="6.5" height="6.5" /><rect x="4" y="13.5" width="6.5" height="6.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" /></>,
  list: <><path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.5M4.5 12h.5M4.5 17.5h.5" /></>,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></>,
  print: <><path d="M7 8.5V3.5h10v5" /><rect x="4" y="8.5" width="16" height="8" /><path d="M7 14h10v6.5H7z" /></>,
  refresh: <><path d="M19.5 11a7.5 7.5 0 1 0-2.2 5.3" /><path d="M19.5 4.5V11H13" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  bin: <><path d="M4.5 7h15M9.5 7V4h5v3M6.5 7l1 13.5h9l1-13.5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  wave: <><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" /></>,
  bolt: <><path d="M13 3L5.5 13H12l-1 8 7.5-10H12z" /></>,
  door: <><path d="M6 21V3.5h12V21M3.5 21h17" /><path d="M14.5 12.5v.1" /></>,
  heart: <><path d="M12 19.5S4 14.8 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2c0 5.6-8 10.3-8 10.3z" /></>,
  flag: <><path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" /></>,
  pin: <><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.3" /></>,
  sparkle: <><path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M7 17l2-2M15 9l2-2" /></>,
  bean: <><ellipse cx="12" cy="12" rx="6" ry="8.5" transform="rotate(-30 12 12)" /><path d="M9 6.8c1.6 2.8.2 4.4 1.5 6.6 1.2 2 3.6 2.4 3.9 4.2" /></>,
  sun2: <><circle cx="12" cy="12" r="8.5" /></>,
}

export const ICONS = Object.keys(P)

export default function Icon({ name, size = 20, stroke = 1.5, className = '', title, style }) {
  const path = P[name]
  if (!path) return null
  return (
    <svg
      className={`ico ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={style}
    >
      {title && <title>{title}</title>}
      {path}
    </svg>
  )
}
