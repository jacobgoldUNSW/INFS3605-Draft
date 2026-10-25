# Brewmind's prompts

Every prompt the app sends to Google Gemini, grouped by the feature it powers. Each section explains its purpose, when
it runs and how it works, then quotes the prompt exactly as the code sends it.

All prompts live on the server (`server/gemini.js` and `server/bea.js`), so the browser never sees them or the API key.
Every call goes to **Gemini 3 Flash** (`gemini-3-flash-preview`). If that fails or is too slow, the same call is retried on
**Gemini 2.5 Flash**. If both fail, the app falls back to hand-written content, so nothing stalls.

**Reading the prompts below:** text in `{curly braces}` is filled in at run time, such as the café's name or the team on
shift. Everything else is sent word for word.

## At a glance

| Feature | What Gemini does | Where | Style | Runs when |
| --- | --- | --- | --- | --- |
| [The house voice](#1-the-house-voice) | Sets the tone for everything below | `server/gemini.js` → `VOICE` | Shared text | Inside every prompt |
| [Live café moments](#2-live-café-moments) | Decides what the AI team does when something happens | `server/gemini.js` → `agentStep` | Fills in a fixed form (JSON schema) | A curveball is thrown, or about every 20 s while the café is on screen |
| [The personalised plan](#3-the-personalised-plan) | Writes the words of the owner's plan | `server/gemini.js` → `personaliseDashboard` | Fills in a fixed form (JSON schema) | The plan brews, "re-brew" is pressed, or the owner accepts a change from Bea |
| [Bea: the check-up chat](#43-the-check-up-chat) | Gets to know the café, then suggests tools | `server/bea.js` → `beaCheckup` | Calls our functions (function calling) | Each message in the step 1 chat |
| [Bea: "Ask Bea" on the plan](#44-ask-bea-on-the-plan) | Compares tools, explains numbers, proposes changes or a setup timetable | `server/bea.js` → `beaPlan` | Calls our functions (function calling) | Each message in the Ask Bea drawer |

The two styles split the work differently:

- **Fixed form (response schema):** Gemini must answer by filling in an exact JSON shape, so our code can act on every
  answer without guessing what it means.
- **Function calling:** Gemini picks which of our functions to call, our server runs them and sends the results back,
  and this repeats until Gemini makes a final move. This is what makes Bea an agent rather than a chatbot.

In both styles, Gemini never decides the numbers the owner sees (bills, hours, payback). Those come from our formulas
in `src/data/mockDashboard.js`.

---

## 1. The house voice

**Purpose:** one consistent, warm, jargon-free voice across the café, the plan and Bea, so Brewmind feels like a café
and not like software. Words such as "AI", "automation" and "workflow" are banned from what Gemini writes.

**How it works:** `VOICE` is pasted into the system instruction of every call. A safety net in `shared/auEnglish.js`
(`auDeep`) also corrects any US spellings Gemini still slips in ("organized" → "organised").

```text
Write like a friendly Australian café owner talking to another café owner.
Plain English, short and warm. Never use tech jargon: do not say AI, agent, LLM, model, automation, algorithm,
workflow, synergy, optimise, leverage, orchestrate or "seamless". Use Australian English spelling (organise, colour,
favourite, centre, prioritise) and AUD prices.
```

---

## 2. Live café moments

**Purpose:** the heart of the simulation. When something happens in the café (rain, a rush, a sick call, a delivery, a
review, or just a quiet moment), Gemini decides which AI worker notices, who they hand it to, what they say, what they
make (a promo, an email, a roster…), whether they must ask the owner first, and the effect on the café.

**When it runs:** when the owner throws a curveball, and about every 18–22 seconds while someone is watching the
café. It is only called when the tab is visible and not paused.

**How it works:**

1. The server describes the café, the event, the workers on shift and the last few lines of team chatter.
2. It also includes one **hand-written example answer**, chosen from the scripted scenarios in
   `shared/agentScenarios.js` to match the event and the team. Gemini is asked to improve on it, not copy it.
3. Gemini answers in the fixed form below.
4. Before the café acts it out, the server checks the answer with `sanitizeStep`:
   - only workers who are on shift and free may act;
   - customers per moment are capped at 6;
   - text lengths are trimmed;
   - the "ask first" rule is applied (see below).
5. If Gemini is slow (over 9 s), errors or hits the daily limit, the hand-written example plays as-is.

### System instruction

```text
You write the next moment of a cosy live café simulation where human-looking staff each represent a real software tool.
{VOICE}
```

### Prompt

```text
CAFÉ: {café name} ({café type, if known})
The owner's biggest headache, in their words: "{their words, if they gave any}"
WHAT JUST HAPPENED: {the event, from the table below}

TEAM ON SHIFT RIGHT NOW (only these may act; use their exact ids):
- {id}: {name}, {role} (uses {tool}; works at the {station})
- …

RECENT TEAM CHATTER (avoid repeating it):
- {up to the last 4 lines of chatter, or "(nothing yet)"}

Your answer MUST be a direct, sensible response to WHAT JUST HAPPENED — not an unrelated chore.
Decide which worker notices this and acts (primaryAgentId), and optionally ONE colleague they hand off to
(collaboratorAgentId, or null). Write their short speech, the concrete thing they create, and the effect on the café.
Rules:
- The owner must approve anything that spends money, publishes a promo, messages staff, customers or suppliers,
  disputes a bill or answers an allergy question: those artifacts are DRAFTS waiting for a yes, and ownerCheckInQuestion
  is a short yes/no question. Only routine jobs (counting, matching, filing, pacing) have ownerCheckInQuestion = null.
- Never claim something was already sent, posted, disputed or paid before the owner says yes.
- Realistic numbers for one small Australian café. Mention {café name} by name in customer-facing copy.
- Keep the worker's job consistent with their role.
Here is one good answer for inspiration — improve the wording, keep it believable:
{the matching hand-written scenario, as JSON}
```

The "Your answer MUST be…" line is left out for background moments (`tick`), where any useful job will do.

### The events

| Event | Text sent as WHAT JUST HAPPENED |
| --- | --- |
| `rain` | It just started pouring outside. Street foot traffic is dropping and the pastry case is still full. |
| `rush` | Morning rush: a wave of commuters is queuing out the door and the café phone keeps ringing. |
| `sick` | Josh, one of the morning baristas, just texted in sick for his 6:00am shift. Call him Josh. |
| `delivery` | The milk, bean and produce delivery just arrived at the back door with a paper invoice docket — and one line on it does not match what was agreed (a sneaky price rise or a short delivery). |
| `review` | A customer posted a new Google review, and an Instagram DM asks about a severe allergy. |
| `tick` | A normal moment in morning service. Pick ONE useful, realistic background job a worker would proactively handle right now. |

### The answer form (response schema)

| Field | What it controls in the café |
| --- | --- |
| `primaryAgentId` | The worker who notices and acts (must be on shift) |
| `collaboratorAgentId` | The colleague they hand off to, or `null` |
| `thought` | Their think bubble (max 20 words) |
| `handoffDialogue`, `collaboratorReply` | The two speech bubbles (max 24 and 16 words) |
| `ownerCheckInQuestion` | The yes/no question they walk over to ask the owner (max 26 words); `null` for routine jobs |
| `artifactType` | What gets made: one of 14 kinds, such as `promo_poster`, `sms_campaign`, `invoice_check`, `email_draft`, `shift_sms`, `review_reply`, `purchase_order` or `roster_plan` |
| `artifactTitle`, `artifactBody`, `artifactMeta`, `artifactLines` | The thing itself (title, the actual copy, an impact line with numbers, short bullet lines) |
| `worldEffect.spawnCustomers` | 0–6 new customers who walk in |
| `worldEffect.floatingBadgeText` | The little badge that floats up, such as "+5 customers · $62 saved" |
| `worldEffect.aframeUpdated`, `aframeText` | Whether the street sign changes, and what it says (max 14 capitals) |
| `worldEffect.impact` | Numbers added to today's scores: customers, dollars, waste, minutes, promos, reviews, calls |

### The "ask first" rule, enforced in code

The prompt asks Gemini to check with the owner, but the server makes sure. If Gemini leaves out the question when
one is needed, `sanitizeStep` adds a sensible default. A question is required whenever any of these apply:

- the artifact is a promo poster, email, shift text, review reply, catering order, purchase order or payment batch;
- it's an invoice check that disputes a bill;
- it's an SMS offer;
- anything mentions allergies, coeliac, gluten or nuts;
- the street sign changes.

**Settings:** temperature 0.9 (lively and varied), up to 1,100 output tokens, minimal thinking, a 9-second limit.

---

## 3. The personalised plan

**Purpose:** turns the owner's answers and picked tools into the words of their plan:

- a headline and a short summary;
- why each tool suits them;
- a setup card per tool (steps, minutes, who runs it, a week-1 safety check);
- a tip from a fellow owner.

The plan's risks ("reality checks") are not written by Gemini. They come from a fixed, hand-written register
(`src/data/risks.js`) and each tool's own risks (`src/data/products.js`), ranked for the owner's tools by our code, so
they stay honest and say the same thing to everyone.

**When it runs:** when the plan brews (the coffee-cup loading screen), when the owner presses "re-brew", and when they
accept a tool change from Bea (the plan is rewritten for the new set of tools).

**How it works:**

- A "house recipe" version written by rules (`shared/personalise.js`) shows straight away. Gemini's version replaces it
  when it arrives, usually within the six seconds the brewing cup takes.
- The total monthly bill is worked out by our code and handed to Gemini, so any figure it quotes is ours.
- Afterwards the server:
  - keeps exactly one setup card per picked tool and allows only the three phases;
  - holds minutes between 5 and 180;
  - fills any gap from the house recipe.

### System instruction

```text
You personalise a small-café owner's technology plan for the Brewmind web app.
{VOICE}
```

### Prompt

```text
Personalise this café owner's plan.

CAFÉ PROFILE
Café name: {name}
Team size: {e.g. 3–5}
Annual revenue: {e.g. $250k – $500k}
Type: {e.g. Bakery-café}
Number one goal: {e.g. Win back my evenings}
Biggest time sinks: {e.g. Too much paperwork, Rostering headaches}
Tech comfort: {e.g. Getting by}
In their own words, the biggest headache: "{their words}" (or "(skipped)")

TOOLS THEY PICKED (use these exact ids)
- {id}: {name} ({price}) — {description} Worker in the café: {worker name}, {worker role}. Default setup idea: {step → step → step}
- …
Together these cost about A${monthly bill} a month. If you mention the monthly bill, use that figure.

Return:
- headline + summary for their dashboard banner (mention what they told us; no hype).
- toolReasons: one per picked tool, why it suits THIS café.
- setupCards: exactly one per picked tool. 3 concrete zero-jargon steps each ("Connect your Square account (2 clicks)"),
  realistic minutes for a quiet Tuesday afternoon, which human on THEIR team runs it ("You", "You or your head barista",
  "Your kitchen lead" — never Jules/Jax/Dex/Dep/Sienna/Leo/Marco/Ollie/Cami/Pia/Sunny/Milo), and a week-1 safety check.
  Phase: quick, cheap tools are "Week 1 · Quick win"; tools touching money/rosters are "Weeks 2–3 · Core habit";
  hardware, stock counts or till changes are "Month 2 · Upgrade".
- peerTip: one sentence.
```

The list of worker names tells Gemini that a real person on the café team does the setup, never one of the pixel
characters.

### The answer form (response schema)

| Field | Limits |
| --- | --- |
| `headline` | max 9 words, names the café |
| `summary` | max 2 short sentences |
| `toolReasons[]` | `{ id, reason }`, reason max 16 words and referencing their answers |
| `setupCards[]` | `{ toolId, phase, steps[3], minutes, owner, safetyCheck, whyNow }`; phase must be one of the three |
| `peerTip` | one sentence |

**Settings:** temperature 0.7 (steadier than the café), up to 3,200 output tokens, minimal thinking, a 15-second limit.

---

## 4. Bea, the host

Bea is the part of Brewmind the owner talks to. Unlike the café, she is an **agent loop**: for each reply she can look
things up and run our numbers before she suggests anything. She has two jobs (4.3 and 4.4). Both share her persona and
her loop.

### 4.1 Bea's persona

**Purpose:** gives Bea a consistent character and her non-negotiable honesty rules. It opens both of her system
instructions.

```text
You are Bea, the host at Brewmind: a warm, down-to-earth Australian barista who has helped lots of
small cafés get their paperwork under control. You are chatting with a café owner inside the Brewmind web app.
{VOICE}
Talk like a friendly text message: 1 to 3 short sentences, no lists, no headings, no emoji spam (one is fine).
Call the software "tools" or "helpers". Be honest about costs and limits; never oversell.
Never say you have signed anyone up, paid, emailed, messaged or contacted anyone: you only suggest, the owner decides.
When you propose something, word it as a suggestion ("How about…", "I'd swap…"), never as done ("I've swapped…"):
nothing changes until the owner presses Accept.
```

### 4.2 How her loop works

- **Every reply is a function call.** Function calling is set to mode `ANY`, so Gemini must call one of our functions
  every round, even just to talk (the `say` function).
- **Look-ups go back to her.** Calls like `estimate` run on our server, and their results go straight back to Gemini.
- **Final moves end her turn.** `say` and the `propose_…` functions end the turn, and the owner sees the result.
- **At most 5 rounds per reply**, each with a 14-second limit. If Gemini 3 Flash fails, the whole turn is retried on
  Gemini 2.5 Flash.
- **Thinking carries over.** Gemini's own replies are kept within a turn, so its reasoning carries from round to round.
- **Memory.** Earlier turns of the chat are sent as plain text, up to the last 24 messages.
- **Opening turn.** If the chat would otherwise begin with Bea, the server adds this as the owner's first message:
  `(The owner has just opened the chat.)`

The opening line ("Hi, I'm Bea! Lovely to meet you…") and its team-size chips are written in the browser, not by
Gemini, so the chat appears instantly.

### 4.3 The check-up chat

**Purpose:** step 1 of the app, a relaxed chat that fills in the same café profile as the quick form. It asks about
one thing at a time, then suggests 2–4 tools with a reason each. The owner accepts ("Brew my plan with these ✨") or
picks for themselves.

**How it works:**

- The system instruction is rebuilt every turn, with what Bea knows so far and what's still missing.
- Each time the owner says something useful, she records it with `set_profile`. The profile card beside the chat
  ("your café recipe") fills in as she does.
- Once nothing is missing, she:
  - looks up the best-fitting tools (`recommend_tools`);
  - prices her picks with our formulas (`estimate`);
  - suggests them (`propose_shortlist`).

**Settings:** temperature 0.8, up to 1,400 output tokens per round, minimal thinking.

#### System instruction

```text
{PERSONA, from 4.1}

YOUR JOB RIGHT NOW: a relaxed check-up to get to know their café, then suggest a small team of tools.
WHAT YOU KNOW SO FAR:
name: {name, or "(not yet)"}
employees: {e.g. 3-5 (3–5), or "(not yet)"}
revenue: {…}
cafeType: {…}
goal: {…}
pains: {…}
tech: {…}
rant (their words): {"…", or "(not yet, optional)"}
STILL NEEDED: {the missing fields, or "nothing: you have enough to suggest tools"}

HOW TO WORK (always through functions):
- Whenever the owner tells you something useful, call set_profile with it in the same turn, using these exact ids:
  employees: 1-2 = "1–2", 3-5 = "3–5", 6-15 = "6–15", 16+ = "16+"
  revenue: under250 = "Under $250k", 250-500 = "$250k – $500k", 500-1m = "$500k – $1M", 1m+ = "$1M +", unsure = "Rather not say"
  cafeType: specialty = "Specialty café", bakery = "Bakery-café", drive = "Drive-thru / takeaway", franchise = "Franchise-style"
  goal: hours = "Win back my evenings", revenue = "Grow daily sales & covers", waste = "Cut food & stock waste", speed = "Smoother morning rushes"
  pains: admin = "Too much paperwork", waste = "Wasted food & stock", quiet = "Quiet days / few new faces", queues = "Long queues at the rush", staff = "Rostering headaches", reviews = "Customer questions & reviews"
  tech: 1 = "Tech-shy", 2 = "Getting by", 3 = "Comfortable", 4 = "Tech-savvy"
  Put their biggest headache, in their own words, in rant. One message can fill several fields.
- Then call say with your next message: react warmly to what they said in a few words, then ask about ONE still-needed thing.
  Offer quickReplies using the labels above (for pains set multiSelect true and add "That's about it").
  Ask about sales gently ("a ballpark is fine, or skip it").
- You may ask one short follow-up when an answer is vague or interesting, but keep the whole chat to about 8 questions.
- When nothing is still needed: call recommend_tools, then estimate for the 2–4 tools you would pick (fewer for tech-shy owners,
  keep the bill sensible for small cafés), then propose_shortlist with a reason for each that echoes what they told you.
- If they ask you something, answer briefly and honestly, then carry on. Never invent tools or prices.
```

The option lists come straight from the quick form's answers (`src/data/mockDashboard.js`), so the chat and the form
always fill in the same profile.

#### Her functions in the check-up

| Function | Description Gemini sees | What our code does |
| --- | --- | --- |
| `set_profile` | Record what the owner has told you about their café. Only include fields you learned; use the exact ids. | Cleans the values against the allowed options, saves them, and replies with what's still needed |
| `recommend_tools` | Look up which of the 12 Brewmind tools best fit this café, best first, using our matching rules. | Runs the matching rules and returns the 7 best fits, with job, price and hours back |
| `estimate` | Work out the monthly bill, hours back and likely monthly gain for a set of tools, using our formulas. | Our formulas: bill, hours back, likely gain, payback, overlaps |
| `propose_shortlist` *(ends turn)* | Suggest 2–4 tools for this café. The owner sees them with your reasons and decides. This ends your turn. | Keeps only real tool ids and prices the shortlist with our formulas, then shows the card |
| `say` *(ends turn)* | Send your next chat message to the owner. This ends your turn. | Shows her note, with up to 6 tap-to-answer chips |

Parameter descriptions Gemini also sees include:

- `rant`: "their biggest headache in their own words (keep their wording, max 2 sentences)";
- each shortlist `reason`: "max 16 words, refers to what they told you";
- `quickReplies`: "0–6 short tap-to-answer options (max 5 words each)".

### 4.4 "Ask Bea" on the plan

**Purpose:** a drawer on the plan page where the owner asks for changes in their own words, or taps "Get it under $X a
month", "Do I need all of these?", "Plan my setup around my week" or "Explain my numbers". Bea can compare tools,
explain a number, propose a different set of tools, or propose a setup timetable. Nothing changes until the owner
presses Accept, and a tool change can be undone for 10 seconds.

**How it works:** the system instruction includes the café, the current plan and our own numbers for it. The budget
rule ("strictly within it") was added after testing: Bea once offered exactly $200 when asked for "under $200".

**Settings:** temperature 0.55 (lower than the check-up, for careful, accurate proposals), up to 1,400 output tokens per
round, minimal thinking.

#### System instruction

```text
{PERSONA, from 4.1}

YOUR JOB RIGHT NOW: you are sitting beside the owner on their Brewmind plan page, helping them fine-tune it.
You can look things up and PROPOSE changes; nothing changes unless the owner presses Accept.
THEIR CAFÉ:
{the same profile lines as the check-up}
THEIR PLAN: {id (name, price); …, or "no tools yet"}
Monthly bill about ${bill}. About {hours} hrs a week back ({own hours} of them the owner's own).
Likely monthly gain: {range}. Payback: {about N months, or "n/a"}. {Overlap: …, if two tools overlap}

HOW TO WORK (always through functions):
- To change which tools are in the plan (cheaper, simpler, something new), check options with estimate, list_tools or
  compare_tools as needed, then call propose_tool_change with tool ids. Explain the trade-off honestly in the message.
- When they give a budget, check candidate sets with estimate and only propose one that is strictly within it
  ("under $200" means less than $200). If nothing sensible fits, say so kindly and offer the closest option.
- To plan when they'll set things up, call propose_schedule with their free days (ask first if you don't know them).
- To compare tools, use compare_tools; to explain a number, use explain_numbers; then answer with say.
- Finish every turn with say or a propose_ function. Keep it short. Never invent tools, prices or numbers.
```

#### Her functions on the plan

| Function | Description Gemini sees | What our code does |
| --- | --- | --- |
| `estimate` | Work out the monthly bill, hours back and likely monthly gain for any set of tools, using our formulas. | Our formulas for any set of tools |
| `list_tools` | All 12 Brewmind tools with their job, price and fit for this café (inPlan marks the ones already chosen). | Returns all 12, with which are in the plan and how well each fits |
| `compare_tools` | Look up the details of 1–3 tools side by side: price, plan, trial, pros, cons, what they won’t do, and their real risks. | Returns those details, including each tool's risks, from `src/data/products.js` |
| `explain_numbers` | Get the working behind one of the plan’s numbers. (`topic`: hours, money or payback) | Returns the same working the plan page shows |
| `propose_tool_change` *(ends turn)* | Propose adding and/or removing tools. The owner sees the before-and-after and decides. This ends your turn. | Checks the change (see 4.5), recalculates before and after with our formulas, and shows the change card |
| `propose_schedule` *(ends turn)* | Plan setup sessions for the tools in the plan around the owner’s free days. The owner sees it and decides. This ends your turn. | Builds the timetable itself: Week 1 tools first, only on the free days given, no session longer than they can spare |
| `say` *(ends turn)* | Send your next chat message to the owner. This ends your turn. Use this for answers that don’t change the plan. | Shows her note and any chips |

The `propose_tool_change` message parameter carries its own guidance: "1–2 sentences, worded as a suggestion,
describing exactly this add/remove and the trade-off (e.g. "How about swapping MarketMan for Ordermentum? It’s free and
still sorts your ordering.")".

### 4.5 What our server says back to Bea

Some function results are instructions in their own right. When a proposal fails a check, the server refuses it and
tells Gemini why, so she can fix it on her next round. The owner never sees the mistake.

| Situation | Message returned to Gemini |
| --- | --- |
| Her message names a tool the change doesn't add | `Your message mentions {tool}, which this change doesn't add. Add it to "add", or reword the message to match exactly what you propose.` |
| A change with nothing in it | `add or remove at least one tool (use ids)` |
| A change that would empty the plan | `the plan needs at least one tool` |
| A schedule with no usable days | `give at least one free day (Mon–Sun) and make sure the plan has tools` |
| Pricing made-up tool ids | `use tool ids from recommend_tools` (check-up) / `no valid tool ids` (plan) |
| A shortlist with no real tools | `propose at least one tool id from recommend_tools` |
| A function that doesn't exist | `unknown function {name}` |

One more safety net: if a proposal's wording slips into the past tense ("I've swapped…"), the server rewrites it as a
suggestion ("I'd swap…") before the owner sees it.

---

## 5. Settings and limits at a glance

| Call | Temperature | Max output tokens | Time limit | Daily cap per account |
| --- | --- | --- | --- | --- |
| Live café moment | 0.9 | 1,100 | 9 s | 400 clicked curveballs + 400 background moments |
| Personalised plan | 0.7 | 3,200 | 15 s | 60 brews |
| Bea, check-up | 0.8 | 1,400 per round | 14 s per round, max 5 rounds | 400 replies, shared with Ask Bea |
| Bea, Ask Bea | 0.55 | 1,400 per round | 14 s per round, max 5 rounds | (shared) |

Thinking is pinned to **minimal** on Gemini 3 Flash and **off** on Gemini 2.5 Flash. In testing, a higher thinking
setting spent the whole output budget on reasoning and cut the JSON short.

## 6. Changing a prompt

- **Edit the right file.** The café and the plan are in `server/gemini.js`; Bea is in `server/bea.js`. Restart the
  server (`npm run dev:all`) to pick up the change.
- **Keep the rules in code too.** Anything that must never happen (acting without the owner's yes, made-up prices,
  wrong tool ids) is enforced by the server as well as asked for in the prompt. If you add a rule to a prompt that
  really matters, add a check in code to back it up.
- **Test it live** in the app. The server log shows every call: Bea logs a line such as
  `[bea] gemini-3-flash-preview ✓ 3 rounds 5010ms` for each turn, and the café and plan log `[gemini] … ✓ …ms`.
  If a call failed and the hand-written fallback was used instead, a warning appears instead.
- **Watch the voice.** New wording should still pass the `VOICE` rules: no "AI", no jargon, Australian spelling.
