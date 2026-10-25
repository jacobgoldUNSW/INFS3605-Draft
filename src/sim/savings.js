// What the team saved the owner today, and what the same day looks like without them.
// Both are built only from what the team actually did in the café, so the "without" side is an honest estimate,
// not a second simulation. Used by the café bar, "Today", the café log and the closing-time wrap-up.

export const fmtMins = (m = 0) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`)
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The headline wins so far: time back, money kept or earned, calls answered, decisions checked with you. */
export function savedChips(s = {}) {
  const money = (s.dollars || 0) + (s.waste || 0)
  const asked = (s.approvalsYou || 0) + (s.approvalsAuto || 0)
  return [
    { k: 'time', icon: '🕒', v: fmtMins(s.minutes || 0), label: 'of your time back', on: (s.minutes || 0) > 0 },
    { k: 'money', icon: '💰', v: `$${money}`, label: 'kept or earned', on: money > 0 },
    { k: 'customers', icon: '🚶', v: `+${s.customers || 0}`, label: 'extra customers', on: (s.customers || 0) > 0 },
    { k: 'calls', icon: '📞', v: s.calls || 0, label: 'calls answered', on: (s.calls || 0) > 0 },
    { k: 'asked', icon: '✅', v: asked, label: 'asked you first', on: asked > 0 },
  ]
}

/** The same day on your own: one line per kind of work the team took on. */
export function withoutLines(s = {}) {
  const lines = []
  if (s.minutes) lines.push({ icon: '🕒', text: `${fmtMins(s.minutes)} more of your day on admin and chores` })
  if (s.waste) lines.push({ icon: '🗑️', text: `about $${s.waste} of stock in the bin` })
  if (s.dollars) lines.push({ icon: '💵', text: `about $${s.dollars} less in the till` })
  if (s.customers) lines.push({ icon: '🚶', text: `${plural(s.customers, 'customer')} fewer through the door` })
  if (s.calls) lines.push({ icon: '📞', text: `${plural(s.calls, 'call')} to answer yourself, or miss` })
  if (s.jobs) lines.push({ icon: '🧾', text: `${plural(s.jobs, 'job')} still on your to-do list tonight` })
  return lines
}

/** A finished job's result in a few words ("$85 kept · 20m back"), from what it added to the day. */
export function outcomeText(o = {}) {
  const bits = []
  if (o.waste) bits.push(`$${o.waste} of stock saved`)
  if (o.dollars) bits.push(`+$${o.dollars}`)
  if (o.customers) bits.push(`+${plural(o.customers, 'customer')}`)
  if (o.minutes) bits.push(`${fmtMins(o.minutes)} back`)
  if (o.calls) bits.push(plural(o.calls, 'call') + ' answered')
  return bits.join(' · ')
}
