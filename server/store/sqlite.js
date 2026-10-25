import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const here = path.dirname(fileURLToPath(import.meta.url))

const parse = (s, fallback) => {
  try { return s ? JSON.parse(s) : fallback } catch { return fallback }
}

/** Accounts and plans in a local SQLite file (local dev and `npm start`). */
export function openSqlite() {
  const dataDir = process.env.BREWMIND_DATA_DIR || path.join(here, '..', 'data')
  fs.mkdirSync(dataDir, { recursive: true })

  const db = new Database(path.join(dataDir, 'brewmind.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      cafe_name     TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_plans (
      user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      survey_json         TEXT NOT NULL DEFAULT '{}',
      selected_tools_json TEXT NOT NULL DEFAULT '[]',
      gemini_plan_json    TEXT,
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  // added for Bea's chats; older databases get the column on first start
  if (!db.prepare('PRAGMA table_info(user_plans)').all().some((c) => c.name === 'chat_json')) {
    db.exec('ALTER TABLE user_plans ADD COLUMN chat_json TEXT')
  }

  const q = {
    insertUser: db.prepare('INSERT INTO users (username, email, password_hash, cafe_name) VALUES (?, ?, ?, ?)'),
    insertPlan: db.prepare('INSERT INTO user_plans (user_id, survey_json, selected_tools_json) VALUES (?, ?, ?)'),
    byId: db.prepare('SELECT * FROM users WHERE id = ?'),
    byLogin: db.prepare('SELECT * FROM users WHERE username = ? OR email = ?'),
    exists: db.prepare('SELECT username, email FROM users WHERE username = ? OR email = ?'),
    plan: db.prepare('SELECT * FROM user_plans WHERE user_id = ?'),
    upsertPlan: db.prepare(`
      INSERT INTO user_plans (user_id, survey_json, selected_tools_json, gemini_plan_json, chat_json, updated_at)
      VALUES (@user_id, @survey_json, @selected_tools_json, @gemini_plan_json, @chat_json, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        survey_json = excluded.survey_json,
        selected_tools_json = excluded.selected_tools_json,
        gemini_plan_json = excluded.gemini_plan_json,
        chat_json = excluded.chat_json,
        updated_at = datetime('now')
    `),
  }

  function planFor(userId) {
    const row = q.plan.get(userId)
    if (!row) return { survey: null, selected: [], geminiPlan: null, chat: null, updatedAt: null }
    return {
      survey: parse(row.survey_json, null),
      selected: parse(row.selected_tools_json, []),
      geminiPlan: parse(row.gemini_plan_json, null),
      chat: parse(row.chat_json, null),
      updatedAt: row.updated_at,
    }
  }

  const createUser = db.transaction(({ username, email, passwordHash, cafeName, survey }) => {
    const info = q.insertUser.run(username, email, passwordHash, cafeName)
    q.insertPlan.run(info.lastInsertRowid, JSON.stringify(survey), '[]')
    return q.byId.get(info.lastInsertRowid)
  })

  function savePlan(userId, { survey, selected, geminiPlan, chat }) {
    const current = planFor(userId)
    const next = {
      survey: survey !== undefined ? survey : current.survey,
      selected: selected !== undefined ? selected : current.selected,
      geminiPlan: geminiPlan !== undefined ? geminiPlan : current.geminiPlan,
      chat: chat !== undefined ? chat : current.chat,
    }
    q.upsertPlan.run({
      user_id: userId,
      survey_json: JSON.stringify(next.survey ?? {}),
      selected_tools_json: JSON.stringify(next.selected ?? []),
      gemini_plan_json: next.geminiPlan == null ? null : JSON.stringify(next.geminiPlan),
      chat_json: next.chat == null ? null : JSON.stringify(next.chat),
    })
    return planFor(userId)
  }

  return {
    kind: 'sqlite',
    createUser,
    findUserById: (id) => q.byId.get(id),
    findUserByLogin: (login) => q.byLogin.get(login, login),
    findConflict: (username, email) => q.exists.get(username, email),
    planFor,
    savePlan,
  }
}
