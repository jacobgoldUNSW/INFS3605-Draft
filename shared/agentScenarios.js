// Deterministic, context-aware agent workflows for the café simulation.
// Used by the server when Gemini is unavailable, and by the Home page teaser (which never
// calls the API). Every result follows the same JSON contract as POST /api/gemini/agent-step.

export const AGENT_META = {
  copilot: { name: 'Jules', tool: 'Microsoft Copilot', role: 'Ops & Admin Coordinator', station: 'Admin & Ops Laptop' },
  xero: { name: 'Jax', tool: 'Xero', role: 'Back-Office Bookkeeper', station: 'Timber Ledger Desk' },
  dext: { name: 'Dex', tool: 'Dext', role: 'Delivery & Docket Clerk', station: 'Delivery Crates & Scanner' },
  deputy: { name: 'Dep', tool: 'Deputy', role: 'Shift & Roster Captain', station: 'Wall Roster Board' },
  square: { name: 'Sienna', tool: 'Square', role: 'Front-Counter POS Lead', station: 'Front POS Register' },
  lightspeed: { name: 'Leo', tool: 'Lightspeed', role: 'Pass & Floor Expediter', station: 'Coffee Pickup Pass' },
  marketman: { name: 'Marco', tool: 'MarketMan', role: 'Larder & Waste Guardian', station: 'Pastry Case & Coolroom' },
  ordermentum: { name: 'Ollie', tool: 'Ordermentum', role: 'Roaster & Dairy Buyer', station: 'Bean & Milk Shelving' },
  canva: { name: 'Cami', tool: 'Canva', role: 'Creative & Promo Designer', station: 'Design Computer & A-frame' },
  podium: { name: 'Pia', tool: 'Podium', role: 'Reputation & Review Host', station: 'Guest Review Stand' },
  slang: { name: 'Sunny', tool: 'Slang.ai', role: 'Phone & Catering Host', station: 'Wall Phone & Booking Stand' },
  mailchimp: { name: 'Milo', tool: 'Mailchimp', role: 'Regulars & Loyalty Marketer', station: 'Loyalty & CRM Corner' },
}

export const EVENTS = ['rain', 'rush', 'sick', 'delivery', 'review', 'tick']
export const ARTIFACT_TYPES = [
  'promo_poster', 'sms_campaign', 'invoice_check', 'email_draft', 'excel_summary', 'shift_sms', 'review_reply',
  'catering_order', 'purchase_order', 'payment_batch', 'pos_combo', 'sales_report', 'roster_plan', 'note',
]

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length]
const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1))
const money = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`)

export function makeRng(seed = Date.now()) {
  let s = (seed >>> 0) || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    return (s % 100000) / 100000
  }
}

// ---------------------------------------------------------------------------------------
// Templates. Each: { id, event, primary, collaborator?, needs?: [ids], build(ctx) }
// collaborator may be an array of preferences; the first active one is used (or none).
const T = []
const add = (t) => T.push(t)

// ----------------------------------- RAIN -----------------------------------
add({
  id: 'rain-croissant-promo', event: 'rain', primary: 'marketman', collaborator: ['canva'], needs: ['canva'],
  build: ({ rng, cafe }) => {
    const n = int(rng, 14, 20), cust = int(rng, 4, 6), saved = n - int(rng, 2, 5), waste = Math.round(saved * 4.2)
    const price = pick(rng, [9.5, 9, 10])
    return {
      thought: `Rain has cut walk-ins by about 30% — ${n} butter croissants are still sitting in the case.`,
      handoffDialogue: `Hey Cami, ${n} croissants will hit the bin if this rain keeps up. Can you spin up a rainy-day bundle?`,
      collaboratorReply: 'On it, Marco! Designing an A-frame and Instagram promo now.',
      ownerCheckInQuestion: `Can I post our ${money(price)} “Rainy Morning” flat white + warm croissant deal on the A-frame and Instagram?`,
      artifactType: 'promo_poster',
      artifactTitle: `Rainy Morning Rescue — ${money(price)}`,
      artifactBody: `🌧️ Caught in the downpour? Duck into ${cafe} before 2pm for a piping-hot flat white + warm butter croissant — just ${money(price)}.`,
      artifactMeta: `Projected: saves ${saved} croissants (${money(waste)} of waste) · +${cust} walk-ins`,
      artifactLines: ['Flat white + warm croissant', 'Until 2pm today', 'A-frame + Instagram story'],
      figures: { before: n, after: n - saved, saving: waste },
      worldEffect: { spawnCustomers: cust, floatingBadgeText: `+${cust} customers · ${money(waste)} waste saved`, aframeUpdated: true, aframeText: `RAINY DEAL ${money(price)}`, impact: { customers: cust, waste, promos: 1 } },
    }
  },
})
add({
  id: 'rain-regulars-sms', event: 'rain', primary: 'marketman', collaborator: ['mailchimp'], needs: ['mailchimp'],
  build: ({ rng, cafe }) => {
    const n = int(rng, 12, 18), cust = int(rng, 3, 5), waste = Math.round(n * 0.7 * 4.2), list = int(rng, 140, 260)
    return {
      thought: `Wet morning and ${n} pastries haven't moved. That's money in the bin by 3pm.`,
      handoffDialogue: `Milo, can we nudge the regulars? ${n} pastries need a home before lunch.`,
      collaboratorReply: 'Easy — I’ll text the regulars who live within 1km.',
      ownerCheckInQuestion: `Can I text ${list} nearby regulars a “$2 pastry upgrade with any coffee” offer?`,
      artifactType: 'sms_campaign',
      artifactTitle: 'Rainy-day regulars text',
      artifactBody: `Hi it's ${cafe} ☔ Shelter here today — add a warm pastry to any coffee for just $2 until 2pm. See you soon!`,
      artifactMeta: `${list} regulars within 1km · projected +${cust} visits · ${money(waste)} waste avoided`,
      artifactLines: [`Audience: ${list} regulars nearby`, 'Send: now (rain peak)', 'Offer ends 2pm'],
      figures: { saving: waste },
      worldEffect: { spawnCustomers: cust, floatingBadgeText: `+${cust} regulars · ${money(waste)} saved`, aframeUpdated: false, impact: { customers: cust, waste, promos: 1 } },
    }
  },
})
add({
  id: 'rain-cami-solo', event: 'rain', primary: 'canva',
  build: ({ rng, cafe }) => {
    const cust = int(rng, 3, 5), price = pick(rng, [8.5, 9, 9.5])
    return {
      thought: 'Street’s gone quiet with this rain — the A-frame still says “sunny brunch”.',
      ownerCheckInQuestion: `Can I swap the A-frame to a cosy ${money(price)} “Rainy Day Hot Choc + Banana Bread” special?`,
      artifactType: 'promo_poster',
      artifactTitle: `Rainy Day Warm-Up — ${money(price)}`,
      artifactBody: `☔ Rainy out, cosy in. Hot chocolate + toasted banana bread at ${cafe}, ${money(price)} today only.`,
      artifactMeta: `A-frame + Instagram story · projected +${cust} walk-ins`,
      artifactLines: ['Hot choc + banana bread', 'Today only', 'A-frame + Instagram'],
      worldEffect: { spawnCustomers: cust, floatingBadgeText: `+${cust} customers`, aframeUpdated: true, aframeText: `HOT CHOC ${money(price)}`, impact: { customers: cust, promos: 1 } },
    }
  },
})
add({
  id: 'rain-milo-solo', event: 'rain', primary: 'mailchimp',
  build: ({ rng, cafe }) => {
    const cust = int(rng, 3, 4), list = int(rng, 120, 220)
    return {
      thought: 'Rain usually means the office crowd stays in. Time for a gentle nudge.',
      ownerCheckInQuestion: `Can I text ${list} regulars a “rainy day, second coffee half price” offer?`,
      artifactType: 'sms_campaign',
      artifactTitle: 'Rainy-day nudge',
      artifactBody: `${cafe} here ☔ It's pouring — your second coffee is half price until noon. Umbrellas welcome!`,
      artifactMeta: `${list} regulars · projected +${cust} visits`,
      artifactLines: [`Audience: ${list} regulars`, 'Send: now', 'Ends 12pm'],
      worldEffect: { spawnCustomers: cust, floatingBadgeText: `+${cust} regulars`, aframeUpdated: false, impact: { customers: cust, promos: 1 } },
    }
  },
})
add({
  id: 'rain-marco-markdown', event: 'rain', primary: 'marketman',
  build: ({ rng }) => {
    const n = int(rng, 14, 19), waste = Math.round(n * 0.6 * 4.2)
    return {
      thought: `${n} croissants and the rain isn't easing. If we mark down at noon we'll still clear most of them.`,
      ownerCheckInQuestion: `Can I mark croissants down 30% from 12pm and cut tomorrow's bake by 6?`,
      artifactType: 'excel_summary',
      artifactTitle: 'Wet-day pastry plan',
      artifactBody: `Forecast: rain all day. Selling 40% fewer pastries than a dry Tuesday.`,
      artifactMeta: `Saves about ${money(waste)} of waste today`,
      artifactLines: [`Croissants in case: ${n}`, 'Markdown: −30% from 12pm', 'Tomorrow’s bake: −6'],
      figures: { saving: waste },
      worldEffect: { spawnCustomers: 1, floatingBadgeText: `${money(waste)} waste saved`, aframeUpdated: false, impact: { waste } },
    }
  },
})
add({
  id: 'rain-sienna-dip', event: 'rain', primary: 'square', collaborator: ['canva'], needs: ['canva'],
  build: ({ rng, cafe }) => {
    const cust = int(rng, 3, 5)
    return {
      thought: 'Sales are down 28% on a normal Tuesday — hot drinks are the only thing moving.',
      handoffDialogue: 'Cami, hot drinks are the only thing selling in this rain. Can we push a warm combo?',
      collaboratorReply: 'Love it — a chai + banana bread board coming up.',
      ownerCheckInQuestion: 'Can I put a $9 “Chai + Banana Bread” combo on the A-frame?',
      artifactType: 'promo_poster',
      artifactTitle: 'Chai Day Combo — $9',
      artifactBody: `Spiced chai + toasted banana bread at ${cafe}. Perfect puddle-jumping fuel. $9 today.`,
      artifactMeta: `Based on Square sales: chai up 40% on rainy days · +${cust} walk-ins`,
      artifactLines: ['Chai + banana bread', '$9 today', 'A-frame + counter card'],
      worldEffect: { spawnCustomers: cust, floatingBadgeText: `+${cust} customers`, aframeUpdated: true, aframeText: 'CHAI COMBO $9', impact: { customers: cust, promos: 1 } },
    }
  },
})
add({
  id: 'rain-leo-tables', event: 'rain', primary: 'lightspeed',
  build: () => ({
    thought: 'Rain means people stay longer. I’ll pace tickets so tables still turn.',
    ownerCheckInQuestion: null,
    artifactType: 'sales_report',
    artifactTitle: 'Wet-weather pacing',
    artifactBody: 'Dine-in is up, takeaway is down. Pacing kitchen tickets 2 minutes apart.',
    artifactMeta: 'Routine — no sign-off needed',
    artifactLines: ['Dine-in +35%', 'Takeaway −40%', 'Table turn target: 38 min'],
    worldEffect: { spawnCustomers: 0, floatingBadgeText: '−2 min table wait', aframeUpdated: false, impact: { minutes: 6 } },
  }),
})

// ----------------------------------- MORNING RUSH -----------------------------------
add({
  id: 'rush-catering-call', event: 'rush', primary: 'slang', collaborator: ['square'],
  build: ({ rng, cafe }) => {
    const total = pick(rng, [180, 220, 245, 260]), people = Math.round(total / 18)
    const client = pick(rng, ['Harbour St Physio', 'Northside Accountants', 'the council planning team', 'Bright Dental'])
    return {
      thought: 'Phone’s ringing mid-rush — I’ve got it so the barista never stops pulling shots.',
      handoffDialogue: `Sienna, ${client} wants coffee and pastries for ${people} on Friday. Can you set it up in the till?`,
      collaboratorReply: 'Done — order’s parked in Square for Friday 8:30.',
      ownerCheckInQuestion: `Can I confirm a ${money(total)} catering order for ${client} on Friday?`,
      artifactType: 'catering_order',
      artifactTitle: `Catering — ${client}`,
      artifactBody: `${people} coffees + a pastry platter, ready Friday 8:30am. Pickup at ${cafe}.`,
      artifactMeta: `Quote: ${money(total)} · 50% deposit by card`,
      artifactLines: [`${people} × coffees (oat & dairy)`, '1 × large pastry platter', 'Pickup Fri 8:30am'],
      figures: { saving: total },
      worldEffect: { spawnCustomers: 0, floatingBadgeText: `+${money(total)} catering order`, aframeUpdated: false, impact: { dollars: total, calls: 1 } },
    }
  },
})
add({
  id: 'rush-combo-keys', event: 'rush', primary: 'square', collaborator: ['lightspeed'],
  build: ({ rng }) => {
    const cut = int(rng, 30, 45)
    return {
      thought: `Queue’s out the door — 1-tap combo keys would shave ${cut}% off each order.`,
      handoffDialogue: 'Leo, switching to combo keys — expect coffees in quick bursts.',
      collaboratorReply: 'Ready on the pass. I’ll call names as they land.',
      ownerCheckInQuestion: null,
      artifactType: 'pos_combo',
      artifactTitle: 'Rush mode: 1-tap combos',
      artifactBody: 'Top 3 morning orders are now single taps on the till.',
      artifactMeta: `Average order time −${cut}%`,
      artifactLines: ['☕ Flat white + banana bread', '🥐 Latte + croissant', '🧋 Iced long black'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: `−${Math.round(cut * 1.3)}s wait`, aframeUpdated: false, impact: { minutes: 9 } },
    }
  },
})
add({
  id: 'rush-extra-casual', event: 'rush', primary: 'deputy', collaborator: ['square'],
  build: ({ rng }) => {
    const who = pick(rng, ['Priya S.', 'Tom W.', 'Ella M.', 'Josh K.'])
    return {
      thought: 'Sales are tracking 40% above forecast — we need another pair of hands till 10.',
      handoffDialogue: 'Sienna, is this pace holding?',
      collaboratorReply: 'Yep — 22 orders in the last 15 minutes.',
      ownerCheckInQuestion: `Can I text ${who} to come in 7:30–10:00? No overtime — they’re on 18 hrs this week.`,
      artifactType: 'shift_sms',
      artifactTitle: `Extra cover: ${who}`,
      artifactBody: `Hi ${who.split(' ')[0]}! Busy morning here — any chance you can do 7:30–10:00 today? Reply YES to confirm 🙌`,
      artifactMeta: 'Award check: ordinary hours · $0 overtime penalty',
      artifactLines: [`${who} · 18 hrs this week`, 'Shift: 7:30–10:00am', 'Penalty rate: none'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: '+1 barista for the rush', aframeUpdated: false, impact: { minutes: 15 } },
    }
  },
})
add({
  id: 'rush-leo-pass', event: 'rush', primary: 'lightspeed',
  build: () => ({
    thought: 'Tickets are stacking — I’ll batch the coffees so nothing goes cold on the pass.',
    ownerCheckInQuestion: null,
    artifactType: 'sales_report',
    artifactTitle: 'Pass pacing',
    artifactBody: 'Batched 9 coffees into 3 waves. Zero walk-outs so far.',
    artifactMeta: 'Routine — no sign-off needed',
    artifactLines: ['Waves of 3', 'Avg pass time 48s', 'Walk-outs: 0'],
    worldEffect: { spawnCustomers: 0, floatingBadgeText: '−30s wait', aframeUpdated: false, impact: { minutes: 5 } },
  }),
})
add({
  id: 'rush-pia-textback', event: 'rush', primary: 'podium',
  build: () => ({
    thought: 'Three missed calls during the rush — I’ll text them back so nobody feels ignored.',
    ownerCheckInQuestion: null,
    artifactType: 'sms_campaign',
    artifactTitle: 'Missed-call text-backs',
    artifactBody: 'Sorry we missed you — we’re mid-rush! Reply here and we’ll sort you out ☕',
    artifactMeta: 'Routine — 3 sent automatically',
    artifactLines: ['3 missed calls', '3 text-backs sent', '2 replies so far'],
    worldEffect: { spawnCustomers: 1, floatingBadgeText: '3 calls rescued', aframeUpdated: false, impact: { calls: 3 } },
  }),
})

// ----------------------------------- SICK CALL-IN -----------------------------------
add({
  id: 'sick-cover', event: 'sick', primary: 'deputy', collaborator: ['copilot', 'square'],
  build: ({ rng, collab }) => {
    const sick = 'Josh' // matches the Sick call-in docket
    const who = pick(rng, ['Priya S.', 'Tom W.', 'Lucy R.', 'Ben A.'])
    const hrs = int(rng, 12, 22)
    return {
      thought: `${sick} just texted in sick for 6am. Checking who can cover without tipping into overtime.`,
      handoffDialogue: collab === 'square' ? `Sienna, ${sick}'s out sick — can the till run quick-serve mode till cover arrives?` : `Jules, can you update today's handover notes? ${sick}'s out.`,
      collaboratorReply: collab === 'square' ? 'On it — quick-serve mode is on.' : 'Done — notes updated and the opening checklist reassigned.',
      ownerCheckInQuestion: `Can I text ${who} to cover ${sick}'s 6:00–12:30 shift? ${hrs} hrs this week, $0 overtime.`,
      artifactType: 'shift_sms',
      artifactTitle: `Shift cover: ${who}`,
      artifactBody: `Morning ${who.split(' ')[0]}! ${sick}'s unwell — could you cover 6:00–12:30 today? Reply YES and it's yours ☕`,
      artifactMeta: `Award check: ${hrs} hrs this week · weekday rate · $0 overtime penalty`,
      artifactLines: [`${who} · ${hrs} hrs this week`, 'Shift: 6:00am–12:30pm', '$0 overtime penalty'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Shift covered · $0 overtime', aframeUpdated: false, impact: { minutes: 25 } },
    }
  },
})
add({
  id: 'sick-jules', event: 'sick', primary: 'copilot',
  build: ({ rng }) => {
    const sick = 'Josh'
    return {
      thought: `${sick} is out sick. I'll draft a quick message to the casuals group.`,
      ownerCheckInQuestion: `Can I send this cover request to the casuals group chat?`,
      artifactType: 'email_draft',
      artifactTitle: 'Cover request (draft)',
      artifactBody: `Hi team — ${sick} is unwell today. Is anyone free 6:00–12:30? First reply gets it. Thanks heaps!`,
      artifactMeta: 'Drafted in Outlook — you send',
      artifactLines: ['To: Casuals group', 'Shift: 6:00–12:30', 'First reply wins'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Cover request sent', aframeUpdated: false, impact: { minutes: 10 } },
    }
  },
})
add({
  id: 'sick-sienna', event: 'sick', primary: 'square',
  build: () => ({
    thought: 'We’re a barista down. Switching the till to the short menu keeps orders simple.',
    ownerCheckInQuestion: 'Can I switch the till to the “short menu” until 10am?',
    artifactType: 'pos_combo',
    artifactTitle: 'Short-staffed menu',
    artifactBody: 'Hides slow items (pour-over, smoothies) until 10am.',
    artifactMeta: 'Keeps the queue under 4 minutes',
    artifactLines: ['Hide: pour-over, smoothies', 'Feature: batch brew', 'Until: 10:00am'],
    worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Queue stays under 4 min', aframeUpdated: false, impact: { minutes: 8 } },
  }),
})

// ----------------------------------- DELIVERY DROP -----------------------------------
add({
  id: 'delivery-oat-hike', event: 'delivery', primary: 'dext', collaborator: ['xero', 'copilot'],
  build: ({ rng, collab }) => {
    const contracted = pick(rng, [3.9, 3.85, 4.1]), pct = int(rng, 11, 16)
    const billed = +(contracted * (1 + pct / 100)).toFixed(2)
    const litres = int(rng, 60, 96)
    const over = Math.round((billed - contracted) * litres)
    const supplier = pick(rng, ['Riverside Dairy Co.', 'Hilltop Milk Supply', 'Coastal Dairy'])
    return {
      thought: `Scanned the docket — oat milk is billed at ${money(billed)}/L but our contract says ${money(contracted)}/L.`,
      handoffDialogue: `${collab === 'copilot' ? 'Jules' : 'Jax'}, heads up: ${supplier} has slipped oat milk up ${pct}%. That's ${money(over)} on this delivery alone.`,
      collaboratorReply: collab === 'copilot' ? 'Thanks Dex — drafting a polite dispute email now.' : 'Good catch — I’ll hold that line and flag it on the bill.',
      ownerCheckInQuestion: `Can I email ${supplier} to dispute the ${pct}% oat milk overcharge (${money(over)})?`,
      artifactType: 'invoice_check',
      artifactTitle: `${supplier} — oat milk overcharge`,
      artifactBody: `Contracted ${money(contracted)}/L vs billed ${money(billed)}/L (+${pct}%) on ${litres}L.`,
      artifactMeta: `Overcharge blocked: ${money(over)} · bill held until credit note arrives`,
      artifactLines: [`Contracted: ${money(contracted)}/L`, `Billed: ${money(billed)}/L (+${pct}%)`, `${litres} L delivered`],
      figures: { before: contracted, after: billed, saving: over },
      worldEffect: { spawnCustomers: 0, floatingBadgeText: `+${money(over)} saved`, aframeUpdated: false, impact: { dollars: over } },
    }
  },
})
add({
  id: 'delivery-xero-jump', event: 'delivery', primary: 'xero',
  build: ({ rng }) => {
    const amt = int(rng, 640, 980), jump = int(rng, 9, 15)
    return {
      thought: `This week's produce bill is ${jump}% higher than usual — two lines don't match the order.`,
      ownerCheckInQuestion: `Can I pay the regular bills now and hold the produce invoice (${money(amt)}) for a check?`,
      artifactType: 'payment_batch',
      artifactTitle: 'Payment batch — Thursday',
      artifactBody: 'Three bills ready to pay. One held for review.',
      artifactMeta: `Held: Fresh Fields Produce ${money(amt)} (+${jump}%)`,
      artifactLines: ['Roaster — $412 ✓', 'Rent — $3,200 ✓', `Produce — ${money(amt)} ⏸ held`],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Odd bill caught', aframeUpdated: false, impact: { dollars: Math.round(amt * jump / 100) } },
    }
  },
})
add({
  id: 'delivery-short', event: 'delivery', primary: 'marketman', collaborator: ['ordermentum'],
  build: ({ rng }) => {
    const credit = int(rng, 24, 48)
    return {
      thought: 'Counted the crates — we’re two cartons of full-cream short on this delivery.',
      handoffDialogue: 'Ollie, we’re 2 cartons short. Can you chase a credit?',
      collaboratorReply: 'Logged it with the dairy in Ordermentum — credit note requested.',
      ownerCheckInQuestion: `Can I accept the delivery and claim a ${money(credit)} credit for the missing milk?`,
      artifactType: 'invoice_check',
      artifactTitle: 'Short delivery — full-cream milk',
      artifactBody: 'Ordered 12 cartons, received 10.',
      artifactMeta: `Credit requested: ${money(credit)}`,
      artifactLines: ['Ordered: 12 × 2L', 'Delivered: 10 × 2L', `Credit: ${money(credit)}`],
      figures: { saving: credit },
      worldEffect: { spawnCustomers: 0, floatingBadgeText: `+${money(credit)} credit`, aframeUpdated: false, impact: { dollars: credit } },
    }
  },
})
add({
  id: 'delivery-ollie-match', event: 'delivery', primary: 'ordermentum',
  build: () => ({
    thought: 'Delivery matches the order to the carton. Bumping Friday’s oat milk by 2 — it ran out last week.',
    ownerCheckInQuestion: null,
    artifactType: 'purchase_order',
    artifactTitle: 'Delivery matched ✓',
    artifactBody: 'All 14 lines match. Friday’s order adjusted automatically.',
    artifactMeta: 'Routine — invoice synced to Xero',
    artifactLines: ['14/14 lines match', 'Fri oat milk: +2 cartons', 'Invoice → Xero'],
    worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Invoice filed', aframeUpdated: false, impact: { minutes: 12 } },
  }),
})

// ----------------------------------- NEW REVIEW -----------------------------------
add({
  id: 'review-allergen', event: 'review', primary: 'podium', collaborator: ['copilot'],
  build: ({ rng, cafe }) => {
    const name = pick(rng, ['Hannah', 'Mateo', 'Grace', 'Oliver'])
    const allergen = pick(rng, ['peanut', 'tree-nut', 'coeliac (gluten)'])
    return {
      thought: `New 4-star review from ${name}, plus an Instagram DM asking about a severe ${allergen} allergy.`,
      handoffDialogue: `Jules, can you pull our ${allergen} prep notes from the kitchen SOP?`,
      collaboratorReply: 'Here you go — separate tongs, but the banana bread shares an oven.',
      ownerCheckInQuestion: `This one mentions a severe ${allergen} allergy — can you sign off my reply before it sends?`,
      artifactType: 'review_reply',
      artifactTitle: `Reply to ${name} (needs your OK)`,
      artifactBody: `Thanks so much, ${name}! So glad the flat white hit the spot. On ${allergen}: we use separate tongs and labelled trays, but our kitchen isn't allergen-free, so please chat to us at the counter before ordering.`,
      artifactMeta: `⭐⭐⭐⭐ “Lovely staff, coffee spot on.” · allergen replies always wait for you`,
      artifactLines: [`⭐⭐⭐⭐ from ${name}`, `DM: severe ${allergen} allergy`, 'Status: waiting for your OK'],
      worldEffect: { spawnCustomers: 1, floatingBadgeText: 'Review answered safely', aframeUpdated: false, impact: { reviews: 1 } },
    }
  },
})
add({
  id: 'review-jules', event: 'review', primary: 'copilot',
  build: ({ rng, cafe }) => {
    const name = pick(rng, ['Hannah', 'Mateo', 'Grace'])
    return {
      thought: `A 3-star review from ${name} says the wait was long on Saturday. Drafting a warm reply.`,
      ownerCheckInQuestion: 'Can I post this reply to the Google review?',
      artifactType: 'review_reply',
      artifactTitle: `Reply to ${name}`,
      artifactBody: `Thanks for the honest feedback, ${name}. Saturday was a big one — we've added a second barista from 8 to 11. Next flat white's on us!`,
      artifactMeta: '⭐⭐⭐ “Great coffee, slow on Saturday.”',
      artifactLines: [`⭐⭐⭐ from ${name}`, 'Tone: warm, no excuses', 'Offer: next coffee free'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Review answered', aframeUpdated: false, impact: { reviews: 1 } },
    }
  },
})
add({
  id: 'review-milo', event: 'review', primary: 'mailchimp',
  build: ({ rng, cafe }) => {
    const name = pick(rng, ['Hannah', 'Oliver', 'Grace'])
    return {
      thought: `${name} left a glowing review — a perfect regular to welcome to the loyalty list.`,
      ownerCheckInQuestion: `Can I send ${name} a thank-you and a free-coffee loyalty card?`,
      artifactType: 'sms_campaign',
      artifactTitle: `Thank-you to ${name}`,
      artifactBody: `${name}, thanks for the lovely review! Your next flat white at ${cafe} is on us ☕`,
      artifactMeta: '⭐⭐⭐⭐⭐ “Best croissants in the suburb.”',
      artifactLines: ['⭐⭐⭐⭐⭐ review', 'Offer: 1 free coffee', 'Joins regulars list'],
      worldEffect: { spawnCustomers: 1, floatingBadgeText: '+1 regular', aframeUpdated: false, impact: { reviews: 1, customers: 1 } },
    }
  },
})

// ----------------------------------- AUTONOMOUS TICKS -----------------------------------
add({
  id: 'tick-wholesale-order', event: 'tick', primary: 'ordermentum', collaborator: ['marketman'],
  build: ({ rng }) => {
    const beans = int(rng, 4, 8), milk = int(rng, 14, 24), oat = int(rng, 8, 14)
    const total = beans * 38 + milk * 3 + oat * 4
    return {
      thought: 'Roaster cut-off is 2pm and we’re down to two bags of house blend.',
      handoffDialogue: 'Marco, how’s the dairy fridge looking for tomorrow?',
      collaboratorReply: `Low on oat — add ${oat} cartons. Full-cream is fine.`,
      ownerCheckInQuestion: `Can I place tomorrow's order — ${beans} bags of beans + milk — for ${money(total)}?`,
      artifactType: 'purchase_order',
      artifactTitle: 'Tomorrow’s order (before 2pm cut-off)',
      artifactBody: 'Forecast says a busy Friday. Ordering a little extra oat milk.',
      artifactMeta: `Total ${money(total)} · delivered 6:30am`,
      artifactLines: [`House blend 1kg × ${beans}`, `Full-cream 2L × ${milk}`, `Oat 1L × ${oat}`],
      figures: { saving: total },
      worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Order in before cut-off', aframeUpdated: false, impact: { minutes: 15 } },
    }
  },
})
add({
  id: 'tick-reconcile', event: 'tick', primary: 'xero', collaborator: ['square', 'lightspeed'],
  build: ({ rng, cname }) => {
    const lines = int(rng, 18, 34), bills = int(rng, 1180, 2400)
    return {
      thought: `Matched ${lines} bank lines to yesterday's till takings. Three bills are due Friday.`,
      handoffDialogue: `${cname}, can you confirm yesterday’s till total?`,
      collaboratorReply: 'Till total matches to the cent ✓',
      ownerCheckInQuestion: `Can I schedule this week's bill payments (${money(bills)}) for Friday?`,
      artifactType: 'payment_batch',
      artifactTitle: 'Bills due Friday',
      artifactBody: `${lines} transactions reconciled automatically.`,
      artifactMeta: `Batch total ${money(bills)} · paid Friday 9am`,
      artifactLines: ['Roaster — $412', 'Dairy — $286', `Rent + utilities — ${money(bills - 698)}`],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: '−40 min of bookkeeping', aframeUpdated: false, impact: { minutes: 40 } },
    }
  },
})
add({
  id: 'tick-margin-email', event: 'tick', primary: 'copilot', collaborator: ['xero', 'marketman'],
  build: ({ rng, cname }) => {
    const slip = (rng() * 2 + 1.5).toFixed(1)
    return {
      thought: `Weekly food-cost check: coffee margin slipped ${slip} points — milk is the culprit.`,
      handoffDialogue: `${cname}, can you send me the last four dairy bills?`,
      collaboratorReply: 'Sent to your laptop — prices crept up twice.',
      ownerCheckInQuestion: 'Can I send the dairy a friendly “let’s review our pricing” email?',
      artifactType: 'email_draft',
      artifactTitle: 'Draft: pricing review with our dairy',
      artifactBody: 'Hi Rob, we’ve loved working with you for three years. Our milk costs are up 9% since July — could we look at a volume price before the next term?',
      artifactMeta: `Margin slip ${slip} pts · potential saving ~$140/mo`,
      artifactLines: ['To: Riverside Dairy', 'Tone: friendly & firm', 'Attached: 4 bills summary'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: '~$140/mo saving lined up', aframeUpdated: false, impact: { dollars: 140 } },
    }
  },
})
add({
  id: 'tick-quiet-campaign', event: 'tick', primary: 'mailchimp', collaborator: ['canva', 'square'],
  build: ({ rng, cafe, collab }) => {
    const cust = int(rng, 3, 5), list = int(rng, 160, 260)
    return {
      thought: 'Tables empty out after 2pm on Wednesdays. Our regulars just need a reason.',
      handoffDialogue: collab === 'square' ? 'Sienna, when do our tables empty out on Wednesdays?' : 'Cami, could you make a quick image for an afternoon offer?',
      collaboratorReply: collab === 'square' ? 'Sales drop 45% between 2 and 4pm.' : 'Done — cinnamon scrolls fresh out of the oven, looking golden.',
      ownerCheckInQuestion: `Can I send ${list} regulars a “2–4pm scroll + coffee $8” offer?`,
      artifactType: 'sms_campaign',
      artifactTitle: 'Quiet-afternoon offer',
      artifactBody: `Fresh cinnamon scrolls just came out of the oven at ${cafe} 🍥 Scroll + coffee $8, 2–4pm today.`,
      artifactMeta: `${list} regulars · projected +${cust} visits`,
      artifactLines: [`Audience: ${list} regulars`, 'Send: 1:45pm', 'Offer: scroll + coffee $8'],
      worldEffect: { spawnCustomers: cust, floatingBadgeText: `+${cust} regulars`, aframeUpdated: false, impact: { customers: cust, promos: 1 } },
    }
  },
})
add({
  id: 'tick-specials-board', event: 'tick', primary: 'canva', collaborator: ['marketman'],
  build: ({ rng }) => {
    const cust = int(rng, 2, 4)
    return {
      thought: 'Afternoon specials board still shows breakfast. Let’s freshen it.',
      handoffDialogue: 'Marco, what do we have plenty of this arvo?',
      collaboratorReply: 'Banana bread and scrolls — loads of both.',
      ownerCheckInQuestion: 'Can I put “Banana Bread + Long Black $8” on the A-frame?',
      artifactType: 'promo_poster',
      artifactTitle: 'Arvo Pick-Me-Up — $8',
      artifactBody: 'Toasted banana bread + long black. The 3pm slump’s natural enemy.',
      artifactMeta: `A-frame refresh · projected +${cust} walk-ins`,
      artifactLines: ['Banana bread + long black', '$8 after 2pm', 'A-frame'],
      worldEffect: { spawnCustomers: cust, floatingBadgeText: `+${cust} customers`, aframeUpdated: true, aframeText: 'ARVO DEAL $8', impact: { customers: cust, promos: 1 } },
    }
  },
})
add({
  id: 'tick-winners', event: 'tick', primary: 'lightspeed', collaborator: ['copilot'],
  build: () => ({
    thought: 'Smashed avo outsells everything but the halloumi stack makes more per plate.',
    handoffDialogue: 'Jules, top margin dishes for your weekly summary.',
    collaboratorReply: 'Thanks Leo — adding them to Friday’s report.',
    ownerCheckInQuestion: null,
    artifactType: 'sales_report',
    artifactTitle: 'This week’s winners',
    artifactBody: 'Highest margin per plate, not just most sold.',
    artifactMeta: 'Routine report — no sign-off needed',
    artifactLines: ['🥇 Halloumi stack — 71%', '🥈 Big brekkie — 64%', '🥉 Smashed avo — 58%'],
    worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Menu insight shared', aframeUpdated: false, impact: { minutes: 20 } },
  }),
})
add({
  id: 'tick-roster', event: 'tick', primary: 'deputy',
  build: () => ({
    thought: 'Next week’s forecast is wet on Tuesday and sunny on Saturday. Roster adjusted to match.',
    ownerCheckInQuestion: 'Can I publish next week’s roster? It saves 6 hours on quiet shifts.',
    artifactType: 'roster_plan',
    artifactTitle: 'Next week’s roster',
    artifactBody: 'Matched to the weather and last month’s sales.',
    artifactMeta: '−6 hrs on quiet shifts · $0 overtime',
    artifactLines: ['Tue (rain): −1 barista after 11', 'Sat (sunny): +1 from 8–1', 'Award check: all clear'],
    worldEffect: { spawnCustomers: 0, floatingBadgeText: '−6 hrs wages', aframeUpdated: false, impact: { dollars: 190, minutes: 30 } },
  }),
})
add({
  id: 'tick-pia-requests', event: 'tick', primary: 'podium',
  build: ({ rng }) => {
    const n = int(rng, 3, 6)
    return {
      thought: `${n} happy tap-and-go customers this morning — sending a friendly review request.`,
      ownerCheckInQuestion: null,
      artifactType: 'sms_campaign',
      artifactTitle: 'Review invites',
      artifactBody: 'Thanks for visiting! Mind leaving us a quick Google review? ⭐',
      artifactMeta: 'Routine — sent automatically',
      artifactLines: [`${n} invites sent`, '2 new 5-star reviews', 'Rating: 4.7 ⭐'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: '+2 ⭐ reviews', aframeUpdated: false, impact: { reviews: 2 } },
    }
  },
})
add({
  id: 'tick-sunny-calls', event: 'tick', primary: 'slang',
  build: ({ rng }) => {
    const n = int(rng, 3, 6)
    return {
      thought: `Answered ${n} calls this hour — mostly “are you open?” and one booking for 6.`,
      ownerCheckInQuestion: null,
      artifactType: 'note',
      artifactTitle: 'Phone summary',
      artifactBody: `${n} calls answered on the first ring.`,
      artifactMeta: 'Routine — bookings added to the diary',
      artifactLines: [`${n} calls answered`, '1 booking: 6 people, Sat 9am', '0 missed'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: `${n} calls answered`, aframeUpdated: false, impact: { calls: n } },
    }
  },
})
add({
  id: 'tick-dex-receipts', event: 'tick', primary: 'dext',
  build: ({ rng }) => {
    const n = int(rng, 8, 15)
    return {
      thought: `Filed ${n} receipts from the back-door tray into Xero.`,
      ownerCheckInQuestion: null,
      artifactType: 'note',
      artifactTitle: 'Receipts filed',
      artifactBody: `${n} receipts read and filed.`,
      artifactMeta: 'Routine — no prices changed',
      artifactLines: [`${n} receipts`, 'All categorised', 'Synced to Xero'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: '−25 min data entry', aframeUpdated: false, impact: { minutes: 25 } },
    }
  },
})
add({
  id: 'tick-velocity', event: 'tick', primary: 'square', collaborator: ['marketman'],
  build: () => ({
    thought: 'Iced lattes are flying today — 3× a normal Thursday.',
    handoffDialogue: 'Marco, iced lattes are 3× normal. Ice and milk okay?',
    collaboratorReply: 'Ice is fine, I’ll pull two more milk crates forward.',
    ownerCheckInQuestion: null,
    artifactType: 'sales_report',
    artifactTitle: 'Live sales pulse',
    artifactBody: 'Iced drinks trending with the warm afternoon.',
    artifactMeta: 'Routine — shared with the team',
    artifactLines: ['Iced latte ×3 normal', 'Banana bread steady', 'Croissants slowing'],
    worldEffect: { spawnCustomers: 0, floatingBadgeText: 'Stock kept ahead', aframeUpdated: false, impact: { minutes: 6 } },
  }),
})
add({
  id: 'tick-marco-waste', event: 'tick', primary: 'marketman',
  build: ({ rng }) => {
    const w = int(rng, 18, 36)
    return {
      thought: `Yesterday's waste log: ${w} dollars of sourdough. Trimming tomorrow's bake by 4 loaves.`,
      ownerCheckInQuestion: null,
      artifactType: 'excel_summary',
      artifactTitle: 'Bake plan tweak',
      artifactBody: 'Sourdough has been over-baked three days running.',
      artifactMeta: 'Routine — adjusts automatically',
      artifactLines: [`Yesterday's waste: ${money(w)}`, 'Tomorrow: −4 loaves', 'Saving ~$110/wk'],
      worldEffect: { spawnCustomers: 0, floatingBadgeText: `${money(w)} waste saved`, aframeUpdated: false, impact: { waste: w } },
    }
  },
})

export const TEMPLATES = T

function resolveCollaborator(t, active) {
  if (!t.collaborator) return null
  return t.collaborator.find((id) => active.includes(id) && id !== t.primary) || null
}

/** Which templates could run right now? */
export function applicableTemplates(event, active, exclude = []) {
  return T.filter((t) => t.event === event
    && active.includes(t.primary)
    && (!t.needs || t.needs.every((n) => active.includes(n)))
    && !exclude.includes(t.id))
}

/**
 * Build a full agent-step result.
 * @param {{event:string, active:string[], cafeName?:string, recent?:string[], busy?:string[], seed?:number}} o
 * @returns {object|null} null when no hired worker can respond (the owner handles it alone)
 */
export function fallbackAgentStep({ event, active = [], cafeName = 'your café', recent = [], busy = [], seed } = {}) {
  const rng = makeRng(seed ?? Math.floor(Math.random() * 1e9))
  const free = active.filter((a) => !busy.includes(a))
  let pool = applicableTemplates(event, free, recent.slice(-3))
  if (!pool.length) pool = applicableTemplates(event, free)
  if (!pool.length) return null
  // events: first matching template is the most natural responder; ticks: random variety
  const t = event === 'tick' ? pool[Math.floor(rng() * pool.length)] : pool[0]
  const collaboratorAgentId = resolveCollaborator(t, free)
  const built = t.build({ rng, cafe: cafeName, collab: collaboratorAgentId, cname: AGENT_META[collaboratorAgentId]?.name || 'team' })
  const step = {
    scenarioId: t.id,
    event,
    primaryAgentId: t.primary,
    collaboratorAgentId,
    handoffDialogue: null,
    collaboratorReply: null,
    ...built,
  }
  if (!collaboratorAgentId) {
    step.handoffDialogue = null
    step.collaboratorReply = null
  }
  return step
}

/** What the owner thinks when nobody on the team can help (and in "Before" mode). */
export const OWNER_ALONE = {
  rain: { thought: 'Rain… that’s 18 croissants in the bin by 3pm. No time to make a sign.', tip: 'Hire Marco (MarketMan) + Cami (Canva) and they’ll turn the rain into a promo.' },
  rush: { thought: 'Phone’s ringing, queue’s out the door, and I’m the only one on the till!', tip: 'Sienna (Square) speeds up the till and Sunny (Slang.ai) answers the phone.' },
  sick: { thought: 'A 5:30am sick text… guess I’m working a double today.', tip: 'Dep (Deputy) finds cover without overtime while you sleep in.' },
  delivery: { thought: 'Another crumpled docket for the shoebox. I’ll check it… tonight. Maybe.', tip: 'Dex (Dext) reads every docket and catches price hikes.' },
  review: { thought: 'A review AND an allergy question in my DMs. I’ll reply after close…', tip: 'Pia (Podium) drafts replies — and always asks you before answering allergy questions.' },
  tick: { thought: 'Invoices, rosters, orders… when do I actually make coffee?', tip: 'Flip to “After” to hand these chores to your AI team.' },
}

// Anything that spends money, publishes, messages people or answers allergens needs the owner's yes.
const ALWAYS_ASK = ['promo_poster', 'email_draft', 'shift_sms', 'review_reply', 'catering_order', 'purchase_order', 'payment_batch']
function needsOwnerYes(s) {
  const text = `${s.artifactTitle} ${s.artifactBody} ${s.artifactMeta}`.toLowerCase()
  if (ALWAYS_ASK.includes(s.artifactType)) return true
  if (s.artifactType === 'invoice_check' && /dispute|credit|overcharg|refund|messag|email/.test(text)) return true
  if (s.artifactType === 'sms_campaign' && (s.worldEffect?.spawnCustomers > 0 || /offer|deal|\$|off /.test(text))) return true
  if (/allerg|coeliac|gluten|nut/.test(text)) return true
  return !!s.worldEffect?.aframeUpdated
}
function defaultQuestion(s) {
  const t = s.artifactTitle || 'this'
  return ({
    promo_poster: `Can I put “${t}” up on the A-frame and Instagram?`,
    email_draft: `Can I send this email — “${t}”?`,
    shift_sms: 'Can I send this shift text?',
    review_reply: 'Can you OK my reply before it posts?',
    catering_order: 'Can I confirm this catering order?',
    purchase_order: 'Can I place this order?',
    payment_batch: 'Can I schedule these payments?',
    invoice_check: 'Can I send the supplier a polite dispute about this?',
    sms_campaign: 'Can I send this offer to our regulars?',
  })[s.artifactType] || `Can I go ahead with “${t}”?`
}

/** Basic shape check used by the server to validate Gemini output. */
export function sanitizeStep(step, active, fallback) {
  if (!step || typeof step !== 'object') return fallback
  const ok = (id) => typeof id === 'string' && active.includes(id)
  const s = { ...fallback, ...step }
  if (!ok(s.primaryAgentId)) return fallback
  if (s.collaboratorAgentId && (!ok(s.collaboratorAgentId) || s.collaboratorAgentId === s.primaryAgentId)) {
    s.collaboratorAgentId = null
  }
  if (!s.collaboratorAgentId) { s.handoffDialogue = null; s.collaboratorReply = null }
  if (!ARTIFACT_TYPES.includes(s.artifactType)) s.artifactType = 'note'
  for (const k of ['thought', 'artifactTitle', 'artifactBody', 'artifactMeta']) {
    if (typeof s[k] !== 'string' || !s[k].trim()) s[k] = fallback?.[k] || ''
    s[k] = s[k].slice(0, 260)
  }
  if (s.ownerCheckInQuestion != null && typeof s.ownerCheckInQuestion !== 'string') s.ownerCheckInQuestion = null
  if (!s.ownerCheckInQuestion?.trim()) s.ownerCheckInQuestion = needsOwnerYes(s) ? defaultQuestion(s) : null
  if (s.ownerCheckInQuestion) s.ownerCheckInQuestion = s.ownerCheckInQuestion.slice(0, 200)
  if (!Array.isArray(s.artifactLines)) s.artifactLines = fallback?.artifactLines || []
  s.artifactLines = s.artifactLines.filter((l) => typeof l === 'string').slice(0, 4).map((l) => l.slice(0, 60))
  const we = { ...(fallback?.worldEffect || {}), ...(s.worldEffect || {}) }
  we.spawnCustomers = Math.max(0, Math.min(6, Math.round(Number(we.spawnCustomers) || 0)))
  we.floatingBadgeText = String(we.floatingBadgeText || '').slice(0, 40)
  we.aframeUpdated = !!we.aframeUpdated
  if (we.aframeText) we.aframeText = String(we.aframeText).slice(0, 18)
  s.worldEffect = we
  return s
}
