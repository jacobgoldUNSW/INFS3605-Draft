// A week in a small café: the moments that eat an owner's time, when they land, and which tools step in.
// Minutes are our illustrative estimates for a typical 3–8 person café (before → with the tool).
// `pain` matches the check-up's time sinks; `cafinity` marks the moments the owner spends with Cafinity itself.
export const WEEK = [
  {
    id: 'sick', day: 'Mon', time: '5:30am', pain: 'staff', icon: 'phone',
    moment: 'A barista texts in sick before open',
    before: { mins: 45, text: 'Ringing around for cover while you set up the machine.' },
    tools: ['deputy'], after: { mins: 10, text: 'The shift goes out to the team by text. Someone taps “I’ll take it”.' },
  },
  {
    id: 'orders', day: 'Mon', time: '9:00am', pain: 'waste', icon: 'milk',
    moment: 'Milk, beans and bread are due before cut-off',
    before: { mins: 40, text: 'Counting the cool room and guessing from memory.' },
    tools: ['ordermentum', 'marketman'], after: { mins: 10, text: 'An order is drafted from last week’s usage. You check it and send.' },
  },
  {
    id: 'invoices', day: 'Tue', time: '8:30pm', pain: 'admin', icon: 'receipt',
    moment: 'The shoebox of dockets and invoices',
    before: { mins: 120, text: 'Typing every line into the books after close.' },
    tools: ['dext', 'xero'], after: { mins: 20, text: 'Snap each docket at the back door. It’s read and matched to the bank.' },
  },
  {
    id: 'setup', day: 'Wed', time: '2:30pm', cafinity: true, icon: 'leaf',
    moment: 'A quiet afternoon: set up one tool',
    text: 'Follow one Cafinity setup card, step by step. Most take 15 to 45 minutes.',
  },
  {
    id: 'emails', day: 'Wed', time: '9:30pm', pain: 'admin', icon: 'mail',
    moment: 'Supplier emails and a staff how-to',
    before: { mins: 40, text: 'Writing them from scratch at the end of a long day.' },
    tools: ['copilot'], after: { mins: 10, text: 'A first draft is waiting. You fix the details and send.' },
  },
  {
    id: 'specials', day: 'Thu', time: '11:00am', pain: 'quiet', icon: 'rain',
    moment: 'Rain is forecast and the pastry case is full',
    before: { mins: 60, text: 'Making a specials sign and a social post from scratch.' },
    tools: ['canva', 'mailchimp'], after: { mins: 15, text: 'A rainy-day offer for your regulars is drafted. You approve it.' },
  },
  {
    id: 'payroll', day: 'Fri', time: '3:00pm', pain: 'admin', icon: 'coins',
    moment: 'Pay run, super and penalty rates',
    before: { mins: 90, text: 'Checking timesheets against the Award by hand.' },
    tools: ['deputy', 'xero'], after: { mins: 20, text: 'Approved timesheets flow into the pay run with Award rates applied.' },
  },
  {
    id: 'rush', day: 'Sat', time: '7:30am', pain: 'queues', icon: 'people',
    moment: 'The rush: phone ringing, queue out the door',
    before: { mins: 30, text: 'Missed calls, and catering orders slipping through.' },
    tools: ['slang', 'square', 'lightspeed'], after: { mins: 5, text: 'Calls are answered and orders land on the till. Allergy questions still come to you.' },
  },
  {
    id: 'reviews', day: 'Sun', time: '4:00pm', pain: 'reviews', icon: 'star',
    moment: 'The week’s reviews and messages',
    before: { mins: 45, text: 'Replying one by one, or not at all.' },
    tools: ['podium'], after: { mins: 10, text: 'Replies are drafted in your voice. You read them and send.' },
  },
  {
    id: 'roster', day: 'Sun', time: '8:00pm', pain: 'staff', icon: 'calendar',
    moment: 'Next week’s roster',
    before: { mins: 120, text: 'Rebuilding the paper roster around everyone’s availability.' },
    tools: ['deputy'], after: { mins: 30, text: 'A draft roster built from your sales and who’s free, ready to tweak.' },
  },
  {
    id: 'checkup', day: 'Sun', time: '8:45pm', cafinity: true, icon: 'leaf',
    moment: 'Fifteen minutes with Cafinity',
    text: 'Tell Bea how the week went, then see your plan and your next step.',
  },
]

export const weekTotals = (moments = WEEK) => {
  const real = moments.filter((m) => !m.cafinity)
  const before = real.reduce((s, m) => s + m.before.mins, 0)
  const after = real.reduce((s, m) => s + m.after.mins, 0)
  return { before, after, saved: before - after }
}

/** The week for one plan: each moment says whether a tool on the plan covers it, or which one could. */
export function weekFor(selected = [], pains = []) {
  return WEEK.map((m) => {
    if (m.cafinity) return { ...m, covered: true }
    const mine = m.tools.filter((t) => selected.includes(t))
    return { ...m, covered: mine.length > 0, mine, mineFirst: mine[0] || null, suggest: m.tools[0], relevant: pains.includes(m.pain) }
  })
}

export const mins = (n) => (n >= 60 ? `${Math.floor(n / 60)} hr${n >= 120 ? 's' : ''}${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`)
