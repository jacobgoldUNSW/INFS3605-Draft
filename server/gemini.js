import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai'
import { AGENT_META, ARTIFACT_TYPES, fallbackAgentStep, sanitizeStep } from '../shared/agentScenarios.js'
import { fallbackPersonalisation } from '../shared/personalise.js'
import { auDeep } from '../shared/auEnglish.js'
import { getProduct } from '../src/data/products.js'
import { EMPLOYEE_OPTIONS, REVENUE_OPTIONS, CAFE_TYPES, PRIMARY_GOALS, PAIN_POINTS, TECH_LEVELS } from '../src/data/mockDashboard.js'

const here = path.dirname(fileURLToPath(import.meta.url))

// Verified against gemini_key.txt: these two model strings work; 'gemini-2.0-flash' / 'gemini-3.8-flash' 404.
export const PRIMARY_MODEL = 'gemini-3-flash-preview'
export const FALLBACK_MODEL = 'gemini-2.5-flash'

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim()
  for (const p of [path.resolve('gemini_key.txt'), path.join(here, '..', 'gemini_key.txt'), path.join(here, '..', '..', 'gemini_key.txt')]) {
    try {
      const k = fs.readFileSync(p, 'utf8').trim()
      if (k) return k
    } catch { /* try next */ }
  }
  return null
}

const apiKey = loadKey()
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null
export const geminiReady = !!ai
// Bea (server/bea.js) talks to the same client, with the same models and voice
export { ai as genai }

export const MODELS = [
  // Thinking is pinned to minimal: "low" spends the whole output budget on thoughts and truncates the JSON.
  { model: PRIMARY_MODEL, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  { model: FALLBACK_MODEL, thinkingConfig: { thinkingBudget: 0 } },
]

export const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms`)), ms)),
])

async function generateJSON({ system, prompt, schema, maxOutputTokens = 1200, temperature = 0.85, timeoutMs = 12000 }) {
  if (!ai) throw new Error('Gemini key not configured')
  let lastErr
  for (const { model, thinkingConfig } of MODELS) {
    const t0 = Date.now()
    try {
      const res = await withTimeout(ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: schema,
          maxOutputTokens,
          temperature,
          thinkingConfig,
        },
      }), timeoutMs)
      const text = res.text
      if (!text) throw new Error('empty response')
      const data = JSON.parse(text)
      console.log(`[gemini] ${model} ✓ ${Date.now() - t0}ms`)
      return { data, model, ms: Date.now() - t0 }
    } catch (e) {
      lastErr = e
      console.warn(`[gemini] ${model} failed (${Date.now() - t0}ms): ${String(e.message || e).slice(0, 160)}`)
    }
  }
  throw lastErr
}

export const VOICE = `Write like a friendly Australian café owner talking to another café owner.
Plain English, short and warm. Never use tech jargon: do not say AI, agent, LLM, model, automation, algorithm,
workflow, synergy, optimise, leverage, orchestrate or "seamless". Use Australian English spelling (organise, colour,
favourite, centre, prioritise) and AUD prices.`

// ------------------------------------------------------------------------------------------
// Personalised dashboard

function describeSurvey(s = {}) {
  const lab = (arr, id) => arr.find((x) => x.id === id)?.label
  return [
    `Café name: ${s.name || 'unnamed café'}`,
    `Team size: ${lab(EMPLOYEE_OPTIONS, s.employees) || 'unknown'}`,
    `Annual revenue: ${lab(REVENUE_OPTIONS, s.revenue) || 'unknown'}`,
    `Type: ${lab(CAFE_TYPES, s.cafeType) || 'unknown'}`,
    `Number one goal: ${lab(PRIMARY_GOALS, s.goal) || 'unknown'}`,
    `Biggest time sinks: ${(s.pains || []).map((p) => lab(PAIN_POINTS, p)).filter(Boolean).join(', ') || 'not said'}`,
    `Tech comfort: ${lab(TECH_LEVELS, s.tech) || 'unknown'}`,
    `In their own words, the biggest headache: ${s.rant ? `"${String(s.rant).slice(0, 300)}"` : '(skipped)'}`,
  ].join('\n')
}

const PHASES = ['Week 1 · Quick win', 'Weeks 2–3 · Core habit', 'Month 2 · Upgrade']

const personaliseSchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: 'max 9 words, names the café, warm and specific' },
    summary: { type: Type.STRING, description: 'max 2 short sentences' },
    toolReasons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { id: { type: Type.STRING }, reason: { type: Type.STRING, description: 'max 16 words, references their answers' } },
        required: ['id', 'reason'],
      },
    },
    setupCards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          toolId: { type: Type.STRING },
          phase: { type: Type.STRING, enum: PHASES },
          steps: { type: Type.ARRAY, items: { type: Type.STRING, description: 'max 12 words, concrete action' } },
          minutes: { type: Type.INTEGER },
          owner: { type: Type.STRING, description: 'which HUMAN on the café team runs the setup, e.g. "You", "You or your head barista", "Your kitchen lead" — never a worker character name' },
          safetyCheck: { type: Type.STRING, description: 'one week-1 safety check, max 14 words' },
          whyNow: { type: Type.STRING, description: 'max 14 words' },
        },
        required: ['toolId', 'phase', 'steps', 'minutes', 'owner', 'safetyCheck'],
      },
    },
    peerTip: { type: Type.STRING, description: 'one sentence of advice from a fellow café owner' },
  },
  required: ['headline', 'summary', 'toolReasons', 'setupCards'],
}

export async function personaliseDashboard(survey, selected) {
  const fallback = fallbackPersonalisation(survey, selected)
  const tools = selected.map(getProduct).filter(Boolean)
  if (!tools.length || !ai) return { plan: fallback, source: 'fallback' }
  const bill = tools.reduce((s, p) => s + (p.cost || 0), 0)
  const toolList = tools.map((p) => `- ${p.id}: ${p.name} (${p.priceLabel}) — ${p.description} Worker in the café: ${p.worker.name}, ${p.worker.role}. Default setup idea: ${p.setup.steps.join(' → ')}`).join('\n')
  const prompt = `Personalise this café owner's plan.

CAFÉ PROFILE
${describeSurvey(survey)}

TOOLS THEY PICKED (use these exact ids)
${toolList}
Together these cost about A$${bill} a month. If you mention the monthly bill, use that figure.

Return:
- headline + summary for their dashboard banner (mention what they told us; no hype).
- toolReasons: one per picked tool, why it suits THIS café.
- setupCards: exactly one per picked tool. 3 concrete zero-jargon steps each ("Connect your Square account (2 clicks)"),
  realistic minutes for a quiet Tuesday afternoon, which human on THEIR team runs it ("You", "You or your head barista",
  "Your kitchen lead" — never Jules/Jax/Dex/Dep/Sienna/Leo/Marco/Ollie/Cami/Pia/Sunny/Milo), and a week-1 safety check.
  Phase: quick, cheap tools are "Week 1 · Quick win"; tools touching money/rosters are "Weeks 2–3 · Core habit";
  hardware, stock counts or till changes are "Month 2 · Upgrade".
- peerTip: one sentence.`
  try {
    const { data, model, ms } = await generateJSON({
      system: `You personalise a small-café owner's technology plan for the Brewmind web app.\n${VOICE}`,
      prompt, schema: personaliseSchema, maxOutputTokens: 3200, temperature: 0.7, timeoutMs: 15000,
    })
    const ids = new Set(selected)
    const reasons = { ...fallback.toolReasons }
    for (const r of data.toolReasons || []) if (ids.has(r.id) && r.reason) reasons[r.id] = String(r.reason).slice(0, 160)
    const cards = []
    for (const c of data.setupCards || []) {
      if (!ids.has(c.toolId) || cards.some((x) => x.toolId === c.toolId)) continue
      const base = fallback.setupCards.find((x) => x.toolId === c.toolId)
      const steps = (c.steps || []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 3)
      cards.push({
        toolId: c.toolId,
        phase: PHASES.includes(c.phase) ? c.phase : base?.phase,
        steps: steps.length === 3 ? steps : base?.steps,
        minutes: Math.max(5, Math.min(180, Math.round(Number(c.minutes) || base?.minutes || 20))),
        owner: String(c.owner || base?.owner || 'You').slice(0, 60),
        safetyCheck: String(c.safetyCheck || base?.safetyCheck || '').slice(0, 140),
        whyNow: String(c.whyNow || reasons[c.toolId] || '').slice(0, 140),
      })
    }
    for (const base of fallback.setupCards) if (!cards.some((c) => c.toolId === base.toolId)) cards.push(base)
    cards.sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase))
    return {
      plan: auDeep({
        headline: String(data.headline || fallback.headline).slice(0, 90),
        summary: String(data.summary || fallback.summary).slice(0, 260),
        toolReasons: reasons,
        setupCards: cards,
        peerTip: String(data.peerTip || fallback.peerTip).slice(0, 180),
        source: 'gemini',
        model,
        tools: [...selected].sort(),
      }),
      source: 'gemini', model, ms,
    }
  } catch (e) {
    return { plan: { ...fallback, tools: [...selected].sort() }, source: 'fallback', error: String(e.message || e) }
  }
}

// ------------------------------------------------------------------------------------------
// Agent step (one workflow in the live café)

const EVENT_TEXT = {
  rain: 'It just started pouring outside. Street foot traffic is dropping and the pastry case is still full.',
  rush: 'Morning rush: a wave of commuters is queuing out the door and the café phone keeps ringing.',
  sick: 'Josh, one of the morning baristas, just texted in sick for his 6:00am shift. Call him Josh.',
  delivery: 'The milk, bean and produce delivery just arrived at the back door with a paper invoice docket — and one line on it does not match what was agreed (a sneaky price rise or a short delivery).',
  review: 'A customer posted a new Google review, and an Instagram DM asks about a severe allergy.',
  tick: 'A normal moment in morning service. Pick ONE useful, realistic background job a worker would proactively handle right now.',
}

const stepSchema = {
  type: Type.OBJECT,
  properties: {
    primaryAgentId: { type: Type.STRING },
    collaboratorAgentId: { type: Type.STRING, nullable: true },
    thought: { type: Type.STRING, description: 'what the primary worker notices, max 20 words' },
    handoffDialogue: { type: Type.STRING, nullable: true, description: 'primary speaking to collaborator by first name, max 24 words' },
    collaboratorReply: { type: Type.STRING, nullable: true, description: 'max 16 words' },
    ownerCheckInQuestion: { type: Type.STRING, nullable: true, description: 'yes/no question to the owner, max 26 words; null for routine jobs' },
    artifactType: { type: Type.STRING, enum: ARTIFACT_TYPES },
    artifactTitle: { type: Type.STRING, description: 'max 8 words' },
    artifactBody: { type: Type.STRING, description: 'the actual thing created (promo copy, email, SMS...), max 40 words' },
    artifactMeta: { type: Type.STRING, description: 'impact line with numbers, max 16 words' },
    artifactLines: { type: Type.ARRAY, items: { type: Type.STRING, description: 'max 7 words' } },
    worldEffect: {
      type: Type.OBJECT,
      properties: {
        spawnCustomers: { type: Type.INTEGER, description: '0-6 new customers who walk in because of this' },
        floatingBadgeText: { type: Type.STRING, description: 'tiny badge like "+5 customers · $62 saved", max 30 chars' },
        aframeUpdated: { type: Type.BOOLEAN, description: 'true only if the street A-frame sign gets a new promo' },
        aframeText: { type: Type.STRING, nullable: true, description: 'max 14 chars, capitals, e.g. "RAINY DEAL $9.50"' },
        impact: {
          type: Type.OBJECT,
          properties: {
            customers: { type: Type.INTEGER }, dollars: { type: Type.INTEGER }, waste: { type: Type.INTEGER },
            minutes: { type: Type.INTEGER }, promos: { type: Type.INTEGER }, reviews: { type: Type.INTEGER }, calls: { type: Type.INTEGER },
          },
        },
      },
      required: ['spawnCustomers', 'floatingBadgeText', 'aframeUpdated'],
    },
  },
  required: ['primaryAgentId', 'thought', 'artifactType', 'artifactTitle', 'artifactBody', 'artifactMeta', 'worldEffect'],
}

export async function agentStep({ event, active = [], busy = [], recent = [], cafeName = 'your café', survey, log = [] }) {
  const free = active.filter((a) => !busy.includes(a) && AGENT_META[a])
  const fallback = fallbackAgentStep({ event, active: free, cafeName, recent })
  if (!fallback) return { step: null, source: 'none' } // nobody hired can help: the owner handles it alone
  if (!ai) return { step: fallback, source: 'fallback' }

  const roster = free.map((id) => `- ${id}: ${AGENT_META[id].name}, ${AGENT_META[id].role} (uses ${AGENT_META[id].tool}; works at the ${AGENT_META[id].station})`).join('\n')
  const hint = JSON.stringify({ ...fallback, scenarioId: undefined, event: undefined })
  const prompt = `CAFÉ: ${cafeName}${survey?.cafeType ? ` (${CAFE_TYPES.find((c) => c.id === survey.cafeType)?.label || ''})` : ''}
${survey?.rant ? `The owner's biggest headache, in their words: "${String(survey.rant).slice(0, 200)}"` : ''}
WHAT JUST HAPPENED: ${EVENT_TEXT[event] || EVENT_TEXT.tick}

TEAM ON SHIFT RIGHT NOW (only these may act; use their exact ids):
${roster}

RECENT TEAM CHATTER (avoid repeating it):
${(log || []).slice(-4).map((l) => `- ${l}`).join('\n') || '- (nothing yet)'}

${event === 'tick' ? '' : 'Your answer MUST be a direct, sensible response to WHAT JUST HAPPENED — not an unrelated chore.\n'}Decide which worker notices this and acts (primaryAgentId), and optionally ONE colleague they hand off to
(collaboratorAgentId, or null). Write their short speech, the concrete thing they create, and the effect on the café.
Rules:
- The owner must approve anything that spends money, publishes a promo, messages staff, customers or suppliers,
  disputes a bill or answers an allergy question: those artifacts are DRAFTS waiting for a yes, and ownerCheckInQuestion
  is a short yes/no question. Only routine jobs (counting, matching, filing, pacing) have ownerCheckInQuestion = null.
- Never claim something was already sent, posted, disputed or paid before the owner says yes.
- Realistic numbers for one small Australian café. Mention ${cafeName} by name in customer-facing copy.
- Keep the worker's job consistent with their role.
Here is one good answer for inspiration — improve the wording, keep it believable:
${hint}`

  try {
    const { data, model, ms } = await generateJSON({
      system: `You write the next moment of a cosy live café simulation where human-looking staff each represent a real software tool.\n${VOICE}`,
      prompt, schema: stepSchema, maxOutputTokens: 1100, temperature: 0.9, timeoutMs: 9000,
    })
    const step = auDeep(sanitizeStep({ ...data, event, scenarioId: `gemini-${event}` }, free, fallback))
    if (!step.worldEffect.impact && fallback.worldEffect.impact && step.primaryAgentId === fallback.primaryAgentId) {
      step.worldEffect.impact = fallback.worldEffect.impact
    }
    return { step, source: 'gemini', model, ms }
  } catch (e) {
    return { step: fallback, source: 'fallback', error: String(e.message || e) }
  }
}
