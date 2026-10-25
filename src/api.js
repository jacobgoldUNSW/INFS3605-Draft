// Tiny API client for the Express server (proxied at /api in dev).
const TOKEN_KEY = 'brewmind.token'
const GATE_KEY = 'brewmind.gate'

const stored = (key) => ({
  get() { try { return localStorage.getItem(key) } catch { return null } },
  set(t) { try { t ? localStorage.setItem(key, t) : localStorage.removeItem(key) } catch { /* private mode */ } },
})
export const tokenStore = stored(TOKEN_KEY)
// the pass from the group password page (see components/gate); every request carries it
export const gateStore = stored(GATE_KEY)

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function call(path, { method = 'GET', body, signal, auth = true } = {}) {
  const headers = { accept: 'application/json' }
  if (body !== undefined) headers['content-type'] = 'application/json'
  const token = tokenStore.get()
  if (auth && token) headers.authorization = `Bearer ${token}`
  const pass = gateStore.get()
  if (pass) headers['x-brewmind-gate'] = pass
  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError('Can’t reach the Brewmind server — is it running?', 0)
  }
  let data = null
  try { data = await res.json() } catch { /* empty */ }
  if (!res.ok) {
    // the pass expired or the password changed: back to the password page
    if (res.status === 401 && data?.gate) {
      gateStore.set(null)
      window.dispatchEvent(new Event('brewmind:locked'))
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status)
  }
  return data
}

export const api = {
  health: () => call('/health', { auth: false }),
  gate: () => call('/gate', { auth: false }),
  unlock: (password) => call('/gate', { method: 'POST', body: { password }, auth: false }),
  signup: (b) => call('/auth/signup', { method: 'POST', body: b, auth: false }),
  login: (b) => call('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => call('/auth/me'),
  savePlan: (b) => call('/plan', { method: 'PUT', body: b }),
  personalise: (b, signal) => call('/gemini/personalise-dashboard', { method: 'POST', body: b, signal }),
  agentStep: (b, signal) => call('/gemini/agent-step', { method: 'POST', body: b, signal }),
  // Bea, the host: the chat check-up and "Ask Bea" on the plan
  beaCheckup: (b, signal) => call('/bea/checkup', { method: 'POST', body: b, signal }),
  beaPlan: (b, signal) => call('/bea/plan', { method: 'POST', body: b, signal }),
}
