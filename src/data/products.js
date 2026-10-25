// The AI pantry: 12 researched tools Australian cafés actually use.
// Prices are rough AUD monthly figures for a single small café (check current plans before buying).
// Every tool has a humanised worker who walks into the café simulation when it's on your plan.

export const USE_CASES = [
  { id: 'ordering', label: 'Ordering & POS', icon: '🧾' },
  { id: 'marketing', label: 'Marketing', icon: '📣' },
  { id: 'inventory', label: 'Inventory & Waste', icon: '📦' },
  { id: 'bookkeeping', label: 'Bookkeeping', icon: '📒' },
  { id: 'scheduling', label: 'Staff Scheduling', icon: '🗓️' },
  { id: 'service', label: 'Customer Service', icon: '💬' },
  { id: 'content', label: 'Content & Design', icon: '🎨' },
]

// "where in the café" a tool helps (a four-person café doesn't have departments)
export const DEPARTMENTS = [
  { id: 'foh', label: 'Counter', icon: '☕' },
  { id: 'kitchen', label: 'Kitchen', icon: '🥐' },
  { id: 'ops', label: 'Back office', icon: '🗂️' },
  { id: 'marketing', label: 'Socials', icon: '📱' },
  { id: 'finance', label: 'Money', icon: '💰' },
]

const ALL_TYPES = ['Specialty café', 'Bakery-café', 'Drive-thru / takeaway', 'Franchise-style']

const P = (id, name, emoji, from, to, tagline, o) => ({
  id, name, emoji, from, to, tagline,
  price: '$$',
  metrics: { time: 70, setup: 70, cost: 60 },
  bestFor: ['Specialty café', 'Bakery-café'],
  hrs: 2, cost: 40, waste: 0, rev: 0, wait: 0, weeks: 1, risk: 'Low',
  ...o,
})

export const PRODUCTS = [
  P('copilot', 'Microsoft Copilot', '✨', '#2563EB', '#7C3AED', 'Your sharp admin assistant in Outlook, Excel & Word', {
    vendor: 'Microsoft 365 Copilot Business', priceLabel: '~A$45/mo',
    description: 'Drafts supplier emails in Outlook, checks your food-cost sheet in Excel, writes barista how-tos in Word and sums up handover notes — with business-grade privacy.',
    useCases: ['bookkeeping', 'content', 'service'], departments: ['ops', 'finance'],
    useCaseItems: [{ i: '✉️', t: 'Supplier emails' }, { i: '📊', t: 'Food-cost checks' }, { i: '📘', t: 'Staff how-tos' }, { i: '📝', t: 'Handover notes' }],
    pros: ['Lives inside Outlook, Excel & Word', 'Your business data stays private', 'Brilliant first drafts'],
    cons: ['Needs a Microsoft 365 plan', 'Double-check numbers before sending'],
    metrics: { time: 80, setup: 75, cost: 60 }, price: '$$', hrs: 3, cost: 45, weeks: 1, bestFor: ALL_TYPES,
    worker: { name: 'Jules', job: 'Drafts your supplier emails, checks food costs and writes staff how-tos.', role: 'Ops & Admin Coordinator', emoji: '🧑‍💼', outfit: 'cobalt-indigo jumper', station: 'Admin & Ops Laptop' },
    testimonial: { person: 'kate', quote: 'I used to write supplier emails at 10pm. Now I read a draft over breakfast and hit send.' },
    setup: {
      phase: 'Week 1 · Quick win', minutes: 20, owner: 'You',
      steps: ['Switch on Copilot in your Microsoft 365 admin page (2 clicks)', 'Open last week’s food-cost sheet and ask “where did margin slip?”', 'Save the supplier-email draft as a template'],
      safety: 'Read every email before it goes out — Copilot drafts, you send.',
    },
  }),
  P('xero', 'Xero', '📒', '#13B5EA', '#0A7EA8', 'Books that (almost) balance themselves', {
    vendor: 'Xero with JAX AI', priceLabel: '~A$65/mo',
    description: 'Australia’s favourite small-business ledger. Reconciles your bank feed, preps BAS/GST and Single Touch Payroll, and flags odd bill jumps before they bite.',
    useCases: ['bookkeeping'], departments: ['finance'],
    useCaseItems: [{ i: '🏦', t: 'Bank reconciling' }, { i: '🧾', t: 'BAS & GST prep' }, { i: '💸', t: 'Single Touch Payroll' }, { i: '🚩', t: 'Bill-jump alerts' }],
    pros: ['Your accountant already uses it', 'Live cash picture', 'ATO-ready BAS'],
    cons: ['First setup takes an afternoon', 'Monthly subscription'],
    metrics: { time: 85, setup: 55, cost: 55 }, price: '$$', hrs: 5, cost: 65, weeks: 2, risk: 'Medium', bestFor: ALL_TYPES,
    worker: { name: 'Jax', job: 'Keeps your books: matches the bank feed, pays bills and preps BAS.', role: 'Back-Office Bookkeeper', emoji: '🧑‍💻', outfit: 'sky-blue Oxford shirt & tortoiseshell glasses', station: 'Timber Ledger Desk' },
    testimonial: { person: 'daniel', quote: 'BAS used to eat two Sundays a quarter. Now my accountant just checks it.' },
    setup: {
      phase: 'Weeks 2–3 · Core habit', minutes: 45, owner: 'You + your accountant',
      steps: ['Connect your business bank feed (5 mins)', 'Let JAX suggest matches for last month’s 40 transactions', 'Turn on bill-jump alerts for milk, beans & rent'],
      safety: 'Keep your accountant as an advisor for the first BAS.',
    },
  }),
  P('dext', 'Dext', '📸', '#FF5A1F', '#C83E0B', 'Snap the docket, skip the data entry', {
    vendor: 'Dext Prepare', priceLabel: '~A$35/mo',
    description: 'Photograph crumpled delivery dockets and invoices at the back door — Dext reads every line and pushes your costs straight into Xero.',
    useCases: ['bookkeeping', 'inventory'], departments: ['finance', 'kitchen'],
    useCaseItems: [{ i: '📸', t: 'Snap dockets' }, { i: '🔎', t: 'Reads every line' }, { i: '🔗', t: 'Syncs to Xero' }, { i: '🗄️', t: 'Bye, shoebox' }],
    pros: ['Kills the receipt shoebox', 'Spots sneaky price rises', 'A win in week one'],
    cons: ['Works best with Xero', 'One more subscription'],
    metrics: { time: 75, setup: 85, cost: 70 }, price: '$', hrs: 3, cost: 35, weeks: 1, bestFor: ALL_TYPES,
    worker: { name: 'Dex', job: 'Reads every docket and receipt, and catches sneaky price rises.', role: 'Delivery & Docket Clerk', emoji: '📦', outfit: 'sunset-orange apron over a charcoal tee', station: 'Delivery Crates & Scanner' },
    testimonial: { person: 'sameer', quote: 'It caught our dairy supplier charging 14% over contract. Paid for itself in a week.' },
    setup: {
      phase: 'Week 1 · Quick win', minutes: 15, owner: 'Whoever takes deliveries',
      steps: ['Install the Dext app on the back-door phone', 'Snap this week’s milk and produce dockets', 'Connect Dext to Xero (2 clicks)'],
      safety: 'Glance at the weekly “price changes” list before paying bills.',
    },
  }),
  P('deputy', 'Deputy', '🗓️', '#2E7CF6', '#1B4FB8', 'Rosters that fill themselves — Award rules included', {
    vendor: 'Deputy (Aussie-built)', priceLabel: '~A$45/mo',
    description: 'Builds rosters around your sales and the weather, works out Hospitality Award penalty rates and fills a 5:30am sick call by SMS.',
    useCases: ['scheduling'], departments: ['ops', 'foh'],
    useCaseItems: [{ i: '🗓️', t: 'Auto-rosters' }, { i: '⚖️', t: 'Award penalty rates' }, { i: '📲', t: 'Shift-cover SMS' }, { i: '⏰', t: 'Timesheets' }],
    pros: ['Award rates done for you', 'Staff swap shifts themselves', 'No overtime surprises'],
    cons: ['The team has to use the app', 'Per-staff pricing adds up'],
    metrics: { time: 85, setup: 70, cost: 65 }, price: '$$', hrs: 4, cost: 45, weeks: 2, bestFor: ALL_TYPES,
    worker: { name: 'Dep', job: 'Builds the roster, fills sick shifts and checks timesheets.', role: 'Shift & Roster Captain', emoji: '📋', outfit: 'royal-blue utility vest & clipboard', station: 'Wall Roster Board' },
    testimonial: { person: 'chloe', quote: 'A 5:30am sick text used to mean I worked a double. Now cover is sorted before I’m out of bed.' },
    setup: {
      phase: 'Weeks 2–3 · Core habit', minutes: 40, owner: 'You or your manager',
      steps: ['Add your team’s mobile numbers', 'Copy last fortnight’s paper roster in', 'Turn on “offer open shifts by SMS”'],
      safety: 'Approve every shift-cover message for the first fortnight.',
    },
  }),
  P('square', 'Square', '🟦', '#1E293B', '#475569', 'Ask your till anything', {
    vendor: 'Square for Restaurants + Square AI', priceLabel: '~A$45/mo',
    description: 'A fast counter till with plain-English sales answers (“what sells on rainy Tuesdays?”), rush forecasts and 1-tap combo prompts.',
    useCases: ['ordering'], departments: ['foh', 'finance'],
    useCaseItems: [{ i: '💳', t: 'Tap & go' }, { i: '📈', t: 'Sales in plain English' }, { i: '⚡', t: '1-tap combos' }, { i: '☔', t: 'Rush forecasts' }],
    pros: ['Learn it in an afternoon', 'Shorter queues', 'Insights without spreadsheets'],
    cons: ['Card fees on every sale', 'Best if you switch fully'],
    metrics: { time: 60, setup: 80, cost: 65 }, price: '$$', hrs: 2, cost: 45, rev: 400, wait: 35, weeks: 1, bestFor: ALL_TYPES,
    worker: { name: 'Sienna', job: 'Runs the till: orders, payments and one-tap combo keys.', role: 'Front-Counter POS Lead', emoji: '🙋‍♀️', outfit: 'charcoal barista apron with a white tile pin', station: 'Front POS Register' },
    testimonial: { person: 'tom', quote: 'I asked it what sells on rainy mornings. Chai lattes. Who knew? Now they’re a combo key.' },
    setup: {
      phase: 'Week 1 · Quick win', minutes: 30, owner: 'You or your head barista',
      steps: ['Import your menu from a photo of the board', 'Set up three 1-tap combo keys', 'Ask Square AI: “what were my slowest hours last week?”'],
      safety: 'Keep the old till for one week as a backup.',
    },
  }),
  P('lightspeed', 'Lightspeed', '🔥', '#E21B22', '#991B1B', 'Kitchen screens that keep brunch moving', {
    vendor: 'Lightspeed Restaurant', priceLabel: '~A$89/mo',
    description: 'POS plus a kitchen display built for busy brunch cafés — paces coffee and kitchen tickets, turns tables faster and shows which dishes really make money.',
    useCases: ['ordering', 'inventory'], departments: ['foh', 'kitchen'],
    useCaseItems: [{ i: '🖥️', t: 'Kitchen display' }, { i: '🍳', t: 'Ticket pacing' }, { i: '🔄', t: 'Faster table turns' }, { i: '💰', t: 'Menu margins' }],
    pros: ['Built for table service', 'Fewer forgotten orders', 'Great menu reports'],
    cons: ['Pricier for tiny cafés', 'Takes a week to bed in'],
    metrics: { time: 65, setup: 45, cost: 40 }, price: '$$$', hrs: 2, cost: 89, rev: 450, wait: 25, weeks: 3, risk: 'Medium', bestFor: ['Specialty café', 'Bakery-café', 'Franchise-style'],
    worker: { name: 'Leo', job: 'Paces the coffee pass and runs orders out to tables.', role: 'Pass & Floor Expediter', emoji: '🛎️', outfit: 'crisp white shirt with crimson apron straps', station: 'Coffee Pickup Pass' },
    testimonial: { person: 'nadia', quote: 'Sunday brunch used to end in cold eggs and walk-outs. Now the pass actually flows.' },
    setup: {
      phase: 'Month 2 · Upgrade', minutes: 60, owner: 'You + your chef',
      steps: ['Mount the kitchen screen above the pass', 'Run one quiet Tuesday with paper tickets as backup', 'Check the “menu margins” report on Friday'],
      safety: 'Switch over on a quiet weekday, never a weekend.',
    },
  }),
  P('marketman', 'MarketMan', '🥐', '#F59E0B', '#B45309', 'Know your stock to the gram', {
    vendor: 'MarketMan inventory', priceLabel: '~A$119/mo',
    description: 'Inventory and recipe costing down to the gram of coffee and millilitre of milk — matches sales against stock so fewer pastries end up in the bin.',
    useCases: ['inventory'], departments: ['kitchen', 'ops'],
    useCaseItems: [{ i: '🥛', t: 'Stock counts' }, { i: '⚖️', t: 'Cost per cup' }, { i: '🗑️', t: 'Waste tracking' }, { i: '🏷️', t: 'Price alerts' }],
    pros: ['Slashes pastry & dairy waste', 'True cost per cup', 'Flags supplier price creep'],
    cons: ['The first stock count is a slog', 'Overkill for tiny menus'],
    metrics: { time: 70, setup: 40, cost: 45 }, price: '$$$', hrs: 3, cost: 119, waste: 5, weeks: 3, risk: 'Medium', bestFor: ['Bakery-café', 'Specialty café', 'Franchise-style'],
    worker: { name: 'Marco', job: 'Counts stock, tracks waste and keeps the pastry case full.', role: 'Larder & Waste Guardian', emoji: '🥐', outfit: 'ochre-amber baker’s apron', station: 'Pastry Case & Coolroom' },
    testimonial: { person: 'sophie', quote: 'We were binning 20 croissants on wet days. Now we bake to the forecast and mark down by noon.' },
    setup: {
      phase: 'Month 2 · Upgrade', minutes: 60, owner: 'You + your kitchen lead',
      steps: ['Do one full stock count on a quiet afternoon', 'Add your 10 best-selling recipes', 'Turn on the “likely waste” alert'],
      safety: 'Spot-check one shelf a week against the app.',
    },
  }),
  P('ordermentum', 'Ordermentum', '🧺', '#0D9488', '#0F766E', 'Beans & milk ordered before the 2pm cut-off', {
    vendor: 'Ordermentum (Omni AI)', priceLabel: '~A$39/mo',
    description: 'Australia’s café wholesale network — roasters, dairies and bakeries in one app — with demand forecasts and invoices that sync straight to Xero.',
    useCases: ['inventory', 'ordering'], departments: ['ops', 'kitchen'],
    useCaseItems: [{ i: '☕', t: 'Roaster orders' }, { i: '🥛', t: 'Dairy top-ups' }, { i: '⏰', t: 'Cut-off reminders' }, { i: '🔗', t: 'Xero invoices' }],
    pros: ['Every supplier in one app', 'Never miss a cut-off', 'No more emergency milk runs'],
    cons: ['Your suppliers need to be on it', 'Forecasts need a few weeks of data'],
    metrics: { time: 70, setup: 75, cost: 75 }, price: '$', hrs: 2, cost: 39, waste: 2, weeks: 1, bestFor: ALL_TYPES,
    worker: { name: 'Ollie', job: 'Orders beans, milk and bread from your suppliers on time.', role: 'Roaster & Dairy Buyer', emoji: '🧺', outfit: 'deep-teal work overshirt', station: 'Bean & Milk Shelving' },
    testimonial: { person: 'ravi', quote: 'No more 1:58pm panic-ordering beans. I tap “approve” between coffees.' },
    setup: {
      phase: 'Week 1 · Quick win', minutes: 20, owner: 'You or your head barista',
      steps: ['Invite your roaster and dairy (they may already be on it)', 'Set par levels for beans, milk & oat milk', 'Turn on the 1:30pm “order before cut-off” nudge'],
      safety: 'Approve every order yourself for the first month.',
    },
  }),
  P('canva', 'Canva', '🎨', '#7D2AE8', '#00C4CC', 'Specials boards, menus & posts in minutes', {
    vendor: 'Canva Magic Studio', priceLabel: '~A$20/mo',
    description: 'The Aussie design favourite. Magic Design turns a photo and a sentence into a chalkboard special, brunch menu, loyalty card or Instagram post.',
    useCases: ['content', 'marketing'], departments: ['marketing'],
    useCaseItems: [{ i: '🪧', t: 'Specials boards' }, { i: '📋', t: 'Menus' }, { i: '📸', t: 'Instagram posts' }, { i: '🎟️', t: 'Loyalty cards' }],
    pros: ['Ridiculously easy', 'Hundreds of café templates', 'Brand kit keeps you consistent'],
    cons: ['Designs can look samey', 'Pro features cost extra'],
    metrics: { time: 70, setup: 95, cost: 90 }, price: '$', hrs: 3, cost: 20, rev: 250, weeks: 1, bestFor: ALL_TYPES,
    worker: { name: 'Cami', job: 'Designs your specials board, A-frame and social posts.', role: 'Creative & Promo Designer', emoji: '👩‍🎨', outfit: 'violet-to-teal gradient apron', station: 'Design Computer & A-frame' },
    testimonial: { person: 'isabella', quote: 'Our A-frame finally looks like we meant it. Took ten minutes and a photo of a croissant.' },
    setup: {
      phase: 'Week 1 · Quick win', minutes: 20, owner: 'You or your most creative barista',
      steps: ['Upload your logo and colours to a Brand Kit', 'Pick a chalkboard-special template', 'Make three posts for next week in one sitting'],
      safety: 'Check prices and allergens on every design before it goes up.',
    },
  }),
  P('podium', 'Podium', '⭐', '#4F46E5', '#312E81', 'More 5-star reviews, fewer missed messages', {
    vendor: 'Podium AI Employee', priceLabel: '~A$75/mo',
    description: 'Turns happy customers into Google reviews by SMS, texts back missed calls during the rush and drafts replies to reviews and DMs for you to approve.',
    useCases: ['service', 'marketing'], departments: ['marketing', 'foh'],
    useCaseItems: [{ i: '⭐', t: 'Review invites' }, { i: '💬', t: 'Missed-call text-back' }, { i: '↩️', t: 'Reply drafts' }, { i: '📥', t: 'One inbox' }],
    pros: ['Lifts your Google rating', 'Never miss a DM again', 'You sign off sensitive replies'],
    cons: ['Allergy questions always need a human', 'Mid-range pricing'],
    metrics: { time: 60, setup: 75, cost: 55 }, price: '$$', hrs: 2, cost: 75, rev: 380, weeks: 1, bestFor: ALL_TYPES,
    worker: { name: 'Pia', job: 'Answers reviews and DMs, and asks happy regulars for 5 stars.', role: 'Reputation & Review Host', emoji: '⭐', outfit: 'indigo cardigan & tablet', station: 'Guest Review Stand' },
    testimonial: { person: 'emma', quote: 'We went from 4.3 to 4.7 stars in two months — and I still approve every allergy answer.' },
    setup: {
      phase: 'Weeks 2–3 · Core habit', minutes: 30, owner: 'You',
      steps: ['Connect your Google Business profile', 'Turn on “ask for a review” after card payments', 'Set allergy questions to “always ask me first”'],
      safety: 'Never let an allergy answer send without your OK.',
    },
  }),
  P('slang', 'Slang.ai', '🎧', '#F43F5E', '#BE123C', 'Answers the café phone on the first ring', {
    vendor: 'Slang.ai voice host', priceLabel: '~A$59/mo',
    description: 'A friendly voice host that picks up every call — opening hours, dietary questions, table bookings and catering orders — so your barista never stops pulling shots.',
    useCases: ['service', 'ordering'], departments: ['foh'],
    useCaseItems: [{ i: '☎️', t: 'Answers every call' }, { i: '🕒', t: 'Hours & FAQs' }, { i: '📅', t: 'Bookings' }, { i: '🥪', t: 'Catering orders' }],
    pros: ['Never miss a catering order', 'Frees your counter staff', 'Sounds friendly, not robotic'],
    cons: ['Some regulars prefer a human', 'Best for phone-heavy cafés'],
    metrics: { time: 55, setup: 70, cost: 55 }, price: '$$', hrs: 3, cost: 59, rev: 280, wait: 15, weeks: 1, bestFor: ['Specialty café', 'Bakery-café', 'Franchise-style'],
    worker: { name: 'Sunny', job: 'Answers the phone, takes bookings and catering orders.', role: 'Phone & Catering Host', emoji: '🎧', outfit: 'coral-rose top & headset', station: 'Wall Phone & Booking Stand' },
    testimonial: { person: 'jack', quote: 'The phone rang mid-rush and I didn’t flinch. It booked a $220 office catering order.' },
    setup: {
      phase: 'Weeks 2–3 · Core habit', minutes: 30, owner: 'You',
      steps: ['Forward your café number after 3 rings', 'Teach it your hours, menu & dietary info', 'Send catering orders to your phone for a yes/no'],
      safety: 'Every catering quote waits for your thumbs-up.',
    },
  }),
  P('mailchimp', 'Mailchimp', '💌', '#EAB308', '#CA8A04', 'Bring your regulars back on quiet days', {
    vendor: 'Mailchimp with Intuit Assist', priceLabel: '~A$25/mo',
    description: 'Groups your regulars and the nearby office crowd, writes friendly “fresh scrolls just out” texts and emails, and sends them when they’ll actually fill seats.',
    useCases: ['marketing'], departments: ['marketing'],
    useCaseItems: [{ i: '👥', t: 'Regulars lists' }, { i: '✍️', t: 'Friendly copy' }, { i: '⏰', t: 'Smart send times' }, { i: '🎁', t: 'Loyalty offers' }],
    pros: ['Fills quiet afternoons', 'Free starter plan', 'Easy templates'],
    cons: ['You need a contact list first', 'Costs rise with contacts'],
    metrics: { time: 55, setup: 80, cost: 80 }, price: '$', hrs: 2, cost: 25, rev: 350, weeks: 1, bestFor: ALL_TYPES,
    worker: { name: 'Milo', job: 'Brings regulars back with offers, emails and stamp cards.', role: 'Regulars & Loyalty Marketer', emoji: '💌', outfit: 'honey-gold shirt & stamp card', station: 'Loyalty & CRM Corner' },
    testimonial: { person: 'lily', quote: 'One “wet Wednesday, $2 off your second coffee” text and the tables filled by eleven.' },
    setup: {
      phase: 'Week 1 · Quick win', minutes: 25, owner: 'You',
      steps: ['Add a “join our regulars” QR code at the till', 'Import your loyalty-card emails', 'Schedule one quiet-afternoon offer'],
      safety: 'Read every message before it sends — tone matters.',
    },
  }),
]

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id)

/** Tools that do the same job: an owner only needs one from each group. */
export const OVERLAPS = [
  { ids: ['square', 'lightspeed'], note: 'You only need one till. Square suits counter service; Lightspeed suits table service.' },
]
export const overlapsIn = (ids = []) => OVERLAPS.filter((o) => o.ids.every((id) => ids.includes(id)))

/** Words in an owner's own description of their week, mapped to the tools that help. */
export const RANT_KEYWORDS = [
  { re: /invoice|docket|receipt|bill|9 ?pm|paperwork|accountant|bas|gst|books/i, tools: ['dext', 'xero', 'copilot'] },
  { re: /sick|roster|shift|5[:.]?30|staff|overtime|award|casual/i, tools: ['deputy'] },
  { re: /pastr|croissant|waste|bin|rain|stock|leftover|throw/i, tools: ['marketman', 'canva', 'mailchimp'] },
  { re: /phone|call|ring|catering|booking/i, tools: ['slang', 'podium'] },
  { re: /queue|rush|line|wait|slow|order/i, tools: ['square', 'lightspeed'] },
  { re: /review|google|complain|allerg|dm|instagram message/i, tools: ['podium'] },
  { re: /quiet|empty|regulars|marketing|instagram|social|post|promo|menu/i, tools: ['mailchimp', 'canva'] },
  { re: /milk|beans|supplier|order|delivery|cut-?off/i, tools: ['ordermentum', 'dext'] },
  { re: /email|spreadsheet|excel|word|admin|sop|handover/i, tools: ['copilot'] },
]

// ------------------------------------------------------------------------------------------
// Prices, links and limits, checked against each vendor's own Australian pages (or, where a
// vendor publishes no prices, reputable listings) in October 2026. Prices change: always check
// the vendor's page before buying. `cost` is the monthly figure the dashboard adds up.
export const PRICES_CHECKED = 'Oct 2026'

const FACTS = {
  copilot: {
    cost: 35, priceLabel: '~A$35/mo per person', value: 62,
    pricing: { plan: 'Microsoft 365 Business Standard with Copilot', note: 'per person, yearly commitment, ex GST (a reseller’s figure: Microsoft’s own AU price page wasn’t reachable)', trial: null, free: false },
    url: 'https://www.microsoft.com/en-au/microsoft-365/copilot',
    wont: 'It won’t send an email or change a spreadsheet on its own. It drafts; you decide.',
  },
  xero: {
    cost: 107, priceLabel: 'from A$107/mo', value: 55,
    pricing: { plan: 'Comprehensive', note: 'incl. GST; intro discounts for the first months', trial: 'First month free', free: false },
    url: 'https://www.xero.com/au/pricing-plans/',
    wont: 'It won’t lodge your BAS until you (or your accountant) have checked it.',
  },
  dext: {
    cost: 34, priceLabel: 'A$34/mo', value: 82,
    pricing: { plan: 'Prepare (250 documents a month)', note: 'ex GST', trial: '14-day free trial, no card needed', free: false },
    url: 'https://dext.com/au/pricing/prepare-direct',
    wont: 'Dext reads your bills; it doesn’t pay them.',
  },
  deputy: {
    cost: 45, priceLabel: '~A$9/mo per staff member', value: 72,
    pricing: { plan: 'Core', note: 'A$8.75 per staff member a month, minimum A$30, ex GST', trial: 'Free trial', free: false },
    url: 'https://www.deputy.com/au/pricing',
    wont: 'It won’t text someone to cover a shift until you say yes (unless you switch that on).',
  },
  square: {
    cost: 0, priceLabel: 'Free plan + card fees', value: 90,
    pricing: { plan: 'Free (Plus is A$129/mo)', note: '1.6% per in-person card payment', trial: 'Plus: 30-day free trial', free: true },
    url: 'https://squareup.com/au/en/point-of-sale/restaurants/pricing',
    wont: 'It speeds up ordering, not brewing: it won’t fix a slow espresso machine.',
    cons: ['Card fees on every sale (1.6%)', 'Best if you switch fully'],
  },
  lightspeed: {
    cost: 79, priceLabel: 'from A$79/mo', value: 52,
    pricing: { plan: 'Starter', note: 'the kitchen display and inventory are paid add-ons', trial: 'Free trial on request', free: false },
    url: 'https://www.lightspeedhq.com/au/pos/restaurant/pricing/',
    wont: 'It won’t cook any faster. It paces tickets so nothing gets forgotten.',
  },
  marketman: {
    cost: 380, priceLabel: 'from ~A$380/mo', value: 30,
    pricing: { plan: 'Starter (US$249)', note: 'priced in US dollars; you book a demo first', trial: 'Demo only', free: false },
    url: 'https://www.marketman.com/pricing',
    wont: 'It won’t count your stock for you. Someone still does a quick weekly count.',
    cons: ['Pricey for one small café (US$249/mo and up)', 'The first stock count is a slog'],
  },
  ordermentum: {
    cost: 0, priceLabel: 'Free for cafés', value: 95,
    pricing: { plan: 'Free (Pro is A$49/mo, optional)', note: 'ordering, invoices and payments are free for venues', trial: null, free: true },
    url: 'https://ordermentum.com/pricing',
    wont: 'It won’t place an order you haven’t approved (unless you set up repeat orders).',
  },
  canva: {
    cost: 14, priceLabel: 'Free · Pro ~A$14/mo', value: 92,
    pricing: { plan: 'Pro (A$165 a year)', note: 'the free plan covers the basics', trial: 'Pro: free trial', free: true },
    url: 'https://www.canva.com/en_au/pricing/',
    wont: 'It won’t post anything for you. You choose what goes up, and where.',
  },
  podium: {
    cost: 399, priceLabel: '~A$399/mo', value: 32,
    pricing: { plan: 'Essentials', note: 'quoted on a sales call, usually on a 12-month contract (a listing price; Podium doesn’t publish prices)', trial: 'Demo only', free: false },
    url: 'https://www.podium.com.au/',
    wont: 'It never answers an allergy question without you.',
    cons: ['Pricey: around A$399/mo on a 12-month contract', 'Allergy questions always need a human'],
  },
  slang: {
    cost: 399, priceLabel: 'from A$399/mo', value: 30,
    pricing: { plan: 'Core', note: 'per location; you get a quote after a demo', trial: 'Demo only', free: false },
    url: 'https://www.slang.ai/pricing',
    wont: 'It won’t confirm a catering order without your thumbs-up.',
    cons: ['From A$399/mo per location', 'Best for phone-heavy cafés'],
  },
  mailchimp: {
    cost: 0, priceLabel: 'Free up to 250 contacts', value: 88,
    pricing: { plan: 'Free (Essentials from ~A$20/mo)', note: 'paid plans grow with your contact list', trial: 'Essentials: 14-day free trial', free: true },
    url: 'https://mailchimp.com/en-au/pricing/marketing/',
    wont: 'It won’t send anything until you press send, or schedule it.',
  },
}

for (const p of PRODUCTS) {
  const f = FACTS[p.id]
  if (!f) continue
  const { value, ...rest } = f
  Object.assign(p, rest)
  if (value != null) p.metrics = { ...p.metrics, cost: value }
}

/** How the tools talk to each other: what flows from one to the other. */
export const CONNECTIONS = [
  { from: 'dext', to: 'xero', what: 'Snapped dockets arrive as bills, coded and ready to pay' },
  { from: 'square', to: 'xero', what: 'Each day’s takings land in your books' },
  { from: 'lightspeed', to: 'xero', what: 'Sales and payments sync every night' },
  { from: 'deputy', to: 'xero', what: 'Approved timesheets flow into payroll' },
  { from: 'ordermentum', to: 'xero', what: 'Supplier invoices sync on their own' },
  { from: 'marketman', to: 'xero', what: 'Stock costs and invoices sync' },
  { from: 'square', to: 'deputy', what: 'Sales forecasts shape next week’s roster' },
  { from: 'lightspeed', to: 'deputy', what: 'Busy-hour sales shape the roster' },
  { from: 'square', to: 'marketman', what: 'Every sale draws down your stock count' },
  { from: 'lightspeed', to: 'marketman', what: 'Every sale draws down your stock count' },
  { from: 'ordermentum', to: 'marketman', what: 'Orders update the stock you’re expecting' },
  { from: 'square', to: 'mailchimp', what: 'Customers who opt in join your regulars list' },
  { from: 'canva', to: 'mailchimp', what: 'Designs drop straight into your emails' },
  { from: 'square', to: 'podium', what: 'Card payments can trigger a review request' },
]
// relative luminance (WCAG) of a #rrggbb colour
const lum = (hex) => {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** The text colour that reads best on a tool's brand gradient: white, or espresso on the light brands (Xero, MarketMan, Mailchimp…). */
export const brandInk = (p) => {
  const L = (lum(p.from) + lum(p.to)) / 2
  return (L + 0.05) / (lum('#2a170e') + 0.05) > 1.05 / (L + 0.05) ? '#2a170e' : '#ffffff'
}

export const connectionsFor = (id) => CONNECTIONS.filter((c) => c.from === id || c.to === id)
export const connectionsAmong = (ids = []) => CONNECTIONS.filter((c) => ids.includes(c.from) && ids.includes(c.to))
