import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './state'
import TopNav from './components/layout/TopNav'
import HomePage from './components/home/HomePage'
import MarketplacePage from './components/marketplace/MarketplacePage'
import DashboardPage from './components/dashboard/DashboardPage'
import ProductModal from './components/marketplace/ProductModal'
import AuthModal from './components/auth/AuthModal'
import Ambient from './components/layout/Ambient'
import Gate from './components/gate/Gate'

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

function Footer() {
  return (
    <footer className="site-foot">
      <span>☕ Brewmind — made for busy café owners</span>
      <span>Pixel art by <a href="https://limezu.itch.io" target="_blank" rel="noreferrer">LimeZu</a> · Photography via <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a> · Estimates are illustrative</span>
    </footer>
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
      <Footer />
      <ProductModal />
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
