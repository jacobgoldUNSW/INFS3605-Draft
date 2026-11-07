// Evidence from real businesses, checked against each source page in November 2026.
// Every case study here is published by the tool's vendor (or on its behalf), so treat the numbers as
// best-case results, not averages. We paraphrase rather than quote, and always link the source.
export const EVIDENCE_CHECKED = 'Nov 2026'

export const CASES = [
  {
    id: 'blackwood',
    business: 'Blackwood Pantry',
    kind: 'Café',
    place: 'Cronulla, NSW',
    tool: 'deputy',
    task: 'Writing the roster',
    before: { value: 60, label: 'up to 1 hour' },
    after: { value: 5, label: 'about 5 min' },
    headline: '92% less time on rosters',
    summary: 'The co-owner went from up to an hour on each roster to about five minutes, and the café has since opened a second site.',
    source: { label: 'Deputy customer story', url: 'https://www.deputy.com/au/customers/blackwood-pantry' },
  },
  {
    id: 'beta',
    business: 'Beta',
    kind: 'Café',
    place: 'Surry Hills, NSW',
    tool: 'ordermentum',
    task: 'The weekly supplier order',
    after: { value: 5, label: 'about 5 min' },
    headline: 'The week’s ordering in five minutes',
    summary: 'All of the café’s supplier ordering happens in one app, and the owner says the weekly order now takes about five minutes.',
    source: { label: 'Ordermentum venue story', url: 'https://www.ordermentum.com/venue/stories/beta-surry-hills' },
  },
  {
    id: 'monastery',
    business: 'Monastery Coffee',
    kind: 'Roaster and venue',
    place: 'Adelaide, SA',
    tool: 'ordermentum',
    task: 'Invoices, standing orders and chasing payments',
    after: { value: 120, label: '2 hrs a week back' },
    headline: 'About 2 hours a week back',
    summary: 'Invoicing, standing orders and chasing unpaid invoices now take about two hours less each week, roughly 100 hours a year.',
    source: { label: 'Ordermentum customer story', url: 'https://www.ordermentum.com/supplier/stories/monastery-coffee' },
  },
  {
    id: 'curryleaf',
    business: 'Curry Leaf Café',
    kind: 'Restaurant',
    place: 'Brighton, UK',
    tool: 'deputy',
    task: 'Monthly payroll',
    before: { value: 960, label: 'about 2 days' },
    after: { value: 45, label: 'about 45 min' },
    headline: 'Payroll from two days to 45 minutes',
    summary: 'Monthly payroll went from about two days to about 45 minutes, and the wage bill fell about 5% after switching.',
    source: { label: 'Deputy customer story', url: 'https://www.deputy.com/customers/curry-leaf-cafe' },
  },
  {
    id: 'crepe',
    business: 'Café Crêpe',
    kind: 'Restaurant group',
    place: 'Several sites',
    tool: 'marketman',
    task: 'Stocktakes and inventory',
    before: { value: 100, label: 'before' },
    after: { value: 15, label: '85% less' },
    headline: '85% less time on inventory',
    summary: 'Time spent on inventory fell by about 85%, and the yearly cost of goods dropped by about 5%.',
    source: { label: 'MarketMan case study', url: 'https://www.casestudies.com/company/marketman/case-study/how-marketman-touchbistro-pos-helped-this-restaurant-reduce-time-spent-on-inventory-by-85' },
  },
  {
    id: 'redrocks',
    business: 'Red Rocks Cafe',
    kind: 'Restaurant, two sites',
    place: 'Charlotte, USA',
    tool: 'slang',
    task: 'Answering the phone',
    before: { value: 100, label: 'all by staff' },
    after: { value: 40, label: '40% by staff' },
    headline: '60% of calls handled without staff',
    summary: 'Over 90 days the phone assistant answered 97% of 3,088 calls and fully handled 60% of them, so staff could stay with guests.',
    source: { label: 'Slang.ai case study', url: 'https://www.casestudies.com/company/slangai/case-study/how-red-rocks-cafe-fully-automates-60-of-calls-with-voice-ai' },
  },
]

// The admin load, in Australia
export const ADMIN_STAT = {
  value: 'Over 6 hrs',
  text: 'a week on admin for more than half of Australian small-business owners, and 43% say it’s too much.',
  source: { label: 'AMP Bank GO survey of 2,000 owners', url: 'https://www.amp.com.au/about-amp/news/2026/january/Small-business-owners--always-on--while-much-of-Australia-enjoys-the-summer-holidays--' },
}

// What working it out yourself takes, against working it out with Cafinity (our estimates)
export const RESEARCH = {
  diy: {
    hours: 20,
    parts: [
      { label: 'Reading up on a dozen tools', hours: 8 },
      { label: 'Demos and free trials', hours: 6 },
      { label: 'Comparing prices and plans', hours: 3 },
      { label: 'Asking around and second-guessing', hours: 3 },
    ],
  },
  cafinity: {
    minutes: 15,
    parts: [
      { label: 'Your check-up with Bea', minutes: 5 },
      { label: 'Reading your plan', minutes: 10 },
    ],
  },
}
