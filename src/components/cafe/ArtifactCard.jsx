import React from 'react'
import { motion } from 'framer-motion'

const STATUS = {
  thinking: { label: 'Noticing…', tone: 'soft' },
  drafting: { label: 'Drafting…', tone: 'soft' },
  awaiting: { label: 'Waiting for your OK', tone: 'warn' },
  approved: { label: 'Approved ✓', tone: 'good' },
  done: { label: 'Done ✓', tone: 'good' },
}

const priceOf = (s = '') => (s.match(/\$\s?\d+(?:\.\d{2})?/) || [])[0]

function Lines({ lines, className = 'art-lines' }) {
  if (!lines?.length) return null
  return (
    <ul className={className}>
      {lines.map((l, i) => <li key={i}>{l}</li>)}
    </ul>
  )
}

function Promo({ a }) {
  const price = priceOf(a.title) || priceOf(a.body)
  return (
    <div className="art-chalk">
      <div className="art-chalk-frame">
        <span className="art-chalk-kicker">today’s special</span>
        <h5>{a.title?.replace(/\s*[—-]\s*\$.*$/, '')}</h5>
        {price && <div className="art-chalk-price">{price}</div>}
        <p>{a.body}</p>
      </div>
      <div className="art-insta">
        <span className="art-insta-dot" /> Instagram story · A-frame board
      </div>
    </div>
  )
}

function Sms({ a, shift }) {
  return (
    <div className="art-phone">
      <div className="art-phone-top"><span>{shift ? '💬 Shift cover' : '💬 To your regulars'}</span><span>now</span></div>
      <div className="art-sms">{a.body}</div>
      <Lines lines={a.lines} className="art-chips" />
      {shift && <div className="art-good-badge">$0 overtime penalty</div>}
    </div>
  )
}

function Invoice({ a }) {
  const f = a.figures || {}
  const hasCmp = Number.isFinite(f.before) && Number.isFinite(f.after) && f.before > 0
  const pct = hasCmp ? Math.round(((f.after - f.before) / f.before) * 1000) / 10 : null
  return (
    <div className="art-paper">
      <div className="art-paper-head"><b>🧾 {a.title}</b></div>
      {hasCmp && (
        <div className="art-cmp">
          <div className="art-cmp-row">
            <span>Contracted</span>
            <div className="art-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(f.before / Math.max(f.before, f.after)) * 100}%` }} transition={{ duration: 0.8 }} /></div>
            <b>${f.before.toFixed(2)}/L</b>
          </div>
          <div className="art-cmp-row bad">
            <span>Billed</span>
            <div className="art-bar"><motion.i initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.8, delay: 0.15 }} /></div>
            <b>${f.after.toFixed(2)}/L <em>(+{pct}%)</em></b>
          </div>
        </div>
      )}
      {!hasCmp && <Lines lines={a.lines} className="art-rows" />}
      <p className="art-body">{a.body}</p>
    </div>
  )
}

function Email({ a }) {
  return (
    <div className="art-email">
      <div className="art-email-row"><span>To</span><b>{a.lines?.[0]?.replace(/^To:\s*/i, '') || 'Supplier'}</b></div>
      <div className="art-email-row"><span>Subject</span><b>{a.title?.replace(/^Draft:\s*/i, '')}</b></div>
      <p>{a.body}</p>
      <div className="art-email-foot">✉️ Drafted in Outlook — nothing sends without you</div>
    </div>
  )
}

function Review({ a }) {
  const stars = (a.meta?.match(/⭐/g) || a.lines?.[0]?.match(/⭐/g) || []).length || 4
  const allergen = /allerg|coeliac|gluten|nut/i.test(`${a.body} ${a.meta} ${(a.lines || []).join(' ')} ${a.question || ''}`)
  return (
    <div className="art-review">
      <div className="art-stars">{'★'.repeat(stars)}<span>{'★'.repeat(5 - stars)}</span></div>
      {a.meta && <p className="art-review-quote">{a.meta.replace(/·.*$/, '').replace(/⭐/g, '').trim()}</p>}
      <div className="art-reply"><b>Your reply (draft)</b><p>{a.body}</p></div>
      {allergen && <div className="art-warn-badge">⚠️ Allergy answer — always waits for your sign-off</div>}
    </div>
  )
}

function Docket({ a, icon }) {
  return (
    <div className="art-docket">
      <div className="art-docket-head">{icon} {a.title}</div>
      <Lines lines={a.lines} className="art-rows" />
      <p className="art-body">{a.body}</p>
    </div>
  )
}

function Sheet({ a, icon }) {
  return (
    <div className="art-sheet">
      <div className="art-sheet-head"><span>{icon}</span> {a.title}</div>
      <div className="art-sheet-grid">
        {(a.lines?.length ? a.lines : [a.body]).map((l, i) => {
          const [k, ...v] = String(l).split(/:\s+|\s+[—-]\s+/)
          return (
            <React.Fragment key={i}>
              <span className="k">{v.length ? k : '•'}</span>
              <span className="v">{v.length ? v.join(' — ') : k}</span>
            </React.Fragment>
          )
        })}
      </div>
      {a.lines?.length > 0 && <p className="art-body">{a.body}</p>}
    </div>
  )
}

const RENDER = {
  promo_poster: (a) => <Promo a={a} />,
  sms_campaign: (a) => <Sms a={a} />,
  shift_sms: (a) => <Sms a={a} shift />,
  invoice_check: (a) => <Invoice a={a} />,
  email_draft: (a) => <Email a={a} />,
  review_reply: (a) => <Review a={a} />,
  catering_order: (a) => <Docket a={a} icon="🥪" />,
  purchase_order: (a) => <Docket a={a} icon="🧺" />,
  payment_batch: (a) => <Docket a={a} icon="💸" />,
  excel_summary: (a) => <Sheet a={a} icon="📊" />,
  sales_report: (a) => <Sheet a={a} icon="📈" />,
  roster_plan: (a) => <Sheet a={a} icon="🗓️" />,
  pos_combo: (a) => <Sheet a={a} icon="⚡" />,
  note: (a) => <Sheet a={a} icon="📝" />,
}

export default function ArtifactCard({ artifact, onApprove, approvalId }) {
  if (!artifact) {
    return (
      <div className="art-empty">
        <span>☕</span>
        <p>Nothing made yet — throw a curveball from the order rail, or give them a moment.</p>
      </div>
    )
  }
  const st = STATUS[artifact.status] || STATUS.done
  // anything heading for the street A-frame (or made in Canva) is shown as the chalkboard it becomes
  const type = artifact.aframe || (artifact.by === 'canva' && ['pos_combo', 'note', 'sales_report'].includes(artifact.type)) ? 'promo_poster' : artifact.type
  const body = (RENDER[type] || RENDER.note)(artifact)
  return (
    <motion.div className="art" key={`${artifact.title}-${artifact.at}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="art-top">
        <span className={`art-status ${st.tone}`}>{st.label}</span>
      </div>
      {body}
      {artifact.meta && artifact.type !== 'review_reply' && <div className="art-meta">✨ {artifact.meta}</div>}
      {approvalId && (
        <motion.button className="btn primary art-approve" onClick={() => onApprove?.(approvalId)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
          ✓ Approve &amp; Run
        </motion.button>
      )}
      {artifact.status === 'awaiting' && !approvalId && <div className="art-meta">They’re walking over to ask you…</div>}
    </motion.div>
  )
}
