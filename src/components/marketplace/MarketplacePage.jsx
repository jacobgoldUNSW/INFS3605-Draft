import React from 'react'
import { motion } from 'framer-motion'
import { CatalogBrowser } from './ProductGrid'

export default function MarketplacePage() {
  return (
    <div className="page marketplace">
      <header className="market-head">
        <motion.div
          className="market-kicker"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="script-note">the AI pantry</span>
        </motion.div>
        <motion.h1
          className="market-title"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Every tool on tap for your café
        </motion.h1>
        <motion.p
          className="market-sub"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Filter by your immediate problem or department. Tap the <span className="inline-plus">+</span> on any card for setup time, real costs, and pros & cons.
        </motion.p>
      </header>

      <CatalogBrowser mode="market" />
    </div>
  )
}
