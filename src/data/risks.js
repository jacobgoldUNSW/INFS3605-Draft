// Reality checks: the big, honest risks of handing café work to AI and software tools.
// Each tool's own risks (in products.js, `risks`) are tagged with one of these themes. Every plan shows all of them:
// the themes its tools touch come first, most serious first, with each tool's specific concern underneath. Written to
// be the questions an owner should ask before signing up, not to scare them off.
import { getProduct } from './products.js'

export const RISK_THEMES = {
  data: {
    icon: '🔒', title: 'Your data leaves the building', level: 4,
    note: 'Every tool keeps part of your business in someone else’s cloud: sales, customer contacts, staff details, invoices. Some of it is stored overseas. Breaches happen to big companies too, and under the Privacy Act you’re still responsible for the personal information you collect.',
    fix: 'Turn on two-step sign-in everywhere and give each person their own login. Collect only what you need, and check each tool’s privacy page for where data is kept and how to delete it.',
  },
  accuracy: {
    icon: '🤖', title: 'Confidently wrong', level: 4,
    note: 'AI doesn’t know when it’s guessing. It can misread an invoice, code a bill to the wrong account, mishear a caller or make up an answer, and it says all of it with the same confidence.',
    fix: 'Spot-check the outputs every week, especially money, pay and anything about allergens. Never let an automated reply answer an allergy or medical question.',
  },
  control: {
    icon: '🎛️', title: 'Less control over what goes out in your name', level: 3,
    note: 'Many tools can be set to act on their own: sending texts, posting replies, placing orders, filling shifts. It saves time, but mistakes happen at machine speed, and some happen in public.',
    fix: 'Keep approvals on for anything that spends money or speaks to customers. Switch on automation one step at a time, once you’ve watched it get things right.',
  },
  legal: {
    icon: '⚖️', title: 'The law still points at you', level: 3,
    note: 'Spam rules for texts and emails, Fair Work pay rules, the Privacy Act, consumer law on reviews and telling callers about recordings all still apply. A tool can help you follow them; it doesn’t take on the responsibility.',
    fix: 'Keep records of customer consent, check pay settings against the Fair Work Ombudsman’s tools, and tell callers when calls are recorded. Ask your accountant before the first BAS.',
  },
  customers: {
    icon: '🫶', title: 'Customers can tell, and some will mind', level: 3,
    note: 'People can usually spot AI-written replies, robotic phone calls and generic posts. The warmth of a local café is part of what customers come back for.',
    fix: 'Say when customers are talking to AI, keep replies in your own voice, and always give people an easy way to reach a real person.',
  },
  people: {
    icon: '🧑‍🍳', title: 'Your team may feel watched', level: 3,
    note: 'Clock-ins that record location or photos, automated rosters and activity tracking can feel like surveillance, and decisions about shifts change what people earn.',
    fix: 'Talk to your team before you switch anything on. Be clear about what’s tracked and why, and keep a person responsible for roster decisions.',
  },
  lockin: {
    icon: '🔗', title: 'Easy to start, hard to leave', level: 3,
    note: 'Your sales history, books, rosters and recipes end up living inside each tool. Leaving later can mean exports, new hardware, retraining your team and contract exit fees.',
    fix: 'Before you sign, check how to export your data and how long the contract runs. Prefer month-to-month, and keep your own copy of the records that matter.',
  },
  cost: {
    icon: '💸', title: 'Costs that creep', level: 2,
    note: 'Prices go up, free plans get smaller, and per-staff, per-contact and per-sale fees grow as you do. Small subscriptions quietly add up.',
    fix: 'Put a reminder in your calendar every three months to check each bill and cancel anything nobody uses.',
  },
  outage: {
    icon: '📶', title: 'When it goes down', level: 2,
    note: 'Cloud tools need the internet and the vendor’s servers. An outage in a rush, on payday or near BAS time stops work your team may have forgotten how to do by hand.',
    fix: 'Know each tool’s fallback, such as offline card payments, a printed roster or paper dockets, and keep it where everyone can find it.',
  },
  skills: {
    icon: '🧠', title: 'Use it or lose it', level: 2,
    note: 'When software does the counting, ordering and bookkeeping, it’s easy to stop understanding your own numbers, and harder to notice when the tool gets something wrong.',
    fix: 'Keep a monthly sit-down with your own figures, and make sure at least one person still knows how each job is done by hand.',
  },
}

const ORDER = Object.keys(RISK_THEMES)

/**
 * The reality checks for one café's plan: every theme its tools touch, with each tool's specific concern, most
 * serious first. With no tools picked yet, every theme shows (nothing is tied to a tool yet).
 */
export function planRisks(survey = {}, ids = []) {
  const tools = ids.map(getProduct).filter(Boolean)
  const bill = tools.reduce((s, p) => s + (p.cost || 0), 0)
  const has = (id) => ids.includes(id)
  const bigTeam = ['6-15', '16+'].includes(survey.employees)
  const out = []
  for (const id of ORDER) {
    const theme = RISK_THEMES[id]
    const inPlan = tools.flatMap((p) => (p.risks || []).filter((r) => r.theme === id).map((r) => ({ id: p.id, name: p.name, title: r.title })))
    let level = theme.level
    if (inPlan.length >= 3) level++
    if (id === 'people' && bigTeam) level++
    if (id === 'cost' && bill > 250) level++
    if (id === 'cost' && bill > 600) level++
    if (id === 'customers' && has('podium') && has('slang')) level++
    if (id === 'legal' && ['mailchimp', 'podium', 'deputy', 'slang'].filter(has).length >= 2) level++
    // general: none of this plan's tools flags it, but it still comes with bringing tools like these in
    out.push({ id, icon: theme.icon, title: theme.title, note: theme.note, fix: theme.fix, level: Math.min(5, level), inPlan, general: tools.length > 0 && !inPlan.length })
  }
  return out.sort((a, b) => a.general - b.general || b.level - a.level || b.inPlan.length - a.inPlan.length)
}
