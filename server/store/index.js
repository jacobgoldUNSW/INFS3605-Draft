/**
 * Where accounts and plans live. SQLite on your own computer; Firestore when BREWMIND_STORE=firestore
 * (the hosted build, where the server's disk is wiped whenever it goes idle).
 * Each store's functions may return a value or a promise, so callers always await them.
 */
export async function openStore(kind = process.env.BREWMIND_STORE || 'sqlite') {
  if (kind === 'firestore') return (await import('./firestore.js')).openFirestore()
  return (await import('./sqlite.js')).openSqlite()
}

export function publicUser(u) {
  return u && { id: u.id, username: u.username, email: u.email, cafeName: u.cafe_name, createdAt: u.created_at }
}
