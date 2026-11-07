import React from 'react'
import { useApp } from '../../state'
import { getProduct } from '../../data/products'
import { usePlan } from './PlanContext'
import { LazyStage } from '../cafe/LazyCafe'
import Icon from '../ui/Icon'

/** The full café simulation: a demonstration of the plan, not the plan itself. */
export default function CafeTab() {
  const { survey, selected, toggle, showToast, user } = useApp()
  const { name } = usePlan()
  const userKey = String(user?.id ?? user?.username ?? 'guest')
  return (
    <div className="cafe-tab">
      <section className="cf-intro">
        <div>
          <span className="kicker">Your café, simulated</span>
          <h2>Watch a day at {name} with your tools</h2>
          <p className="lede">A moving picture of what your plan would do. The customers are pretend; the tools step in where they would in real life, and anything that matters waits for your OK.</p>
        </div>
        <ul className="cf-do">
          <li><Icon name="eye" size={20} /><span><b>Watch</b> where the time goes as the day runs.</span></li>
          <li><Icon name="check" size={20} /><span><b>Approve or decline</b> when a tool asks before spending money or messaging customers.</span></li>
          <li><Icon name="rain" size={20} /><span><b>Try a curveball</b>, like rain or a sick barista, and see who handles it.</span></li>
        </ul>
      </section>
      <LazyStage
        selected={selected}
        cafeName={name}
        userKey={userKey}
        profile={{ employees: survey.employees, cafeType: survey.cafeType }}
        onToggleWorker={(id) => {
          const p = getProduct(id)
          const adding = !selected.includes(id)
          toggle(id)
          showToast(adding ? `${p.name} added to your plan` : `${p.name} removed from your plan`, adding ? 'plus' : 'minus')
        }}
      />
    </div>
  )
}
