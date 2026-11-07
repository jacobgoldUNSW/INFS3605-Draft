import React from 'react'
import { getProduct } from '../../data/products'

/** One tool's page in the AI Pantry (built out in the pantry phase). */
export default function ToolPage({ id }) {
  const p = getProduct(id)
  return <div className="wrap sec"><h1>{p ? p.name : 'Tool not found'}</h1></div>
}
