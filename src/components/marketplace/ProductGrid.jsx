import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PRODUCTS } from '../../data/products'
import ProductCard from './ProductCard'
import FilterBar from './FilterBar'

export function useCatalog() {
  const [query, setQuery] = useState('')
  const [useCase, setUseCase] = useState('all')
  const [dept, setDept] = useState('all')
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PRODUCTS.filter(
      (p) =>
        (useCase === 'all' || p.useCases.includes(useCase)) &&
        (dept === 'all' || p.departments.includes(dept)) &&
        (!q || p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q))
    )
  }, [query, useCase, dept])
  return { query, setQuery, useCase, setUseCase, dept, setDept, list }
}

export function CatalogBrowser({ mode = 'market', onPick, recommendedIds = [] }) {
  const c = useCatalog()
  return (
    <>
      <FilterBar
        query={c.query} setQuery={c.setQuery}
        useCase={c.useCase} setUseCase={c.setUseCase}
        dept={c.dept} setDept={c.setDept}
        count={c.list.length}
      />
      <ProductGrid products={c.list} mode={mode} onPick={onPick} recommendedIds={recommendedIds} />
    </>
  )
}

export default function ProductGrid({ products, mode, onPick, recommendedIds = [] }) {
  return (
    <motion.div layout className="grid">
      <AnimatePresence mode="popLayout">
        {products.map((p, i) => (
          <ProductCard
            key={p.id}
            p={p}
            index={i}
            mode={mode}
            onPick={onPick}
            recommended={recommendedIds.includes(p.id)}
          />
        ))}
      </AnimatePresence>
      {products.length === 0 && (
        <motion.div className="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="empty-emoji">🫖</div>
          <h3>Nothing brewing here yet</h3>
          <p>Try a different filter or search term.</p>
        </motion.div>
      )}
    </motion.div>
  )
}
