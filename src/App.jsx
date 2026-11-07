import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './state'
import { hrefFor } from './router'
import TopNav, { NAV } from './components/layout/TopNav'
import HomePage from './components/home/HomePage'
import PantryPage from './components/marketplace/MarketplacePage'
import ToolPage from './components/marketplace/ToolPage'
import PlanPage from './components/plan/PlanPage'
import AuthModal from './components/auth/AuthModal'
import BeaLayer from './components/bea/BeaLayer'
import Gate from './components/gate/Gate'
import Logo from './components/ui/Logo'
import Icon from './components/ui/Icon'
import Botanical from './components/ui/Botanical'

function Toast() {
  const { toast } = useApp()
  return (
    <div className="toast-host" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            className="toast"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Icon name={toast.icon || 'check'} size={18} /> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Footer() {
  const { navigate } = useApp()
  const follow = (page, sub) => (e) => { e.preventDefault(); navigate(page, sub) }
  return (
    <footer className="foot on-dark">
      <Botanical variant="vine" className="foot-plant" draw={false} />
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Logo onClick={follow('home')} />
          <p>See what AI could take off your plate before you spend a cent. Made for independent cafés.</p>
        </div>
        <div className="foot-col">
          <h5>Cafinity</h5>
          <ul>
            {NAV.map((n) => <li key={n.page}><a href={hrefFor(n.page)} onClick={follow(n.page)}>{n.label}</a></li>)}
          </ul>
        </div>
        <div className="foot-col">
          <h5>Your plan</h5>
          <ul>
            <li><a href={hrefFor('plan', 'costs')} onClick={follow('plan', 'costs')}>What it costs</a></li>
            <li><a href={hrefFor('plan', 'setup')} onClick={follow('plan', 'setup')}>Getting set up</a></li>
            <li><a href={hrefFor('plan', 'checks')} onClick={follow('plan', 'checks')}>Reality checks</a></li>
          </ul>
        </div>
      </div>
      <div className="wrap foot-base">
        <span>A UNSW INFS3605 prototype. Estimates are illustrative; check prices with each vendor.</span>
        <span>Photography via <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a> · Café pixel art by <a href="https://limezu.itch.io" target="_blank" rel="noreferrer">LimeZu</a></span>
      </div>
    </footer>
  )
}

function Shell() {
  const { route } = useApp()
  const last = useRef(route)
  useEffect(() => {
    // a new page starts at the top; switching tabs inside the plan keeps your place
    const prev = last.current
    last.current = route
    if (prev.page !== route.page || route.page === 'pantry') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [route])

  const key = route.page === 'pantry' ? `pantry/${route.sub || ''}` : route.page
  return (
    <>
      <a className="sr-only" href="#main">Skip to content</a>
      <TopNav />
      {/* each page fades in as it arrives (no exit wait, so a change of page is never held up) */}
      <motion.main
        id="main"
        key={key}
        className="page-enter"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {route.page === 'home' && <HomePage />}
        {route.page === 'plan' && <PlanPage />}
        {route.page === 'pantry' && (route.sub ? <ToolPage id={route.sub} /> : <PantryPage />)}
      </motion.main>
      <Footer />
      <BeaLayer />
      <AuthModal />
      <Toast />
    </>
  )
}

export default function App() {
  // the group password page stands in front of everything; nothing below loads or calls the API until it opens
  return (
    <Gate>
      <AppProvider>
        <Shell />
      </AppProvider>
    </Gate>
  )
}
