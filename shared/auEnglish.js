// Gemini is asked for Australian English but still slips into US spelling now and then
// ("organized", "color", "favorite"). These rules put the common ones back.

const IZE = new Set([
  'organ', 'recogn', 'real', 'prior', 'optim', 'minim', 'maxim', 'custom', 'summar', 'personal', 'special', 'emphas',
  'apolog', 'categor', 'util', 'stabil', 'final', 'standard', 'modern', 'memor', 'author', 'familiar', 'capital',
  'visual', 'revital', 'energ', 'sanit', 'synchron', 'normal', 'central', 'digit', 'item', 'subsid', 'econom',
  'priorit', 'critic', 'mobil', 'formal',
])
const CENTRE = { center: 'centre', centers: 'centres', centered: 'centred', centering: 'centring' }
const ENDINGS = 'e|es|ed|ing|ation|ations|er|ers'
const sameCase = (src, out) => (src[0] === src[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out)

export function auSpelling(text) {
  if (typeof text !== 'string' || !text) return text
  return text
    .replace(new RegExp(`\\b([A-Za-z]+?)iz(${ENDINGS})\\b`, 'g'), (m, stem, end) => (IZE.has(stem.toLowerCase()) ? `${stem}is${end}` : m))
    .replace(/\b(colo|favo|flavo|behavio|neighbo|hono|harbo|endeavo|humo|rumo|savo)r(s|ed|ing|ite|ites|ful|able|hood|y)?\b/gi, (m, a, b = '') => `${a}ur${b}`)
    .replace(/\bcenter(s|ed|ing)?\b/gi, (m) => sameCase(m, CENTRE[m.toLowerCase()]))
    .replace(/\banalyz(e|es|ed|ing)\b/gi, (m, b) => sameCase(m, `analys${b}`))
    .replace(/\bcatalog(s)?\b/gi, (m, b = '') => sameCase(m, `catalogue${b}`))
}

// ids and enum values are left alone; every other string in the object is fixed up
const KEEP = new Set(['id', 'toolId', 'phase', 'primaryAgentId', 'collaboratorAgentId', 'artifactType', 'scenarioId', 'event', 'model', 'source'])

export function auDeep(value, key) {
  if (typeof value === 'string') return KEEP.has(key) ? value : auSpelling(value)
  if (Array.isArray(value)) return value.map((v) => auDeep(v, key))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = auDeep(v, k)
    return out
  }
  return value
}
