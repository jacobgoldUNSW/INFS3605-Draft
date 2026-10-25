// One café per signed-in owner, kept alive across tab switches. Leaving the dashboard simply stops
// the animation loop (so the clock, Gemini calls and sound all stop); coming back picks up exactly
// where you left it — same customers, same mode, same log.
const sessions = new Map()

export function getCafeSession(key, make) {
  let s = sessions.get(key)
  if (!s) {
    s = { world: make(), ui: { mode: 'before', seenJournal: 0, tour: null } }
    sessions.set(key, s)
  }
  return s
}

/** The owner's café, if one is running (never creates one). */
export function peekCafeSession(key) {
  return sessions.get(key) || null
}

/** Forget every café except `keepKey` (sign-out, start over). */
export function dropCafeSessions(keepKey = null) {
  for (const [k, s] of sessions) {
    if (k === keepKey) continue
    s.world.destroy()
    sessions.delete(k)
  }
}
