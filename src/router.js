// Tiny hash router: real, shareable sub-pages without touching the hosting setup.
//   #/                home
//   #/plan[/tab]      your plan: overview · costs · setup · checks · cafe
//   #/pantry[/tool]   the AI Pantry, or one tool's page
export const PLAN_TABS = ['overview', 'costs', 'setup', 'checks', 'cafe']
const PAGES = ['home', 'plan', 'pantry']

export function parseHash(hash = '') {
  const parts = hash.replace(/^#\/?/, '').split(/[/?]/).filter(Boolean)
  const page = PAGES.includes(parts[0]) ? parts[0] : 'home'
  let sub = parts[1] ? decodeURIComponent(parts[1]) : null
  if (page === 'plan' && sub && !PLAN_TABS.includes(sub)) sub = null
  if (page === 'home') sub = null
  return { page, sub }
}

export const hrefFor = (page = 'home', sub = null) =>
  `#/${page === 'home' ? '' : page}${sub && !(page === 'plan' && sub === 'overview') ? `/${encodeURIComponent(sub)}` : ''}`

export const sameRoute = (a, b) => a.page === b.page && (a.sub || null) === (b.sub || null)
