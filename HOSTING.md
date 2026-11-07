# Hosting Cafinity at jacobgold.me/infs3605

The group preview is a private, password-protected copy of Cafinity on the jacobgold.me Firebase project
(`jacobgold-me`).

> The project was called Brewmind until November 2026. The hosting pieces still carry that name on purpose
> (`brewmind-api`, `brewmindApi`, `functions:brewmind`, the `BREWMIND_*` secrets, the `x-brewmind-gate` header):
> renaming them would mean re-creating the function and its secrets. Everything people see says Cafinity.

```
browser ──► jacobgold.me (Firebase Hosting)
              ├─ /infs3605/**  the built app (static files, from dist/)
              └─ /api/**       ──► brewmindApi (a Cloud Run function, us-central1)
                                      ├─ Firestore: accounts and plans
                                      ├─ Secret Manager: Gemini key, sign-in secret, group password
                                      └─ Gemini API
```

- **The password page** stands in front of the whole app. The password is checked by the server, and
  capitals don't matter. A correct password gives that browser a 30-day pass. Every API route except
  `/api/health` and `/api/gate` needs the pass, so nobody outside the group can create accounts or spend
  Gemini tokens. Wrong guesses are rate-limited.
- **The function** is the same Express app that runs locally (`server/app.js`). It runs on one instance, so
  the per-person and guess limits hold. It sleeps when idle, so the first visit after a quiet spell takes a
  few seconds ("Warming up the machine…").
- **Firestore** stores accounts because the function's disk is wiped whenever it sleeps. Locally, Cafinity
  still uses SQLite. The database rules (`firestore.rules` on the site) block all direct browser access;
  only the function reads and writes.
- **The static files** (scripts, images, music) can be fetched by anyone who knows their exact address, as
  on any website. They contain no keys or account data. Everything that costs money or holds data is behind
  the server's password check.

## Where things live

| What | Where |
| --- | --- |
| The app, server and API source (edit here) | this folder (`INFS3605-Draft-main`) |
| The function's entry, settings and packages | `jacobgold.me/brewmind-api/index.js`, `package.json` |
| The function's copy of the API source | `jacobgold.me/brewmind-api/server`, `shared`, `src/data`, copied by `tools/deploy/sync_api.mjs` (don't edit there) |
| Hosting rewrites, function and database config | `jacobgold.me/firebase.json`, `jacobgold.me/firestore.rules` |

## Deploying an update

Double-click `deploy_to_jacobgold_me.bat`. It:

1. builds Cafinity;
2. copies the build into `jacobgold.me/public/infs3605`;
3. syncs the API into `brewmind-api`;
4. builds the portfolio site;
5. runs `firebase deploy --only hosting,functions:brewmind,firestore:rules`.

## One-time setup

1. **Blaze plan.** Cloud Run, Cloud Build and Secret Manager need pay-as-you-go billing:
   console.firebase.google.com/project/jacobgold-me/usage/details. At a group's traffic, everything
   should stay inside the free tiers. Set a budget alert when it asks (for example A$5).
2. **Firestore.** Create the database once:
   `firebase firestore:databases:create "(default)" --location nam5 --project jacobgold-me`.
3. **Secrets.** Set the three secrets (each command reads the value from a file or stdin, so it never
   lands in your shell history):
   ```bash
   firebase functions:secrets:set BREWMIND_GEMINI_KEY --data-file ../gemini_key.txt --project jacobgold-me
   firebase functions:secrets:set BREWMIND_JWT_SECRET --data-file <a file with a long random string> --project jacobgold-me
   firebase functions:secrets:set BREWMIND_GATE_PASSWORD --data-file - --project jacobgold-me
   ```
4. **Deploy** with the batch file.

## Changing the group password

```bash
firebase functions:secrets:set BREWMIND_GATE_PASSWORD --data-file - --project jacobgold-me
firebase deploy --only functions:brewmind --project jacobgold-me
```

Type the new password and press Ctrl+Z, then Enter, to finish (on Mac or Linux, Ctrl+D). Everyone's old
pass stops working, and they'll see the password page again.

## Keeping the Gemini bill small

- Each signed-in account gets at most about 860 Gemini calls a day. Calls only happen while someone is
  actually watching the café, when they throw a curveball, or when they brew a plan.
- For a hard ceiling, give the hosted server its own Gemini key and cap that key's daily requests:
  1. In Google AI Studio, make a new key.
  2. In the Google Cloud console for that key's project, go to **APIs & Services → Generative Language
     API → Quotas** and lower the requests per day.
  3. Store the new key with `functions:secrets:set BREWMIND_GEMINI_KEY` and redeploy.

  A budget alert only warns you; a quota actually stops the calls.

## Trying the password page locally

The gate is off unless `GATE_PASSWORD` is set. To try it, start the API with the variable set:

```bash
GATE_PASSWORD=your-password npm run dev:all
```

In PowerShell: `$env:GATE_PASSWORD='your-password'; npm run dev:all`.

## Checking the live API

```bash
curl https://jacobgold.me/api/health
```

The response should report `"store":"firestore"` and `"gate":true`. Function logs are in the Firebase
console under Functions → `brewmindApi` → Logs (or run `firebase functions:log`).
