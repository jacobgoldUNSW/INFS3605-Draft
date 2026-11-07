# Before → after

Full-page screenshots of every screen, at desktop width (1440px) and phone width (390px), taken with the same
test café (Little Fern Café: a 3–5 person specialty café, with Dext, Xero, Deputy and Square on its plan).

- **Before:** Brewmind V3, as it was after the feedback meeting (git tag `brewmind-v3-before-cafinity`).
- **After:** Cafinity.

| Screen | Before | After |
| --- | --- | --- |
| Home | [desktop](before/01-home-desktop.png) · [phone](before/01-home-phone.png) | [desktop](after/01-home-desktop.png) · [phone](after/01-home-phone.png) |
| AI Pantry | [desktop](before/02-pantry-desktop.png) · [phone](before/02-pantry-phone.png) | [desktop](after/02-pantry-desktop.png) · [phone](after/02-pantry-phone.png) |
| One tool | [desktop](before/03-tool-detail-desktop.png) · [phone](before/03-tool-detail-phone.png) (a pop-up) | [desktop](after/03-tool-detail-desktop.png) · [phone](after/03-tool-detail-phone.png) (its own page) |
| Check-up | [desktop](before/04-checkup-desktop.png) · [phone](before/04-checkup-phone.png) | [desktop](after/04-checkup-desktop.png) · [phone](after/04-checkup-phone.png) |
| The plan | [desktop](before/05-plan-desktop.png) · [phone](before/05-plan-phone.png) (one long page) | Overview: [desktop](after/05-plan-desktop.png) · [phone](after/05-plan-phone.png) |
| The café details under the plan title | [desktop](before/06-plan-details-row-desktop.png) · [phone](before/06-plan-details-row-phone.png) | The profile strip at the top of any plan screenshot |
| Costs | (part of the long page) | [desktop](after/06-plan-costs-desktop.png) · [phone](after/06-plan-costs-phone.png) |
| Setup | (part of the long page) | [desktop](after/07-plan-setup-desktop.png) · [phone](after/07-plan-setup-phone.png) |
| Reality checks | (part of the long page) | [desktop](after/08-plan-checks-desktop.png) · [phone](after/08-plan-checks-phone.png) |
| The café simulation | (top of the plan page) | [desktop](after/09-plan-cafe-desktop.png) · [phone](after/09-plan-cafe-phone.png) (its own tab, toolkit beside it) |

## Running both side by side

The old version can run next to the new one for a live demo:

```bash
git worktree add ../Cafinity-before brewmind-v3-before-cafinity
cd ../Cafinity-before && npm ci && npm run build && API_PORT=8788 node server/index.js
```

Then Brewmind is at http://localhost:8788/infs3605/ and Cafinity (`npm run dev` in this folder) at
http://localhost:5173/infs3605/.
