# ☕ Brewmind — AI Product Marketplace & Recommendation Dashboard

A sleek, animation-first prototype designed specifically for SMB café owners. Built with React, Vite, Framer Motion, and a custom warm coffee-house aesthetic.

---

## 🚀 How to Run

### Option 1: One-Click Launcher (Windows)
Double-click [`start.bat`](file:///c:/Users/jtgol/OneDrive/Desktop/UNSW/INFS3605/start.bat) in the project directory.
- Checks that Node.js is installed.
- Installs dependencies automatically on first run.
- Opens your default web browser to `http://localhost:5173`.
- Offers a choice between **Dev mode** (hot-reload) and **Production preview** (`dist/` build).

### Option 2: Command Line
```bash
npm install
npm run dev
```

---

## 🌐 Static Hosting (Deploy to Any Domain)

This prototype compiles to pure static HTML/CSS/JS with relative asset paths, so it can be deployed directly to Netlify, Vercel, GitHub Pages, Cloudflare Pages, AWS S3, or any web hosting provider:

```bash
npm run build
```

Simply upload the contents of the generated `dist/` folder to your web host.

---

## 🎨 Design System & Aesthetics

- **Color Palette:**
  - Background: Cream (`#FFF8F0`) and Warm Paper (`#FFFDF9`)
  - Typography: Espresso Brown (`#3B2416`)
  - Accent & Buttons: Burnt Orange (`#D9772B`) and Warm Caramel (`#F2B46D`)
  - Soft Tints: Latte (`#EFE0CE`) and Sage Green (`#6F9560`)
- **Typography (Google Fonts):**
  - Headings & Accents: *Pacifico* (cursive flair) and *Caveat* (handwritten notes)
  - Display Titles: *Fraunces* (warm modern serif)
  - UI & Body: *DM Sans* (clean geometric sans-serif)
- **Visual Texture:** Subtle tactile paper grain overlay and animated floating coffee bean silhouettes in the background.

---

## 🧭 App Walkthrough & Features

### 1. Marketplace Tab
- **Interactive Product Grid:** 24 curated AI tools commonly used by hospitality businesses (ChatGPT, Canva Magic, Xero JAX, Square AI, Toast IQ, Deputy, MarketMan, Winnow Vision, Mailchimp, and more).
- **Interactive 3D Tilt Cards:** Cards respond to mouse position with realistic 3D perspective tilt and specular highlight glow.
- **Filtering & Search:** Real-time search bar that expands on focus, plus animated pill filters for use cases (*Ordering & POS*, *Marketing*, *Inventory & Waste*, *Bookkeeping*, *Staff Scheduling*, etc.) and business departments (*Front of House*, *Kitchen*, *Marketing*, *Finance*, *Operations*).
- **Rich Visual Product Modal (Top-Right `+` Button):**
  - Fluid spring expansion with a 16px background blur and espresso backdrop.
  - Left Hero Panel with floating ambient icon orbs, price tier, and department pills.
  - Interactive **"Add to my plan"** CTA with animated checkmark and coffee bean confetti burst (`BeanBurst`).
  - At-a-Glance stats: weekly time saved, monthly cost, and rollout duration.
  - Interactive feature tile grid with custom emoji iconography.
  - 3 animated radial gauges (*Time saved*, *Easy setup*, *Value*).
  - Visual Pros vs. Cons pill comparison cards.

### 2. Dashboard Flow
A 4-step guided onboarding journey:
1. **Interactive Survey:**
   - Business name with animated floating label and keyboard `Enter` support.
   - Interactive selection tiles for employee count (`1-2`, `3-5`, `6-15`, `16+`), annual revenue tier, café format, operational pain points, and tech comfort level.
2. **Personalized Picker:**
   - Surfaces a *"Recommended for you"* carousel based on the owner's specific pain points and café type.
   - Interactive cards with "+ Add" or "Peek inside".
   - Floating dark espresso selection tray at the bottom of the viewport that tracks selected tools with a live counter and *"Brew my plan"* trigger.
3. **"Brewing Your Plan" Loading Animation:**
   - Custom SVG coffee cup illustration filling up with hot brewed coffee.
   - Rising animated steam wisps and falling coffee bean particles.
   - Rotating status messages (*"Grinding your answers..."*, *"Weighing up your tools..."*, *"Steaming the numbers..."*).
4. **Personalized Recommendation Dashboard:**
   - **Interactive "Before" / "After" Pill Toggle:** Smoothly morphs the entire theme and KPI metrics between the current state and the projected AI-assisted future.
   - **Hero Impact Banner:** Count-up numbers showcasing weekly hours saved, estimated monthly net gain, and payback period.
   - **6 Animated KPI Cards:** Admin hours per week, labour cost percentage, food waste percentage, monthly sales, rush-hour wait time, and net profit.
   - **3 Interactive Custom SVG Charts:**
     - 12-Month Profit Projection line chart with area fill and hover tooltip.
     - 7-Day Admin Hours bar chart with "before" ghost comparisons.
     - Admin Time Allocation interactive donut chart with hover slice highlighting.
   - **Implementation Roadmap Timeline:** Step-by-step phased rollout (Weeks 1–2 Quick Wins, Weeks 3–5 Core Systems, Weeks 6–10 Big Upgrades) with scroll-triggered node illumination.
   - **Prioritized Recommendations:** Ordered cards showing ranking (`#1`, `#2`, `#3`), ROI headline, setup time, and risk tier.
   - **Risk Matrix & Limitations:** Interactive severity meters with expandable "How to stay safe" mitigation guides.
