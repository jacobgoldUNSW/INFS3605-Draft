import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SURVEY } from './data/mockDashboard'
import { api, tokenStore } from './api'
import { dropCafeSessions } from './sim/session'
import { parseHash, hrefFor, sameRoute } from './router'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export const surveyComplete = (s) =>
  !!(s && s.name?.trim() && s.employees && s.revenue && s.cafeType && s.goal && s.pains?.length && s.tech)

// Bea's two conversations, the setup calendar she planned, and which setup steps are ticked off; saved with the plan
export const EMPTY_CHAT = { checkup: [], plan: [], schedule: null, done: [] }

/** Identity of the inputs a personalised plan was put together from (survey answers + tools). */
export const planKey = (survey, selected) =>
  JSON.stringify([survey?.name, survey?.employees, survey?.revenue, survey?.cafeType, survey?.goal, [...(survey?.pains || [])].sort(), survey?.tech, (survey?.rant || '').trim(), [...selected].sort()])

// old tab names, still used by a few components
const TAB_TO_PAGE = { home: 'home', dashboard: 'plan', marketplace: 'pantry' }
const PAGE_TO_TAB = { home: 'home', plan: 'dashboard', pantry: 'marketplace' }

export function AppProvider({ children }) {
  // ---------------- routing ----------------
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  const prevRoute = useRef(null)
  useEffect(() => {
    const on = () => {
      const next = parseHash(window.location.hash)
      setRoute((cur) => {
        if (sameRoute(cur, next)) return cur
        prevRoute.current = cur
        return next
      })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const [selected, setSelected] = useState([])
  const [survey, setSurvey] = useState(DEFAULT_SURVEY)
  // 0 check-up · 1 confirm tools · 2 putting it together · 3 the plan
  const [step, setStep] = useState(0)
  const [toast, setToast] = useState(null)
  const [geminiPlan, setGeminiPlan] = useState(null)
  const [beaChat, setBeaChat] = useState(EMPTY_CHAT)
  // "Talk to Bea" from anywhere: open her drawer, optionally already listening
  const [bea, setBea] = useState({ open: false, listen: false, n: 0 })
  const openBea = useCallback((listen = false) => setBea((b) => ({ open: true, listen, n: b.n + 1 })), [])
  const closeBea = useCallback(() => setBea((b) => ({ ...b, open: false, listen: false })), [])

  // ---------------- auth ----------------
  const [user, setUserState] = useState(null)
  // always-current user for callbacks queued before sign-in finished (avoids stale closures)
  const userRef = useRef(null)
  const setUser = useCallback((u) => { userRef.current = u; setUserState(u) }, [])
  const [authReady, setAuthReady] = useState(false)
  const [auth, setAuth] = useState({ open: false, reason: 'plan', mode: 'signup' })
  const pending = useRef(null)
  const lastSynced = useRef(null) // snapshot of what the server already has
  const [syncState, setSyncState] = useState('idle')

  const showToast = useCallback((msg, icon = 'check') => {
    const key = Date.now()
    setToast({ msg, icon, key })
    setTimeout(() => setToast((t) => (t && t.key === key ? null : t)), 2800)
  }, [])

  const hydrate = useCallback((u, plan) => {
    const s = { ...DEFAULT_SURVEY, ...(plan?.survey || {}), name: plan?.survey?.name || u?.cafeName || '' }
    const sel = Array.isArray(plan?.selected) ? plan.selected : []
    const gp = plan?.geminiPlan || null
    const chat = { ...EMPTY_CHAT, ...(plan?.chat || {}) }
    if (!Array.isArray(chat.done)) chat.done = []
    lastSynced.current = JSON.stringify([s, sel, gp, chat])
    setUser(u)
    setSurvey(s)
    setSelected(sel)
    setGeminiPlan(gp)
    setBeaChat(chat)
    const complete = surveyComplete(s)
    setStep(complete && sel.length ? 3 : complete ? 1 : 0)
  }, [setUser])

  useEffect(() => {
    if (!tokenStore.get()) { setAuthReady(true); return }
    let cancelled = false
    // only a real "expired" answer signs you out; a server restart or network blip just retries
    const restore = (attempt) => api.me()
      .then(({ user: u, plan }) => { if (!cancelled) hydrate(u, plan) })
      .catch((e) => {
        if (cancelled) return
        if (e.status === 401) tokenStore.set(null)
        else if (attempt < 4) return new Promise((r) => setTimeout(r, 800 * (attempt + 1))).then(() => restore(attempt + 1))
      })
    restore(0).finally(() => !cancelled && setAuthReady(true))
    return () => { cancelled = true }
  }, [hydrate])

  const openAuth = useCallback((reason = 'plan', action = null, mode) => {
    pending.current = action
    setAuth({ open: true, reason, mode: mode || (tokenStore.get() ? 'login' : 'signup') })
  }, [])
  const closeAuth = useCallback(() => {
    pending.current = null
    setAuth((a) => ({ ...a, open: false }))
  }, [])

  const completeAuth = useCallback(({ token, user: u, plan }, isNew) => {
    tokenStore.set(token)
    hydrate(u, plan)
    setAuth((a) => ({ ...a, open: false }))
    showToast(isNew ? `Welcome to Cafinity, ${u.cafeName}` : `Welcome back, ${u.cafeName}`, isNew ? 'leaf' : 'check')
    const act = pending.current
    pending.current = null
    if (act) setTimeout(act, 60)
  }, [hydrate, showToast])

  const go = useCallback((page, sub = null) => {
    const h = hrefFor(page, sub)
    if (window.location.hash !== h) window.location.hash = h
    else setRoute(parseHash(h))
  }, [])

  /** Move to a page (and sub-page). The plan needs an account, so ask first and carry on after. */
  const navigate = useCallback((page, sub = null) => {
    if (page === 'plan' && !userRef.current) {
      openAuth('plan', () => go('plan', sub))
      return
    }
    go(page, sub)
  }, [go, openAuth])

  const signOut = useCallback(() => {
    tokenStore.set(null)
    lastSynced.current = null
    dropCafeSessions()
    setUser(null)
    setSurvey(DEFAULT_SURVEY)
    setSelected([])
    setGeminiPlan(null)
    setBeaChat(EMPTY_CHAT)
    setStep(0)
    go('home')
    showToast('Signed out. Your plan is saved for next time.', 'check')
  }, [showToast, setUser, go])

  /** Run `action` now if signed in, otherwise ask them to sign in first and run it after. */
  const guard = useCallback((reason, action) => {
    if (userRef.current) return action()
    openAuth(reason, action)
  }, [openAuth])

  // compatibility with components written for the old tab switcher
  const tab = PAGE_TO_TAB[route.page]
  const setTab = useCallback((t) => navigate(TAB_TO_PAGE[t] || 'home'), [navigate])
  // clicking a tool anywhere opens its page in the AI Pantry
  const setOpenId = useCallback((id) => { if (id) go('pantry', id) }, [go])
  const openId = route.page === 'pantry' ? route.sub : null

  // ---------------- background plan sync ----------------
  useEffect(() => {
    if (!user) return
    const snap = JSON.stringify([survey, selected, geminiPlan, beaChat])
    if (snap === lastSynced.current) return
    setSyncState('saving')
    const t = setTimeout(() => {
      api.savePlan({ survey, selected, geminiPlan, chat: beaChat })
        .then(() => { lastSynced.current = snap; setSyncState('saved') })
        .catch(() => setSyncState('error'))
    }, 700)
    return () => clearTimeout(t)
  }, [user, survey, selected, geminiPlan, beaChat])

  const toggle = useCallback((id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }, [])

  const restart = useCallback(() => {
    setSurvey({ ...DEFAULT_SURVEY, name: user?.cafeName || '' })
    setSelected([])
    setGeminiPlan(null)
    setBeaChat(EMPTY_CHAT)
    setStep(0)
    dropCafeSessions()
  }, [user])

  const value = useMemo(
    () => ({
      route, navigate, prevRoute,
      tab, setTab, selected, setSelected, toggle, openId, setOpenId,
      survey, setSurvey, step, setStep, toast, showToast, restart,
      geminiPlan, setGeminiPlan, beaChat, setBeaChat,
      bea, openBea, closeBea,
      user, authReady, auth, openAuth, closeAuth, completeAuth, signOut, guard, syncState,
    }),
    [route, navigate, tab, setTab, selected, toggle, openId, setOpenId, survey, step, toast, showToast, restart,
      geminiPlan, beaChat, bea, openBea, closeBea, user, authReady, auth, openAuth, closeAuth, completeAuth, signOut, guard, syncState]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
