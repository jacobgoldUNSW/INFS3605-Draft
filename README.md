# ☕ Brewmind V2 — AI for cosy cafés

A warm, animation-first web app for UNSW INFS3605 (Stream 3: *The Last-Mile AI Clinic*).
Café owners who don't trust AI can **watch** a pixel-art café run with and without a team of
humanised AI "workers" — each one a real tool Australian cafés use — and approve everything that matters.

V1's look and feel is kept intact (fonts, palette, floating beans, Framer Motion physics, survey,
picker, brew loader, before/after dashboard and charts). V2 adds sign-in with SQLite, Gemini
personalisation and the live agentic café. The V3 polish round (October 2026) folds the café's controls into one
pixel-art menu, explains what the simulation is, shows the working behind every number (and makes the numbers
more conservative), re-checks every tool's price, and labels all testimonials as placeholders. The hosted group
preview at **jacobgold.me/infs3605** sits behind a password page, with its API on Cloud Run and accounts in Firestore
(see [HOSTING.md](HOSTING.md)).

---

## 🚀 Run it

```bash
npm install
npm run dev
```

`npm run dev` starts **both** servers: the Express API on `http://localhost:8787` and the Vite app at
**http://localhost:5173/infs3605/** (the browser opens automatically). Windows users can double-click `start.bat`.

**Gemini key** — the server looks for, in order: the `GEMINI_API_KEY` env var, `gemini_key.txt` in this
folder, or `gemini_key.txt` one folder up. Without a key everything still works using the built-in
"house recipes" (deterministic, context-aware fallbacks).

**Password page** — off locally unless `GATE_PASSWORD` is set (for example `GATE_PASSWORD=your-password npm run dev:all`).
When it's set, the whole app waits behind a password page, and every API route except `/api/health` and
`/api/gate` needs the pass it hands out.

**Production (one server):**

```bash
npm run build
npm start          # serves the built app + API at http://localhost:8787/infs3605/
```

**Hosted group preview:** double-click `deploy_to_jacobgold_me.bat`. It builds everything and deploys the pages
to Firebase Hosting and the API to Cloud Run on the jacobgold.me project. How it fits together, the one-time
setup, and how to change the password are all in [HOSTING.md](HOSTING.md).

---

## 🧭 What's inside

| Area | Where |
| --- | --- |
| Express API: password gate, auth (JWT + bcrypt), plan sync, Gemini routes, rate limits (`createApp()`, no listening) | `server/app.js` |
| Bea, the host: a Gemini agent with function calling for the chat check-up and “Ask Bea” on the plan; she acts through our own functions (profile, tool matcher, cost formulas, comparisons, setup scheduling) and only ever proposes | `server/bea.js` |
| Local server: runs the app on :8787 | `server/index.js` |
| Accounts and plans: SQLite locally (`server/data/brewmind.db`), Firestore when `BREWMIND_STORE=firestore` (hosted) | `server/store/` |
| Hosted API: the same app as a Cloud Run function, with a sync script and deploy script | `../../../jacobgold.me/brewmind-api`, `tools/deploy/sync_api.mjs`, `deploy_to_jacobgold_me.bat` |
| Gemini (`gemini-3-flash-preview` → fallback `gemini-2.5-flash`, JSON schemas, minimal thinking) | `server/gemini.js` |
| Deterministic agent workflows (offline fallback + Home teaser) | `shared/agentScenarios.js` |
| Plain-English plan fallback | `shared/personalise.js` |
| Australian spelling pass over every AI and fallback text | `shared/auEnglish.js` |
| 12 researched tools (prices and links checked Oct 2026), workers, how tools connect and overlap, placeholder testimonials, setup templates | `src/data/products.js` |
| Plan estimates: hours, money, payback, all shown with their working (see below) | `src/data/mockDashboard.js` |
| Real café owners (Unsplash photos, each checked against name & role) | `src/data/people.js` |
| Café simulation engine (customers, owner, human crew sized to the café, workers, approvals, events, customer moods, café log & totals, 6-minute day with a closing-time wrap-up; café type changes the pace and the A-frame) | `src/sim/world.js` |
| Canvas renderer: light map + real-time shadows + lofi film layer (bloom, bokeh, haze, tilt-shift, grain), brand outlines on AI workers; steps its quality down by itself on slow devices | `src/sim/render.js` |
| One café per signed-in owner, kept alive (paused) across tab switches | `src/sim/session.js` |
| Procedural Web Audio (steam, door bell, marimba, chime, phone, rain) | `src/sim/soundEngine.js` |
| Background music: shuffled, crossfading playlist that plays while the café runs (the 🔊 pop-up turns café sounds and music on or off separately) | `src/sim/music.js`, tracks in `src/assets/music/` |
| Café menu with pixel-art pop-ups (What is this?, Team, Log, Today, Curveballs, Sound; bottom sheets on phones), closing-time wrap-up, first-run tour, inspector, Home teaser, 16-second tool clips | `src/components/cafe/` |
| The group password page in front of the whole app | `src/components/gate/Gate.jsx` |
| Bea’s chat check-up (default first step; the tap-through form is one click away), “Ask Bea” drawer, change and schedule dockets, setup calendar, her pixel portrait | `src/components/bea/` |
| Plan extras: How we worked this out, the monthly bill, how your tools connect, the live café line, section nav | `src/components/dashboard/PlanExtras.jsx` |
| Pixel-art compiler (LimeZu sheets → layers, atlas, map JSON, generated crowd, UI icons and mood bubbles, crop lint) | `tools/cafe/` |
| Styles, loaded in order: `global.css` → `v2.css` → `cafe.css` → `v3.css` (the V3 additions) → `bea.css` (Bea) | `src/styles/` |

### API

With the gate on, every route below `/api/gate` needs the pass in an `x-brewmind-gate` header (the app adds it).

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | always open: Gemini status, which store, whether the gate is on |
| GET | `/api/gate` | is a password needed, and is this browser's pass valid? |
| POST | `/api/gate` | check the group password (case doesn't matter, guesses rate-limited) → a 30-day pass |
| POST | `/api/auth/signup` | create user + empty plan (survey name = café name) |
| POST | `/api/auth/login` | username **or** email + password |
| GET | `/api/auth/me` | restore session + saved plan |
| PUT | `/api/plan` | save `survey`, `selected`, `geminiPlan` (auto, in the background) |
| POST | `/api/gemini/personalise-dashboard` | headline, summary, tool reasons, risks, Quiet Tuesday setup cards |
| POST | `/api/gemini/agent-step` | one café workflow: who notices, hand-off, artifact, owner check-in, world effect |
| POST | `/api/bea/checkup` | one turn of the chat check-up: records the café profile, asks the next question, or proposes a shortlist |
| POST | `/api/bea/plan` | one turn of “Ask Bea”: compares tools, explains numbers, or proposes a tool change or a setup schedule |

### Cost & lifecycle guardrails
- Gemini is only called when brewing a plan, when you click a café event, or every ~18–22 s while you
  are actually watching the **After** café (dashboard open, tab visible, not paused, stage on screen).
- Pausing, hiding the tab or leaving the dashboard stops the simulation clock and aborts in-flight calls.
  Coming back resumes the same café where you left it.
- The Home-page café is always scripted: it has no AI hook at all and makes no network calls.
- Per-user rate limits on the server; anything rate-limited or failed falls back to the house recipes.
- Anything that spends money, publishes, messages people or answers an allergy question needs the
  owner's "yes" (enforced on the server, not just in the prompt). Unanswered asks auto-approve after 15 s
  so the café never stalls.
- Bea calls Gemini only when the owner sends her a message (a few rounds of function calls per message, at most
  5). Every plan change she proposes waits for Accept, with a 10-second Undo. The server checks her tool ids and
  answers, recalculates every number itself, sends her back to fix a message that names a tool her change doesn't
  include, and rewords “I’ve swapped…” as “I’d swap…”. If she's unavailable, the check-up falls back to the form.

### How the estimates work
Every figure on the plan has a "How we worked this out" panel with the same sums. In short:
- **Hours:** admin starts at about 12 hrs a week plus roughly an hour per team member. The tools' claimed savings
  are capped at 70% of that, then split between the owner and paid staff by team size (85% the owner's for a
  1–2 person café, down to 35% for 16+).
- **Money:** only paid staff hours count as cash, at $32/hr by default (adjustable from $25 to $70). The owner's own
  hours are time back, not cash, unless they tick "count my time". Less waste comes off stock spend (30% of sales,
  cut by at most 5%), and extra sales count at a 35% margin, capped at 6% of revenue.
- **Caps and ranges:** the monthly gain is capped at 12% of sales (20% when the owner's time is counted) and shown
  as a range from 0.6× to 1.25×.
- **Payback:** two months of subscriptions (to cover setup) divided by the monthly gain.

---

## 🎨 Rebuilding the pixel art

The café is compiled from the purchased LimeZu packs in `../Assets` (not shipped in this folder):

```bash
pip install pillow
npm run cafe:build                     # map, layers, atlases, characters, UI icons → src/assets/cafe + src/sim/*.json
python tools/cafe/preview_scene.py scene.png 2   # full scene preview with every worker at their station
```

Layout lives in `tools/cafe/build_map.py` (30 × 17 tiles of 32 px); characters (customers, the owner, the human
crew, the AI workers and Bea) in `tools/cafe/build_chars.py`; the pixel menu icons and mood bubbles in
`tools/cafe/build_ui.py` (cut from the pack's `UI_16x16.png` into `cafe_ui.png` + `src/sim/cafeUi.json`).

- **Crop lint:** the map build fails if any sprite crop slices through the art (opaque pixels carrying on past
  the crop edge). Most sprites are cut as exact connected components; tiling pieces are allow-listed.
- **Generated crowd:** customers are generated (seeded, repeatable) from the Character Generator parts with taste
  rules — natural skin tones only, everyday outfits, no fringes over the eyes, no two customers alike, and a check
  that every face stays readable at 32 px.

## 🎵 Background music

Every `.mp3` in `src/assets/music/` joins the shuffle automatically; the café doesn't show track names. No track
repeats until the whole set has played, and tracks crossfade over 2.5 s. The current seven tracks were converted
from `../music` (left untouched) at a matched loudness:

```bash
ffmpeg -i ../music/track.wav -af "loudnorm=I=-18:TP=-2:LRA=11" -ar 44100 -ac 2 -codec:a libmp3lame -q:a 5 src/assets/music/track.mp3
```

## 🙏 Credits
- Pixel art: **LimeZu — Modern Interiors** (limezu.itch.io), licensed; credit shown in the app footer.
- Photography: **Unsplash** contributors.
- Fonts: Pacifico, Caveat, Fraunces, DM Sans, Pixelify Sans (Google Fonts).
- Music: original lofi tracks by the project's author (Acceptance, Departure, Lofi Language, Midnight Strength,
  Quiet Corners, Quiet Choices), plus two royalty-free tracks by Alex Morgan (Lofi Chill Vlog Beats, Lofi Coffee Shop).
- All dollar and hour figures are illustrative estimates for a prototype. Prices were checked in October 2026;
  Copilot (a reseller price), Podium (a listing price) and MarketMan (converted from US$) are approximate.
- Testimonials are placeholders, labelled as such in the app, until real owners are interviewed.
