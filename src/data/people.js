// Real café owners & baristas (Unsplash photography). Every photo below was checked by eye
// against the name, role and setting it's paired with — the alt text on a couple of
// Unsplash candidates was wrong, so nothing here relies on captions.
const U = (id, w = 400, h = 400) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&crop=faces&auto=format&q=70`

export const PEOPLE = {
  mia: { name: 'Mia Torres', role: 'Owner', cafe: 'The Corner Grinder', city: 'Newtown, NSW', photo: 'photo-1753351052363-53ce102830eb' },
  samMia: { name: 'Sam & Mia Torres', role: 'Owners', cafe: 'The Corner Grinder', city: 'Newtown, NSW', photo: 'photo-1753351052617-62818ffc9173' },
  amira: { name: 'Amira Haddad', role: 'Owner', cafe: 'Saltbush Coffee', city: 'Brunswick, VIC', photo: 'photo-1665119497491-7d5d396c5cce' },
  daniel: { name: 'Daniel Tran', role: 'Owner', cafe: 'The Corner Roast', city: 'Marrickville, NSW', photo: 'photo-1590760117126-2b178862cad2' },
  sameer: { name: 'Sameer Khan', role: 'Owner', cafe: 'Saffron & Toast', city: 'Parramatta, NSW', photo: 'photo-1758887261865-a2b89c0f7ac5' },
  kate: { name: "Kate O'Brien", role: 'Owner', cafe: 'Lantern Lane Café', city: 'Fremantle, WA', photo: 'photo-1758575603874-102a10a06dcb' },
  nadia: { name: 'Nadia Rahman', role: 'Co-owner', cafe: 'Brick Lane Brunch', city: 'Surry Hills, NSW', photo: 'photo-1555944064-01fd7e6bc1f8' },
  ravi: { name: 'Ravi Kumar', role: 'Head barista', cafe: 'Grind & Co', city: 'Braddon, ACT', photo: 'photo-1736813133664-f1e450b43a19' },
  isabella: { name: 'Isabella Costa', role: 'Owner', cafe: 'Sunday Social', city: 'Newcastle, NSW', photo: 'photo-1788999422915-81246819a93e' },
  emma: { name: 'Emma Walsh', role: 'Owner', cafe: 'Honeycomb Café', city: 'Geelong, VIC', photo: 'photo-1786187537054-e547be995248' },
  jack: { name: 'Jack Morrison', role: 'Owner', cafe: 'Harbour Bean', city: 'Wollongong, NSW', photo: 'photo-1551529563-fce9529e67ac' },
  lily: { name: 'Lily Morgan', role: 'Owner', cafe: 'Mustard Seed Coffee', city: 'West End, QLD', photo: 'photo-1507914372368-b2b085b925a1' },
  chloe: { name: 'Chloe Martin', role: 'Manager', cafe: 'Bluebird Espresso', city: 'Fitzroy, VIC', photo: 'photo-1758519289791-ffce8889ca8c' },
  tom: { name: 'Tom Fletcher', role: 'Owner', cafe: 'Driftwood Coffee', city: 'Byron Bay, NSW', photo: 'photo-1556742393-d75f468bfcb0' },
  sophie: { name: 'Sophie Laurent', role: 'Owner', cafe: 'Petit Four Bakery Café', city: 'Hobart, TAS', photo: 'photo-1579005007697-75b2fe2c88e7' },
  brothers: { name: 'Kwame & Jordan Mensah', role: 'Owners', cafe: 'Two Brothers Espresso', city: 'Logan, QLD', photo: 'photo-1763272594094-946e5be3ccbe' },
  hiro: { name: 'Hiro Tanaka', role: 'Owner', cafe: 'Kumo Coffee', city: 'Melbourne CBD, VIC', photo: 'photo-1555953348-ab36203d4cad' },
}

export const photo = (key, w, h) => U(PEOPLE[key].photo, w, h)

/** Peer stories: skeptic → delegated → evenings back. `tools` drives relevance on the dashboard. */
export const PEER_STORIES = [
  {
    id: 'mia', person: 'mia', type: 'specialty', tools: ['xero', 'dext', 'deputy'],
    skeptic: '“I honestly thought AI meant robots taking orders.”',
    win: 'Handed invoices to Dext + Xero and rosters to Deputy. Sunday nights are mine again.',
    stat: '6 hrs/wk back',
  },
  {
    id: 'amira', person: 'amira', type: 'bakery', tools: ['marketman', 'canva', 'mailchimp'],
    skeptic: '“I didn’t trust a computer to know my regulars.”',
    win: 'Rainy days used to mean a bin full of croissants. Now Canva + Mailchimp send a regulars’ deal by 10am.',
    stat: '$310/mo less waste',
  },
  {
    id: 'daniel', person: 'daniel', type: 'specialty', tools: ['slang', 'square', 'podium'],
    skeptic: '“My customers want a human on the phone — full stop.”',
    win: 'The phone gets answered on the first ring and I check every allergy reply myself. Catering orders doubled.',
    stat: '+$1.1k catering/mo',
  },
  {
    id: 'brothers', person: 'brothers', type: 'drive', tools: ['square', 'lightspeed', 'deputy'],
    skeptic: '“We figured AI was for big chains, not two brothers with a coffee window.”',
    win: 'Combo keys and a sensible roster cut the 7:30 queue in half — without adding a shift.',
    stat: '−2 min wait',
  },
  {
    id: 'sophie', person: 'sophie', type: 'bakery', tools: ['ordermentum', 'marketman', 'xero'],
    skeptic: '“Every app promised to save time and just added logins.”',
    win: 'Milk and flour orders go in before cut-off on their own. I approve them with one tap at the bench.',
    stat: '4 hrs/wk back',
  },
]

export const AUTH_QUOTE = {
  person: 'samMia',
  quote: 'We were the biggest AI sceptics on our street. It took us one quiet Tuesday to set up — and we still say yes or no to everything.',
}

export const SURVEY_QUOTE = {
  person: 'mia',
  quote: 'Took me four minutes. Honestly easier than ordering milk.',
}
