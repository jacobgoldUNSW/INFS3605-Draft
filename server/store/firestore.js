import crypto from 'node:crypto'

// usernames and emails are looked up case-insensitively, through index documents keyed by a hash
// (a raw email can contain characters a document id can't)
const key = (s) => crypto.createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex')
const parse = (s, fallback) => {
  try { return s ? JSON.parse(s) : fallback } catch { return fallback }
}
// the same text format SQLite's datetime('now') gives, so both stores look alike to the app
const nowText = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

/**
 * Accounts and plans in Cloud Firestore (the hosted build), with the same shape as the SQLite store.
 * users/{uid} · plans/{uid} · usernames/{hash} → { uid } · emails/{hash} → { uid }
 * Plans are kept as JSON text, as in SQLite, so any shape of Gemini plan stores safely.
 */
export function firestoreStore(db) {
  const users = db.collection('users')
  const plans = db.collection('plans')
  const usernames = db.collection('usernames')
  const emails = db.collection('emails')
  const row = (snap) => (snap.exists ? { id: snap.id, ...snap.data() } : undefined)

  async function uidFor(index, value) {
    if (!value) return null
    const snap = await index.doc(key(value)).get()
    return snap.exists ? snap.data().uid : null
  }

  async function findUserById(id) {
    if (typeof id !== 'string' || !id || id.includes('/')) return undefined
    return row(await users.doc(id).get())
  }

  async function findUserByLogin(login) {
    const uid = (await uidFor(usernames, login)) || (await uidFor(emails, login))
    return uid ? findUserById(uid) : undefined
  }

  async function findConflict(username, email) {
    const uid = (await uidFor(usernames, username)) || (await uidFor(emails, email))
    if (!uid) return undefined
    const u = await findUserById(uid)
    return u && { username: u.username, email: u.email }
  }

  async function createUser({ username, email, passwordHash, cafeName, survey }) {
    const ref = users.doc()
    const created_at = nowText()
    const user = { username, email, password_hash: passwordHash, cafe_name: cafeName, created_at }
    await db.runTransaction(async (tx) => {
      const uRef = usernames.doc(key(username))
      const eRef = emails.doc(key(email))
      const [u, e] = await Promise.all([tx.get(uRef), tx.get(eRef)])
      if (u.exists || e.exists) throw Object.assign(new Error('That username or email was just taken — try another.'), { status: 409 })
      tx.create(uRef, { uid: ref.id })
      tx.create(eRef, { uid: ref.id })
      tx.create(ref, user)
      tx.create(plans.doc(ref.id), { survey_json: JSON.stringify(survey), selected_tools_json: '[]', gemini_plan_json: null, updated_at: created_at })
    })
    return { id: ref.id, ...user }
  }

  async function planFor(userId) {
    const snap = await plans.doc(String(userId)).get()
    if (!snap.exists) return { survey: null, selected: [], geminiPlan: null, chat: null, updatedAt: null }
    const r = snap.data()
    return {
      survey: parse(r.survey_json, null),
      selected: parse(r.selected_tools_json, []),
      geminiPlan: parse(r.gemini_plan_json, null),
      chat: parse(r.chat_json, null),
      updatedAt: r.updated_at,
    }
  }

  async function savePlan(userId, { survey, selected, geminiPlan, chat }) {
    const current = await planFor(userId)
    const next = {
      survey: survey !== undefined ? survey : current.survey,
      selected: selected !== undefined ? selected : current.selected,
      geminiPlan: geminiPlan !== undefined ? geminiPlan : current.geminiPlan,
      chat: chat !== undefined ? chat : current.chat,
    }
    await plans.doc(String(userId)).set({
      survey_json: JSON.stringify(next.survey ?? {}),
      selected_tools_json: JSON.stringify(next.selected ?? []),
      gemini_plan_json: next.geminiPlan == null ? null : JSON.stringify(next.geminiPlan),
      chat_json: next.chat == null ? null : JSON.stringify(next.chat),
      updated_at: nowText(),
    })
    return planFor(userId)
  }

  return { kind: 'firestore', createUser, findUserById, findUserByLogin, findConflict, planFor, savePlan }
}

/** Connects with the server's own Google credentials (on Cloud Run, its service account). */
export async function openFirestore() {
  const { initializeApp, getApps } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')
  if (!getApps().length) initializeApp()
  return firestoreStore(getFirestore())
}
