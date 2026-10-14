import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './state'
import TopNav from './components/layout/TopNav'
import HomePage from './components/home/HomePage'
import MarketplacePage from './components/marketplace/MarketplacePage'
import DashboardPage from './components/dashboard/DashboardPage'
import ProductModal from './components/marketplace/ProductModal'

const BEANS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 83) % 100}%`,
  size: 14 + ((i * 7) % 16),
  dur: 18 + ((i * 5) % 14),
  delay: -((i * 3) % 18),
}))

function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      {BEANS.map((b, i) => (
        <span key={i} className="float-bean" style={{ left: b.left, width: b.size, height: b.size * 1.35, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  )
}

function Toast() {
  const { toast } = useApp()
  return (
    <div className="toast-host">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            className="toast"
            initial={{ y: 40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <span>{toast.icon}</span> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Shell() {
  const { tab } = useApp()

  useEffect(() => {
    // scroll to top on tab change
    window.scrollTo({ top: 0 })
  }, [tab])

  return (
    <>
      <Ambient />
      <TopNav />
      <main className="main">
        {tab === 'home' && <HomePage />}
        {tab === 'marketplace' && <MarketplacePage />}
        {tab === 'dashboard' && <DashboardPage />}
      </main>
      <ProductModal />
      <Toast />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
