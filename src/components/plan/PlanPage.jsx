import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../state'
import { PlanProvider } from './PlanContext'
import PlanHeader from './PlanHeader'
import ToolkitSidebar from './ToolkitSidebar'
import Overview from './Overview'
import CostsTab from './CostsTab'
import SetupTab from './SetupTab'
import ChecksTab from './ChecksTab'
import CafeTab from './CafeTab'
import CheckupFlow from '../checkup/CheckupFlow'
import Icon from '../ui/Icon'
import Botanical from '../ui/Botanical'

const ease = [0.22, 1, 0.36, 1]

function PlanSignIn() {
  const { openAuth, navigate } = useApp()
  return (
    <section className="plan-signin">
      <Botanical variant="coffee" className="ps-plant" sway />
      <div className="wrap-narrow ps-in">
        <span className="kicker">Your café plan</span>
        <h1>Five minutes now, and you’ll see exactly what AI could do for your café</h1>
        <p className="lede">Make a free account so we can save your plan, then tell Bea about your café by chat, by voice or with a quick form.</p>
        <div className="row wrap-row">
          <button className="btn btn-primary" onClick={() => openAuth('plan', () => navigate('plan'), 'signup')}>Start my plan <Icon name="arrowRight" size={18} className="go" /></button>
          <button className="btn btn-outline" onClick={() => openAuth('plan', () => navigate('plan'), 'login')}>I already have an account</button>
        </div>
      </div>
    </section>
  )
}

function PlanLayout({ tab }) {
  const bodyRef = useRef(null)
  const first = useRef(true)
  useEffect(() => {
    // switching tabs further down the page brings you back to the top of the new tab
    if (first.current) { first.current = false; return }
    const el = bodyRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 64 - 56 - 8
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
  }, [tab])
  const View = { overview: Overview, costs: CostsTab, setup: SetupTab, checks: ChecksTab, cafe: CafeTab }[tab] || Overview
  return (
    <div className={`plan tab-${tab}`}>
      <PlanHeader tab={tab} />
      <div className="wrap plan-body" ref={bodyRef}>
        <div className="plan-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3, ease }}>
              <View />
            </motion.div>
          </AnimatePresence>
        </div>
        <ToolkitSidebar />
      </div>
    </div>
  )
}

export default function PlanPage() {
  const { user, authReady, step, route } = useApp()
  const [, force] = useState(0)
  useEffect(() => { if (!authReady) { const t = setTimeout(() => force((n) => n + 1), 400); return () => clearTimeout(t) } }, [authReady])
  if (!authReady) return <div className="plan-wait"><span className="live-dot" /> Opening your plan…</div>
  if (!user) return <PlanSignIn />
  if (step < 3) return <CheckupFlow />
  return (
    <PlanProvider>
      <PlanLayout tab={route.sub || 'overview'} />
    </PlanProvider>
  )
}
