import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SURVEY } from './data/mockDashboard'
import { api, tokenStore } from './api'
import { dropCafeSessions } from './sim/session'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export const surveyComplete = (s) =>
  !!(s && s.name?.trim() && s.employees && s.revenue && s.cafeType && s.goal && s.pains?.length && s.tech)

// Bea's two conversations and the setup calendar she planned; saved with the plan
export const EMPTY_CHAT = { checkup: [], plan: [], schedule: null }

/** Identity of the inputs a personalised plan was brewed from (survey answers + tools). */
export const planKey = (survey, selected) =>
  JSON.stringify([survey?.name, survey?.employees, survey?.revenue, survey?.cafeType, survey?.goal, [...(survey?.pains || [])].sort(), survey?.tech, (survey?.rant || '').trim(), [...selected].sort()])

export function AppProvider({ children }) {
  const [tab, setTabRaw] = useState('home')
  const [selected, setSelected] = useState([])
  const [openId, setOpenRaw] = useState(null)
  // shared = the popup morphs out of the grid card that was clicked
  const [openShared, setOpenShared] = useState(true)
  const setOpenId = useCallback((id, shared = true) => {
    setOpenShared(shared)
    setOpenRaw(id)
  }, [])
  const [survey, setSurvey] = useState(DEFAULT_SURVEY)
  // 0 survey · 1 picker · 2 brewing · 3 dashboard
  const [step, setStep] = useState(0)
  const [toast, setToast] = useState(null)
  const [geminiPlan, setGeminiPlan] = useState(null)
  // Before/After for the live café — lives here so it survives switching tabs
  const [cafeMode, setCafeMode] = useState('before')
  const [beaChat, setBeaChat] = useState(EMPTY_CHAT)

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

  const showToast = useCallback((msg, icon = '☕') => {
    const key = Date.now()
    setToast({ msg, icon, key })
    setTimeout(() => setToast((t) => (t && t.key === key ? null : t)), 2600)
  }, [])

  const hydrate = useCallback((u, plan) => {
    const s = { ...DEFAULT_SURVEY, ...(plan?.survey || {}), name: plan?.survey?.name || u?.cafeName || '' }
    const sel = Array.isArray(plan?.selected) ? plan.selected : []
    const gp = plan?.geminiPlan || null
    const chat = { ...EMPTY_CHAT, ...(plan?.chat || {}) }
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
    showToast(isNew ? `Welcome to Brewmind, ${u.cafeName}!` : `Welcome back, ${u.cafeName}!`, isNew ? '🎉' : '☕')
    const act = pending.current
    pending.current = null
    if (act) setTimeout(act, 60)
  }, [hydrate, showToast])

  const signOut = useCallback(() => {
    tokenStore.set(null)
    lastSynced.current = null
    dropCafeSessions()
    setCafeMode('before')
    setUser(null)
    setSurvey(DEFAULT_SURVEY)
    setSelected([])
    setGeminiPlan(null)
    setBeaChat(EMPTY_CHAT)
    setStep(0)
    setTabRaw('home')
    showToast('Signed out — your plan is saved for next time', '👋')
  }, [showToast, setUser])

  /** Run `action` now if signed in, otherwise ask them to sign in first and run it after. */
  const guard = useCallback((reason, action) => {
    if (userRef.current) return action()
    openAuth(reason, action)
  }, [openAuth])

  const setTab = useCallback((t) => {
    if (t === 'dashboard' && !userRef.current) {
      openAuth('plan', () => setTabRaw('dashboard'))
      return
    }
    setTabRaw(t)
  }, [openAuth])

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
    setCafeMode('before')
  }, [user])

  const value = useMemo(
    () => ({
      tab, setTab, selected, setSelected, toggle, openId, setOpenId, openShared,
      survey, setSurvey, step, setStep, toast, showToast, restart,
      geminiPlan, setGeminiPlan, cafeMode, setCafeMode, beaChat, setBeaChat,
      user, authReady, auth, openAuth, closeAuth, completeAuth, signOut, guard, syncState,
    }),
    [tab, setTab, selected, toggle, openId, setOpenId, openShared, survey, step, toast, showToast, restart,
      geminiPlan, cafeMode, beaChat, user, authReady, auth, openAuth, closeAuth, completeAuth, signOut, guard, syncState]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
