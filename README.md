# Cafinity: see what AI could take off your café's plate

A UNSW INFS3605 prototype (Stream 3: *The Last-Mile AI Clinic*). Independent café owners don't need convincing
that AI tools exist; they want to see the impact on **their** café before they spend anything. Cafinity:

1. **shows the impact** for their café: hours back, money a month, what it costs, when it pays for itself, and
   their week before and after;
2. **matches them to the right tools** from a pantry of twelve tools Australian cafés actually use, with every
   price, risk and limitation up front;
3. **walks them through setup**, one tool at a time on a quiet afternoon.

Bea, Cafinity's café advisor, runs the check-up by chat or by voice and can tweak the plan with the owner.

---

## Run it

```bash
npm install
npm run dev
```

`npm run dev` starts **both** servers: the Express API on `http://localhost:8787` and the app at
**http://localhost:5173/infs3605/** (the browser opens automatically). `npm run dev:all` does the same without
opening a browser. Windows users can double-click `start.bat`.

**Gemini key.** The server looks for, in order: the `GEMINI_API_KEY` env var, `gemini_key.txt` in this folder, or
`gemini_key.txt` one folder up (`gemini_key.txt` is git-ignored). Without a key everything still works: plans use
our standard advice, the café uses built-in example responses, and Bea runs a guided check-up herself.

**Password page.** Off locally unless `GATE_PASSWORD` is set (for example `GATE_PASSWORD=your-password npm run dev:all`).

**Production (one server):**

```bash
npm run build
npm start          # serves the built app + API at http://localhost:8787/infs3605/
```

**Hosted group preview:** double-click `deploy_to_jacobgold_me.bat` (Windows). See [HOSTING.md](HOSTING.md).

---

## What's where

| Page | Route | What it does |
| --- | --- | --- |
| Home | `#/` | The plain-English promise, proof (20 hours of research saved), how it works, research time compared, owner stories, fair questions, and a café preview at the bottom |
| Check-up | `#/plan` (before a plan exists) | Talk to Bea (type, tap or speak) or use the quick form, confirm tools, then "putting your plan together" |
| Plan › Overview | `#/plan` | The café profile strip, the summary card (photo, hours-back clock, four key numbers), hours by task, owner stories, other tools |
| Plan › Costs | `#/plan/costs` | The monthly bill as a ledger, where you stand month by month, the working (adjustable wage), the numbers in detail |
| Plan › Setup | `#/plan/setup` | Week-by-week setup with checklists saved to the account, first-week checks, vendor links, `.ics` calendar export |
| Plan › Reality checks | `#/plan/checks` | The honest risk register, most serious first |
| Plan › Your café | `#/plan/cafe` | The full café simulation, with the toolkit beside it |
| AI Pantry | `#/pantry`, `#/pantry/<tool>` | Every tool, filterable; one page per tool with price, risks, setup, results and a link out |

The **toolkit sidebar** stays beside the plan (a bottom bar on phones): tools by their real names and prices, add or
remove any, and every number on the page updates. Tools are only humanised (Dex, Cami…) inside the café simulation.

| Area | Where |
| --- | --- |
| Design system: tokens, type (Newsreader + Libre Franklin), components, pages | `src/styles/cafinity/` |
| Line icons, drawn botanicals, the Cafinity mark, rails, stats, the clock | `src/components/ui/` |
| Routing (hash routes, no hosting changes needed) | `src/router.js`, `src/state.jsx` |
| The plan page and its tabs | `src/components/plan/` |
| Home | `src/components/home/HomePage.jsx` |
| AI Pantry and tool pages | `src/components/marketplace/` |
| Check-up, quick form, tool picker, loader | `src/components/checkup/`, `src/components/dashboard/` |
| Bea: chat, voice, drawer, guided offline check-up | `src/components/bea/`, `src/voice/useVoice.js` |
| Real-world evidence (sourced case studies, admin stat, research time) | `src/data/evidence.js` |
| Tools, prices, risks, setup steps | `src/data/products.js`, `src/data/risks.js` |
| Plan estimates (hours, money, payback, hours by task) | `src/data/mockDashboard.js` |
| Café simulation engine and canvas | `src/sim/`, `src/components/cafe/` |
| Express API, auth, Gemini, Bea | `server/` |

### API

With the password page on, every route below `/api/gate` needs the pass in an `x-brewmind-gate` header (the app adds it).

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | always open: Gemini status, which store, whether the gate is on |
| GET / POST | `/api/gate` | is a password needed / check the group password (a 30-day pass) |
| POST | `/api/auth/signup`, `/api/auth/login` | accounts |
| GET | `/api/auth/me` | restore session + saved plan |
| PUT | `/api/plan` | save `survey`, `selected`, `geminiPlan` and `chat` (including ticked setup steps) |
| POST | `/api/gemini/personalise-dashboard` | headline, summary, tool reasons, setup cards, a peer tip |
| POST | `/api/gemini/agent-step` | one café workflow in the simulation |
| POST | `/api/bea/checkup`, `/api/bea/plan` | one turn of Bea's check-up / "Talk to Bea" on the plan |
| POST | `/api/bea/transcribe` | a voice note for Bea (browsers without built-in speech recognition) |

### Talking to Bea

- The microphone uses the browser's own speech recognition in Australian English (Chrome, Edge, Safari). Other
  browsers record a short voice note, which the server has Gemini transcribe.
- Bea can read her replies aloud (the speaker button), with an Australian voice where the device has one.
- "Show me the costs", "take me to setup" or "open Xero" move you around the app, with or without the AI.
- Without the AI, the check-up chat becomes a guided conversation that understands everyday answers
  ("about eight of us", "around $400k a year") and proposes a shortlist using the plan's own formulas.

### How the estimates work

Every figure has a "How we got this" hover and the full working on the Costs tab.
- **Hours:** admin starts at about 12 hrs a week plus roughly an hour per team member. The tools' claimed savings
  are capped at 70% of that, then split between the owner and paid staff by team size. Hours come off the kinds of
  work each tool actually does (paperwork, rosters and ordering, marketing, customer messages).
- **Money:** only paid staff hours count as cash, at $32/hr by default (adjustable). The owner's own hours are time
  back, not cash, unless they tick "count my own time". Less waste comes off stock spend, and extra sales count at a
  35% margin. The monthly gain is capped at 12% of sales (20% with the owner's time) and shown as a range.
- **Payback:** two months of subscriptions (to cover setup) divided by the monthly gain, shown in weeks.

### Evidence

`src/data/evidence.js` lists published case studies from cafés and restaurants using Pantry tools (Blackwood
Pantry, Beta, Monastery Coffee, Curry Leaf Café, Café Crêpe, Red Rocks Cafe), shown on each tool's Pantry page.
Every case study is published by the tool's maker, so the app labels them as best cases and links each source.
Sources were checked in November 2026.

### Before and after

The Brewmind version this redesign replaced is tagged `brewmind-v3-before-cafinity`. Full-page screenshots of
every screen, before and after, are in [`docs/before-after/`](docs/before-after/).

---

## Rebuilding the pixel art

The café is compiled from the purchased LimeZu packs in `../Assets` (not shipped in this folder):

```bash
pip install pillow
npm run cafe:build
```

## Credits

- Pixel art: **LimeZu, Modern Interiors** (limezu.itch.io), licensed; credit shown in the footer.
- Photography: **Unsplash** contributors.
- Fonts: Newsreader and Libre Franklin (Google Fonts).
- Music: original lofi tracks by the project's author, plus two royalty-free tracks by Alex Morgan.
- All dollar and hour figures are illustrative estimates for a prototype. Prices were checked in October 2026.
- Owner stories and testimonials are placeholders, labelled as such in the app, until real owners are interviewed.
