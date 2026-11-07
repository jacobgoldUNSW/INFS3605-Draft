// Copies the API's source into the hosted Cloud Run function (jacobgold.me/brewmind-api) before a deploy.
// This project stays the one place you edit: this copies exactly what server/app.js imports, nothing else.
//   node tools/deploy/sync_api.mjs [target folder]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const TARGET = path.resolve(process.argv[2] || path.join(ROOT, '..', '..', '..', 'jacobgold.me', 'brewmind-api'))

if (!fs.existsSync(path.join(TARGET, 'package.json'))) {
  console.error(`No function project at ${TARGET} (expected its package.json). Pass the folder as an argument.`)
  process.exit(1)
}

// follow relative imports from the server's entry, so new files come along by themselves
const files = new Set()
const queue = [path.join(ROOT, 'server', 'app.js')]
const re = /(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g
while (queue.length) {
  const file = queue.shift()
  if (files.has(file)) continue
  files.add(file)
  for (const m of fs.readFileSync(file, 'utf8').matchAll(re)) {
    let p = path.resolve(path.dirname(file), m[1] || m[2])
    if (!fs.existsSync(p) && fs.existsSync(`${p}.js`)) p += '.js'
    queue.push(p)
  }
}

// start clean, so a file deleted here doesn't linger in the function
for (const dir of ['server', 'shared', 'src']) fs.rmSync(path.join(TARGET, dir), { recursive: true, force: true })
for (const file of files) {
  const rel = path.relative(ROOT, file)
  if (rel.startsWith('..')) throw new Error(`refusing to copy a file outside Cafinity: ${file}`)
  const dest = path.join(TARGET, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(file, dest)
}
console.log(`Synced ${files.size} API files to ${TARGET}`)
