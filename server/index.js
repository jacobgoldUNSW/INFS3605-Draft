import { createApp, geminiReady, PRIMARY_MODEL, FALLBACK_MODEL } from './app.js'

// Local server: the API (and, after `npm run build`, the built app). The hosted build runs the same
// app on Cloud Run instead — see HOSTING.md.
const PORT = Number(process.env.API_PORT || 8787)
const app = await createApp()

app.listen(PORT, () => {
  const gate = process.env.GATE_PASSWORD ? ', password gate on' : ''
  console.log(`Cafinity API on http://localhost:${PORT}  (Gemini ${geminiReady ? `ready: ${PRIMARY_MODEL} → ${FALLBACK_MODEL}` : 'not configured — using built-in fallbacks'}${gate})`)
})
