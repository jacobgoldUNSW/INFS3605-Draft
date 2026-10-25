import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PRODUCTS, USE_CASES, RANT_KEYWORDS } from '../../data/products'
import ProductCard from './ProductCard'
import FilterBar from './FilterBar'

// everything an owner might type: the tool, its worker, what it does, and the headaches it helps with
const HAYSTACK = Object.fromEntries(PRODUCTS.map((p) => [p.id, [
  p.name, p.vendor, p.tagline, p.description, p.worker.name, p.worker.role, p.worker.job,
  ...p.useCaseItems.map((u) => u.t), ...p.useCases.map((id) => USE_CASES.find((u) => u.id === id)?.label || ''),
].join(' ').toLowerCase()]))

export const SORTS = [
  { id: 'menu', label: 'Pantry order' },
  { id: 'hours', label: 'Most hours saved' },
  { id: 'cost', label: 'Lowest monthly cost' },
  { id: 'setup', label: 'Easiest setup' },
]
const SORTERS = {
  hours: (a, b) => b.hrs - a.hrs,
  cost: (a, b) => a.cost - b.cost,
  setup: (a, b) => b.metrics.setup - a.metrics.setup,
}

export function matches(p, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = HAYSTACK[p.id]
  if (hay.includes(q) || q.split(/\s+/).every((w) => hay.includes(w))) return true
  // headache words ("invoices", "sick", "waste") find the tools that help with them
  return RANT_KEYWORDS.some((k) => k.re.test(q) && k.tools.includes(p.id))
}

export function useCatalog() {
  const [query, setQuery] = useState('')
  const [useCase, setUseCase] = useState('all')
  const [dept, setDept] = useState('all')
  const [sort, setSort] = useState('menu')
  const list = useMemo(() => {
    const out = PRODUCTS.filter((p) => (useCase === 'all' || p.useCases.includes(useCase)) && (dept === 'all' || p.departments.includes(dept)) && matches(p, query))
    return SORTERS[sort] ? [...out].sort(SORTERS[sort]) : out
  }, [query, useCase, dept, sort])
  return { query, setQuery, useCase, setUseCase, dept, setDept, sort, setSort, list }
}

export function CatalogBrowser({ mode = 'market', onPick, recommendedIds = [] }) {
  const c = useCatalog()
  return (
    <>
      <FilterBar
        query={c.query} setQuery={c.setQuery}
        useCase={c.useCase} setUseCase={c.setUseCase}
        dept={c.dept} setDept={c.setDept}
        sort={c.sort} setSort={c.setSort}
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
