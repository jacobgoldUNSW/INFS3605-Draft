import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_SURVEY } from './data/mockDashboard'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [tab, setTab] = useState('home')
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

  const toggle = useCallback((id) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }, [])

  const showToast = useCallback((msg, icon = '☕') => {
    const key = Date.now()
    setToast({ msg, icon, key })
    setTimeout(() => setToast((t) => (t && t.key === key ? null : t)), 2600)
  }, [])

  const restart = useCallback(() => {
    setSurvey(DEFAULT_SURVEY)
    setSelected([])
    setStep(0)
  }, [])

  const value = useMemo(
    () => ({
      tab, setTab, selected, setSelected, toggle, openId, setOpenId, openShared,
      survey, setSurvey, step, setStep, toast, showToast, restart,
    }),
    [tab, selected, toggle, openId, setOpenId, openShared, survey, step, toast, showToast, restart]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
