// Canvas renderer: ground → shadows → Y-sorted props & people → light → lofi film.
//
// Lighting ("option C"): the scene is multiplied by a light map (ambient colour per room + real
// light sources: sun pools through the north windows, pendants, lamps, desk lamps, screens,
// candles), brightened where the light falls, and finished with haze, bloom, warm bokeh,
// tilt-shift edges, a plum/honey grade and grain. Everything follows a 6-minute café day.
// Every object and person casts a soft shadow that swings and lengthens with the sun.
import { MAP, T, WORLD_W, WORLD_H, ANIM_FPS, UI, charFrame, isSitting } from './assets'
import { drawPixelText, wrapPixelText, textWidth } from './font3x5'

const OBJECTS = MAP.objects
const CRATE = OBJECTS.find((o) => o.n === 'crateA')
const LIGHTS = MAP.lights || { pendants: [], lamps: [], glows: [], candles: [] }
const ZONES = MAP.zones || { street: [0, 0, WORLD_W, 96], front: [0, 96, 656, WORLD_H], back: [668, 96, WORLD_W, WORLD_H] }
const SIT_DY = -4
const rainState = new WeakMap()

// a bright, readable outline per AI worker, in their tool's brand colour
export const OUTLINE = {
  copilot: '#7b8bff', xero: '#29c4f2', dext: '#ff7a3d', deputy: '#4d97ff', square: '#c2cede', lightspeed: '#ff5a62',
  marketman: '#ffbb33', ordermentum: '#2ad1b5', canva: '#bd78ff', podium: '#8a83ff', slang: '#ff6e8a', mailchimp: '#ffd84d',
}

// ------------------------------------------------------------------ the café day
// phase 0 = 9:30 am … 0.62 golden hour … 0.86 cosy close … 0.95→1 eases back to morning
const KEYS = [
  { p: 0.00, amb: [1.0, 0.975, 0.94], street: [1.04, 1.03, 1.0], back: [0.84, 0.87, 0.96], pool: [1.0, 0.93, 0.8], poolK: 0.3, len: 120, sx: -0.42, sy: 0.36, lamps: 0.0, shadow: 0.3, bokeh: 0.35, warm: 0.08 },
  { p: 0.30, amb: [1.0, 0.98, 0.94], street: [1.06, 1.04, 1.0], back: [0.84, 0.86, 0.95], pool: [1.0, 0.95, 0.84], poolK: 0.26, len: 90, sx: 0.05, sy: 0.26, lamps: 0.0, shadow: 0.26, bokeh: 0.3, warm: 0.07 },
  { p: 0.62, amb: [0.9, 0.79, 0.67], street: [1.08, 0.94, 0.78], back: [0.66, 0.66, 0.78], pool: [1.0, 0.75, 0.45], poolK: 0.5, len: 170, sx: 0.8, sy: 0.52, lamps: 0.7, shadow: 0.36, bokeh: 0.85, warm: 0.16 },
  { p: 0.86, amb: [0.8, 0.69, 0.61], street: [1.0, 0.82, 0.66], back: [0.58, 0.58, 0.72], pool: [1.0, 0.66, 0.38], poolK: 0.55, len: 210, sx: 1.15, sy: 0.68, lamps: 1.0, shadow: 0.38, bokeh: 1.0, warm: 0.18 },
  { p: 0.95, amb: [0.8, 0.69, 0.61], street: [1.0, 0.82, 0.66], back: [0.58, 0.58, 0.72], pool: [1.0, 0.66, 0.38], poolK: 0.55, len: 210, sx: 1.15, sy: 0.68, lamps: 1.0, shadow: 0.38, bokeh: 1.0, warm: 0.18 },
  { p: 1.00, amb: [1.0, 0.975, 0.94], street: [1.04, 1.03, 1.0], back: [0.84, 0.87, 0.96], pool: [1.0, 0.93, 0.8], poolK: 0.3, len: 120, sx: -0.42, sy: 0.36, lamps: 0.0, shadow: 0.3, bokeh: 0.35, warm: 0.08 },
]
const lerp = (a, b, k) => a + (b - a) * k
const mix = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : lerp(a, b, k))
const smooth = (k) => k * k * (3 - 2 * k)

export function lightAt(phase, rain = 0) {
  let i = 0
  while (i < KEYS.length - 2 && phase > KEYS[i + 1].p) i++
  const A = KEYS[i]
  const B = KEYS[i + 1]
  const k = smooth(Math.max(0, Math.min(1, (phase - A.p) / (B.p - A.p || 1))))
  const L = {}
  for (const key of Object.keys(A)) if (key !== 'p') L[key] = mix(A[key], B[key], k)
  if (rain > 0) {
    const r = rain
    L.amb = L.amb.map((v, j) => v * (1 - r * [0.16, 0.13, 0.06][j]))
    L.street = L.street.map((v, j) => v * (1 - r * [0.3, 0.25, 0.12][j]))
    L.back = L.back.map((v) => v * (1 - r * 0.06))
    L.poolK *= 1 - r * 0.85
    L.shadow *= 1 - r * 0.75
    L.lamps = Math.max(L.lamps, 0.75 * r)
    L.bokeh *= 1 - r * 0.4
  }
  return L
}

// ------------------------------------------------------------------ small canvas helpers
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c }
const rgb = (c, a = 1) => `rgba(${Math.round(Math.min(1, c[0]) * 255)}, ${Math.round(Math.min(1, c[1]) * 255)}, ${Math.round(Math.min(1, c[2]) * 255)}, ${a})`
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})` }

/** per-image-set caches: silhouette atlas, scratch canvases, the baked static shadows */
const caches = new WeakMap()
function cacheFor(img) {
  let c = caches.get(img)
  if (c) return c
  const sil = mk(img.objects.width, img.objects.height)
  const sx = sil.getContext('2d')
  sx.drawImage(img.objects, 0, 0)
  sx.globalCompositeOperation = 'source-in'
  sx.fillStyle = '#000'
  sx.fillRect(0, 0, sil.width, sil.height)
  const frame = mk(34, 66)
  c = {
    sil,
    frame, fctx: frame.getContext('2d'),
    // shadows live at half resolution: upscaling them is the (free) soft blur
    shadow: mk(WORLD_W / 2, WORLD_H / 2), staticShadow: mk(WORLD_W / 2, WORLD_H / 2), staticKey: '',
    glow: mk(WORLD_W / 2, WORLD_H / 2), light: mk(WORLD_W / 2, WORLD_H / 2), bloom: mk(WORLD_W / 8, WORLD_H / 8),
    grain: null, bokeh: {}, blur: null, bandTop: null, bandBot: null, gradeKey: '', gradeMul: null, gradeScr: null,
  }
  caches.set(img, c)
  return c
}

function fx(ctx, img, rect, x, y) {
  const [sx, sy, w, h] = rect
  ctx.drawImage(img, sx, sy, w, h, Math.round(x), Math.round(y), w, h)
}

/** draw a sprite's silhouette as a shadow cast away from the sun (affine shear around its base) */
function castShadow(sctx, src, sx, sy, w, h, x0, y0, base, L, s = 1) {
  const k = base - y0
  sctx.setTransform(s, 0, -L.sx * s, -L.sy * s, (x0 + k * L.sx) * s, (base + k * L.sy) * s)
  sctx.drawImage(src, sx, sy, w, h, 0, 0, w, h)
}

function bakeStaticShadows(c, img, L) {
  const key = `${L.sx.toFixed(2)}|${L.sy.toFixed(2)}`
  if (key === c.staticKey) return
  c.staticKey = key
  const s = c.staticShadow.getContext('2d')
  s.setTransform(1, 0, 0, 1, 0, 0)
  s.clearRect(0, 0, WORLD_W, WORLD_H)
  for (const o of OBJECTS) {
    if (o.ns) continue
    const [ax, ay, aw, ah] = o.a
    castShadow(s, c.sil, ax, ay, aw, ah, o.x, o.y, o.y + ah, L, 0.5)
  }
  s.setTransform(1, 0, 0, 1, 0, 0)
}

function actorFrameInto(c, img, a) {
  const fps = ANIM_FPS[a.anim] || 5
  const f = Math.floor(a.animT * fps)
  const [sx, sy] = charFrame(a.sprite, a.anim, a.dir, f)
  c.fctx.globalCompositeOperation = 'source-over'
  c.fctx.clearRect(0, 0, 34, 66)
  c.fctx.drawImage(img.chars, sx, sy, 32, 64, 1, 1, 32, 64)
  return [sx, sy]
}

function drawShadows(ctx, world, img, c, L, quality) {
  bakeStaticShadows(c, img, L)
  const s = c.shadow.getContext('2d')
  s.setTransform(1, 0, 0, 1, 0, 0)
  s.globalCompositeOperation = 'source-over'
  s.clearRect(0, 0, c.shadow.width, c.shadow.height)
  s.drawImage(c.staticShadow, 0, 0)
  if (quality !== 'minimal') {
    for (const a of world.actors.values()) {
      if (isSitting(a.anim) || (a.alpha ?? 1) < 0.5 || a.y < 8) continue
      actorFrameInto(c, img, a)
      c.fctx.globalCompositeOperation = 'source-in'
      c.fctx.fillStyle = '#000'
      c.fctx.fillRect(0, 0, 34, 66)
      const x0 = Math.round(a.x - 16) - 1
      const y0 = Math.round(a.y - 60) - 1
      castShadow(s, c.frame, 0, 0, 34, 66, x0, y0, a.y, L, 0.5)
    }
  }
  s.setTransform(1, 0, 0, 1, 0, 0)
  // only floors take shadows: the street and the café / back-office floor (never the wall faces)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 16, WORLD_W, 3 * T - 18)
  ctx.rect(2, 5 * T - 18, WORLD_W - 4, WORLD_H - 5 * T + 6)
  ctx.clip()
  ctx.globalAlpha = L.shadow
  ctx.imageSmoothingEnabled = true
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(c.shadow, 0, 0, WORLD_W, WORLD_H)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawOutline(ctx, c, a, color, strength) {
  // tint the current frame (already in c.frame) and stamp it around the sprite
  c.fctx.globalCompositeOperation = 'source-in'
  c.fctx.fillStyle = color
  c.fctx.fillRect(0, 0, 34, 66)
  const x = Math.round(a.x - 16) - 1
  const y = Math.round(a.y - 60 + (isSitting(a.anim) ? SIT_DY : 0) + (a.bobY || 0)) - 1
  ctx.globalAlpha = 0.28 * strength
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.drawImage(c.frame, x + dx, y + dy)
  ctx.globalAlpha = 0.95 * Math.min(1, strength)
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(c.frame, x + dx, y + dy)
  ctx.globalAlpha = 1
}

function drawActor(ctx, img, a, t, c, world) {
  const fps = ANIM_FPS[a.anim] || 5
  const f = Math.floor(a.animT * fps)
  const [sx, sy] = charFrame(a.sprite, a.anim, a.dir, f)
  const sit = isSitting(a.anim)
  a.bobY = a.bob && Math.floor(t * 4 + a.x) % 2 ? -1 : 0
  const x = Math.round(a.x - 16)
  const y = Math.round(a.y - 60 + (sit ? SIT_DY : 0) + a.bobY)
  ctx.globalAlpha = a.alpha ?? 1
  if (!sit) {
    ctx.fillStyle = 'rgba(42, 23, 14, 0.2)'
    ctx.beginPath()
    ctx.ellipse(a.x, a.y - 1, 8, 2.8, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // AI workers get a soft brand-coloured outline so you can always spot them
  if (a.kind === 'worker' && OUTLINE[a.id] && (a.alpha ?? 1) > 0.5) {
    const needs = world.approvalFor?.(a.id)
    const hot = world.highlightId === a.id
    const pulse = needs || hot ? 0.75 + 0.5 * (0.5 + 0.5 * Math.sin(t * 6)) : 0.85
    c.fctx.globalCompositeOperation = 'source-over'
    c.fctx.clearRect(0, 0, 34, 66)
    c.fctx.drawImage(img.chars, sx, sy, 32, 64, 1, 1, 32, 64)
    drawOutline(ctx, c, a, OUTLINE[a.id], hot ? 1.5 : pulse)
    ctx.globalAlpha = a.alpha ?? 1
  }
  ctx.drawImage(img.chars, sx, sy, 32, 64, x, y, 32, 64)
  ctx.globalAlpha = 1
}

function drawAframe(ctx, world) {
  const a = world.aframe
  if (!a.text) return
  const [bx, by, bw, bh] = MAP.aframeBoard
  const age = world.t - a.since
  ctx.fillStyle = '#2f5a45'
  ctx.fillRect(bx, by, bw, bh)
  const lines = wrapPixelText(a.text, Math.floor((bw - 2) / 4), 2)
  const colors = ['#FFE08A', '#F4EFE0']
  lines.forEach((ln, i) => {
    const w = textWidth(ln)
    drawPixelText(ctx, bx + Math.max(1, (bw - w) / 2), by + 3 + i * 7, ln, colors[i % 2])
  })
  if (age < 2.4) {
    ctx.fillStyle = `rgba(255, 240, 180, ${1 - age / 2.4})`
    for (let i = 0; i < 6; i++) {
      const ang = i + age * 3
      ctx.fillRect(Math.round(bx + bw / 2 + Math.cos(ang) * (bw / 2 + 4)), Math.round(by + bh / 2 + Math.sin(ang) * (bh / 2 + 4)), 2, 2)
    }
  }
}

/** the café's own name on a timber sign over the front door */
function drawSign(ctx, world) {
  const s = MAP.sign
  if (!s) return
  const name = String(world.opts.cafeName || 'café').toUpperCase().replace(/[^A-Z0-9 .$-]/g, '').slice(0, 18) || 'CAFE'
  const w = Math.max(30, textWidth(name) + 10)
  const x = Math.round(s.x - w / 2)
  const y = s.y
  ctx.fillStyle = '#3a3a50'
  ctx.fillRect(x - 1, y - 1, w + 2, 11)
  ctx.fillStyle = '#7a4a2a'
  ctx.fillRect(x, y, w, 9)
  ctx.fillStyle = '#9a6238'
  ctx.fillRect(x, y, w, 2)
  drawPixelText(ctx, x + Math.round((w - textWidth(name)) / 2), y + 2, name, '#ffe3a6')
}

function drawPhoneRing(ctx, world) {
  if (!world.phone.ringing) return
  const [x, y] = MAP.phone || [17 * T + 16, 3 * T + 26]
  const on = Math.floor(world.t * 6) % 2
  ctx.strokeStyle = '#C85A24'
  ctx.lineWidth = 1
  for (let i = 0; i < 2; i++) {
    const r = 7 + i * 4 + on
    ctx.beginPath(); ctx.arc(x, y - 4, r, -0.9, -0.2); ctx.stroke()
    ctx.beginPath(); ctx.arc(x, y - 4, r, Math.PI + 0.2, Math.PI + 0.9); ctx.stroke()
  }
}

function drawCandles(ctx, world, L) {
  if (L.lamps < 0.22) return
  const t = world.t
  const k = Math.min(1, (L.lamps - 0.22) / 0.3)
  for (const [x, y] of LIGHTS.candles || []) {
    ctx.globalAlpha = k
    ctx.fillStyle = '#3a3a50'
    ctx.fillRect(x - 2, y - 6, 5, 7)
    ctx.fillStyle = '#fbf3e3'
    ctx.fillRect(x - 1, y - 5, 3, 5)
    const fl = Math.sin(t * 11 + x) > 0.2 ? 1 : 0
    ctx.fillStyle = '#ffb347'
    ctx.fillRect(x, y - 8 - fl, 1, 2)
    ctx.fillStyle = '#fff1a8'
    ctx.fillRect(x, y - 7, 1, 1)
  }
  ctx.globalAlpha = 1
}

// ------------------------------------------------------------------ light
function windowPools(ctx, L, k = 1) {
  for (const [x, y, w, h] of MAP.windows) {
    if (x >= ZONES.back[0]) continue
    const top = 5 * T - 2
    const len = L.len
    const dx = L.sx * len * 0.9
    const g = ctx.createLinearGradient(0, top, 0, top + len)
    g.addColorStop(0, rgb(L.pool, L.poolK * k))
    g.addColorStop(1, rgb(L.pool, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x + 2, top)
    ctx.lineTo(x + w - 2, top)
    ctx.lineTo(x + w - 2 + dx, top + len)
    ctx.lineTo(x + 2 + dx, top + len)
    ctx.closePath()
    ctx.fill()
    // the glass itself glows
    ctx.fillStyle = rgb(L.pool, 0.38 * k)
    ctx.fillRect(x + 4, y + 4, w - 8, h - 10)
  }
  // daylight spilling in at the front door
  const d = MAP.door
  const dg = ctx.createLinearGradient(0, 5 * T, 0, 5 * T + 70)
  dg.addColorStop(0, rgb(L.pool, 0.2 * k))
  dg.addColorStop(1, rgb(L.pool, 0))
  ctx.fillStyle = dg
  ctx.beginPath()
  ctx.moveTo(d.x, 5 * T)
  ctx.lineTo(d.x + 64, 5 * T)
  ctx.lineTo(d.x + 64 + L.sx * 60, 5 * T + 70)
  ctx.lineTo(d.x + L.sx * 60, 5 * T + 70)
  ctx.closePath()
  ctx.fill()
}

function radial(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, hexA(color, a))
  g.addColorStop(0.45, hexA(color, a * 0.45))
  g.addColorStop(1, hexA(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function lampLights(ctx, world, L) {
  const flick = (x) => 0.94 + 0.06 * Math.sin(world.t * 7.3 + x * 0.37)
  for (const [x, y] of LIGHTS.pendants || []) radial(ctx, x, y, 62, '#ffb067', 0.5 * L.lamps * flick(x))
  for (const [x, y, s = 1] of LIGHTS.lamps || []) {
    const back = x >= ZONES.back[0]
    const k = back ? Math.max(L.lamps, 0.5) : L.lamps
    radial(ctx, x, y + 8, back ? 56 : 70, '#ffb36b', 0.62 * k * s * flick(x))
  }
  for (const [x, y] of LIGHTS.candles || []) if (L.lamps > 0.22) radial(ctx, x, y - 6, 30, '#ffa552', 0.55 * Math.min(1, L.lamps) * flick(x * 3))
  for (const [x, y, r, col] of LIGHTS.glows || []) radial(ctx, x, y, r, col, 0.28)
}

function sunShafts(g, L) {
  // a hint of haze in the sunbeams, from each window down across the floor
  for (const [x, y, w] of MAP.windows) {
    if (x >= ZONES.back[0]) continue
    const top = y + 6
    const len = L.len + 60
    const dx = L.sx * len * 0.9
    const grad = g.createLinearGradient(0, top, 0, top + len)
    grad.addColorStop(0, rgb(L.pool, 0.1 * (0.6 + L.poolK)))
    grad.addColorStop(1, rgb(L.pool, 0))
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(x + 6, top)
    g.lineTo(x + w - 6, top)
    g.lineTo(x + w - 6 + dx, top + len)
    g.lineTo(x + 6 + dx, top + len)
    g.closePath()
    g.fill()
  }
}

function buildLight(c, world, L, quality) {
  // glow = light sources only (half resolution, world coords)
  const g = c.glow.getContext('2d')
  g.setTransform(0.5, 0, 0, 0.5, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.clearRect(0, 0, WORLD_W, WORLD_H)
  g.globalCompositeOperation = 'lighter'
  windowPools(g, L)
  lampLights(g, world, L)
  const glowOnly = quality === 'minimal'
  if (!glowOnly && L.poolK > 0.08) sunShafts(g, L)
  // the sunny street outside reads brighter than the room
  const lift = Math.max(0, L.street[0] - 1)
  if (lift > 0) {
    g.fillStyle = rgb([lift * 1.6, lift * 1.2, lift * 0.6], 1)
    g.fillRect(0, 0, WORLD_W, 3 * T)
  }
  // light = ambient per room + the light sources on top
  const l = c.light.getContext('2d')
  l.setTransform(0.5, 0, 0, 0.5, 0, 0)
  l.globalCompositeOperation = 'source-over'
  const [sx0, sy0, sx1, sy1] = ZONES.street
  const [fx0, fy0, fx1, fy1] = ZONES.front
  const [bx0, by0, bx1, by1] = ZONES.back
  l.fillStyle = rgb(L.street)
  l.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0)
  l.fillStyle = rgb(L.amb)
  l.fillRect(fx0, fy0, fx1 - fx0 + 8, fy1 - fy0)
  l.fillStyle = rgb(L.back)
  l.fillRect(bx0, by0, bx1 - bx0, by1 - by0)
  // rooms fall off a touch away from the windows
  const fall = l.createLinearGradient(0, 5 * T, 0, WORLD_H)
  fall.addColorStop(0, 'rgba(0,0,0,0)')
  fall.addColorStop(1, 'rgba(40,24,30,0.12)')
  l.fillStyle = fall
  l.fillRect(0, 5 * T, WORLD_W, WORLD_H - 5 * T)
  l.setTransform(1, 0, 0, 1, 0, 0)
  l.globalCompositeOperation = 'lighter'
  l.globalAlpha = 0.9
  l.drawImage(c.glow, 0, 0)
  l.globalAlpha = 1
  l.globalCompositeOperation = 'source-over'
}

function drawLight(ctx, world, c, L, quality) {
  buildLight(c, world, L, quality)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  // 1 · the light map darkens what isn't lit …
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(c.light, 0, 0, WORLD_W, WORLD_H)
  // … 2 · and lifts what is: pools, lamps and the haze in the sunbeams (one pass)
  if (quality !== 'minimal') {
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.36
    ctx.drawImage(c.glow, 0, 0, WORLD_W, WORLD_H)
    ctx.globalAlpha = 1
    // dust motes drifting in the light
    if (L.poolK > 0.08) {
      const t = world.t
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = rgb(L.pool, 0.55)
      for (let i = 0; i < 22; i++) {
        const win = MAP.windows[i % MAP.windows.length]
        if (win[0] >= ZONES.back[0]) continue
        const px = win[0] + 10 + ((i * 37 + t * 6) % 70) + L.sx * ((i * 53) % 110) * 0.6
        const py = win[1] + win[3] + ((i * 53 + t * (4 + (i % 3))) % 110)
        ctx.fillRect(Math.round(px + Math.sin(t + i) * 3), Math.round(py), 1, 1)
      }
    }
  }
  ctx.restore()
}

// ------------------------------------------------------------------ the lofi film layer (screen space)
function bokehSprite(c, color) {
  if (c.bokeh[color]) return c.bokeh[color]
  const s = mk(64, 64)
  const g = s.getContext('2d')
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 30)
  r.addColorStop(0, hexA(color, 0.5))
  r.addColorStop(0.72, hexA(color, 0.38))
  r.addColorStop(0.9, hexA(color, 0.62))
  r.addColorStop(1, hexA(color, 0))
  g.fillStyle = r
  g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill()
  c.bokeh[color] = s
  return s
}

// orbs live near the windows, the lamps and along the blurred top / bottom edges
const ORBS = Array.from({ length: 30 }, (_, i) => {
  const r = (n) => { const v = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return v - Math.floor(v) }
  const band = r(1)
  const anchors = [...MAP.windows.filter((w) => w[0] < ZONES.back[0]).map((w) => [w[0] + w[2] / 2, w[1] + w[3] + 20]), ...(LIGHTS.pendants || []), ...(LIGHTS.lamps || []).map(([x, y]) => [x, y])]
  let x, y, size
  if (band < 0.36) { x = r(2) * WORLD_W; y = 4 + r(3) * 70; size = 9 + r(4) * 13 }
  else if (band < 0.5) { x = r(2) * WORLD_W; y = WORLD_H - 40 + r(3) * 36; size = 9 + r(4) * 12 }
  else { const a = anchors[Math.floor(r(5) * anchors.length)] || [480, 200]; x = a[0] + (r(2) - 0.5) * 110; y = a[1] + (r(3) - 0.5) * 70; size = 4 + r(4) * 8 }
  return { x, y, size, color: ['#ffbb70', '#ffcf8c', '#ff9f60', '#ffe2aa'][Math.floor(r(6) * 4)], speed: 0.15 + r(7) * 0.35, ph: r(8) * 6.28, k: 0.5 + r(9) * 0.5 }
})

/** the slow-moving parts of the grade, baked into two layers and refreshed about once a second */
function bakeGrade(c, W, H, L) {
  const key = `${W}x${H}|${L.warm.toFixed(2)}`
  if (key === c.gradeKey && c.gradeMul) return
  c.gradeKey = key
  if (!c.gradeMul || c.gradeMul.width !== W || c.gradeMul.height !== H) { c.gradeMul = mk(W, H); c.gradeScr = mk(W, H) }
  // multiply: warm tint (stands in for a soft-light grade) + a plum vignette
  const m = c.gradeMul.getContext('2d')
  m.globalCompositeOperation = 'source-over'
  const warm = 1 - L.warm * 0.45
  m.fillStyle = rgb([1, 1 - L.warm * 0.12, warm * 0.96], 1)
  m.fillRect(0, 0, W, H)
  m.globalCompositeOperation = 'multiply'
  const vg = m.createRadialGradient(W / 2, H * 0.55, H * 0.42, W / 2, H * 0.55, W * 0.72)
  vg.addColorStop(0, 'rgba(255, 255, 255, 1)')
  vg.addColorStop(1, 'rgba(158, 118, 146, 1)')
  m.fillStyle = vg
  m.fillRect(0, 0, W, H)
  // screen: a soft light leak from the top-left corner in the afternoon
  const s = c.gradeScr.getContext('2d')
  s.clearRect(0, 0, W, H)
  const leak = s.createRadialGradient(-W * 0.04, -H * 0.05, 0, -W * 0.04, -H * 0.05, W * 0.55)
  leak.addColorStop(0, `rgba(255, 158, 82, ${0.1 + L.warm * 0.6})`)
  leak.addColorStop(1, 'rgba(255, 158, 82, 0)')
  s.fillStyle = leak
  s.fillRect(0, 0, W, H)
}

function drawFilm(ctx, cv, world, c, L, quality, reduced) {
  const W = cv.width
  const H = cv.height
  const s = W / WORLD_W
  const t = reduced ? 0 : world.t
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = true
  // bloom: the light sources, shrunk to a smudge and blown back up (no blur filter needed)
  if (quality === 'high') {
    const b = c.bloom.getContext('2d')
    b.imageSmoothingEnabled = true
    b.clearRect(0, 0, c.bloom.width, c.bloom.height)
    b.drawImage(c.glow, 0, 0, c.bloom.width, c.bloom.height)
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.5
    ctx.drawImage(c.bloom, 0, 0, W, H)
    ctx.globalAlpha = 1
  }
  // tilt-shift: the street edge and the south wall go soft, like a macro lens (edge strips only)
  if (quality === 'high') {
    const top = Math.round(H * 0.14)
    const bot = Math.round(H * 0.1)
    if (!c.blur || c.blur.width !== Math.round(W / 5)) {
      c.blur = mk(W / 5, H / 5)
      c.bandTop = mk(W, top)
      c.bandBot = mk(W, bot)
    }
    const b = c.blur.getContext('2d')
    b.imageSmoothingEnabled = true
    b.clearRect(0, 0, c.blur.width, c.blur.height)
    b.drawImage(cv, 0, 0, c.blur.width, c.blur.height)
    for (const [band, sy, sh, dy, h, fromTop] of [[c.bandTop, 0, 0.14, 0, top, true], [c.bandBot, 0.9, 0.1, H - bot, bot, false]]) {
      const g = band.getContext('2d')
      g.globalCompositeOperation = 'source-over'
      g.imageSmoothingEnabled = true
      g.clearRect(0, 0, W, h)
      g.drawImage(c.blur, 0, c.blur.height * sy, c.blur.width, c.blur.height * sh, 0, 0, W, h)
      g.globalCompositeOperation = 'destination-in'
      const m = g.createLinearGradient(0, 0, 0, h)
      m.addColorStop(0, fromTop ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0)')
      m.addColorStop(1, fromTop ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.85)')
      g.fillStyle = m
      g.fillRect(0, 0, W, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(band, 0, dy)
    }
  }
  // warm bokeh
  if (L.bokeh > 0.05) {
    ctx.globalCompositeOperation = 'lighter'
    const n = Math.round(ORBS.length * Math.min(1, L.bokeh) * (quality === 'high' ? 1 : 0.5))
    for (let i = 0; i < n; i++) {
      const o = ORBS[i]
      const ox = (o.x + Math.sin(t * o.speed + o.ph) * 10) * s
      const oy = (o.y + Math.cos(t * o.speed * 0.8 + o.ph) * 6) * s
      const r = o.size * s
      ctx.globalAlpha = 0.22 * o.k * L.bokeh * (0.75 + 0.25 * Math.sin(t * 0.9 + o.ph))
      ctx.drawImage(bokehSprite(c, o.color), ox - r, oy - r, r * 2, r * 2)
    }
    ctx.globalAlpha = 1
  }
  // warm grade + plum vignette + light leak (the "lofi" split tone), baked
  bakeGrade(c, W, H, L)
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(c.gradeMul, 0, 0)
  ctx.globalCompositeOperation = 'screen'
  ctx.drawImage(c.gradeScr, 0, 0)
  // film grain
  if (quality === 'high') {
    if (!c.grain) {
      c.grain = mk(128, 128)
      const g = c.grain.getContext('2d')
      const d = g.createImageData(128, 128)
      for (let i = 0; i < d.data.length; i += 4) {
        const v = 128 + (Math.random() - 0.5) * 90
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v
        d.data[i + 3] = 255
      }
      g.putImageData(d, 0, 0)
      c.grainPattern = ctx.createPattern(c.grain, 'repeat')
    }
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = 0.07
    const j = reduced ? 0 : Math.floor(world.t * 12) % 64
    ctx.translate(-j, -((j * 7) % 64))
    ctx.fillStyle = c.grainPattern
    ctx.fillRect(0, 0, W + 64, H + 64)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()
}

// ------------------------------------------------------------------ rain
function drawRain(ctx, world, dt) {
  const r = world.rain
  if (r < 0.01) return
  let st = rainState.get(world)
  if (!st) {
    st = { drops: [], splashes: [] }
    for (let i = 0; i < 150; i++) st.drops.push({ x: Math.random() * WORLD_W, y: Math.random() * 3 * T, v: 220 + Math.random() * 120 })
    rainState.set(world, st)
  }
  ctx.fillStyle = `rgba(40, 58, 92, ${0.32 * r})`
  ctx.fillRect(0, 0, WORLD_W, 3 * T)
  for (const [x, y, w, h] of MAP.windows) {
    ctx.fillStyle = `rgba(52, 70, 110, ${0.26 * r})`
    ctx.fillRect(x + 4, y + 4, w - 8, h - 10)
    ctx.strokeStyle = `rgba(210, 228, 255, ${0.5 * r})`
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const sx = x + 8 + ((i * 11 + Math.floor(world.t * 9)) % (w - 16))
      const sy = y + 6 + ((i * 17 + world.t * 40) % (h - 20))
      ctx.beginPath(); ctx.moveTo(sx + 0.5, sy); ctx.lineTo(sx + 0.5, sy + 4); ctx.stroke()
    }
  }
  ctx.strokeStyle = `rgba(214, 230, 255, ${0.85 * r})`
  ctx.lineWidth = 1
  ctx.beginPath()
  const n = Math.floor(st.drops.length * r)
  for (let i = 0; i < n; i++) {
    const d = st.drops[i]
    d.y += d.v * dt
    d.x -= d.v * dt * 0.18
    if (d.y > 3 * T + 4) {
      if (Math.random() < 0.5) st.splashes.push({ x: d.x, y: 1 * T + 8 + Math.random() * 2 * T, t: 0 })
      d.y = -8
      d.x = Math.random() * (WORLD_W + 40)
    }
    ctx.moveTo(Math.round(d.x) + 0.5, Math.round(d.y))
    ctx.lineTo(Math.round(d.x - 2) + 0.5, Math.round(d.y + 8))
  }
  ctx.stroke()
  ctx.strokeStyle = `rgba(220, 235, 255, ${0.55 * r})`
  st.splashes = st.splashes.filter((s) => (s.t += dt) < 0.35)
  for (const s of st.splashes) {
    const rr = 1 + s.t * 10
    ctx.beginPath(); ctx.ellipse(s.x, s.y, rr, rr * 0.4, 0, 0, Math.PI * 2); ctx.stroke()
  }
}

/**
 * Draw one frame. `scale` maps world px → canvas px.
 * opts.quality: 'high' (everything) · 'medium' (no bloom / tilt-shift / grain) · 'low' (light + shadows, no film)
 *               · 'minimal' (light map + static shadows only) — CafeCanvas steps down by itself on slow devices
 */
// ------------------------------------------------------------------ how customers feel
// LimeZu's emote bubbles over people: a clock that fills green, then runs orange to red, while
// someone waits in the queue; a red cross when they give up and walk out; a heart when they're
// served quickly. Drawn after the light and film so they stay crisp and readable.
const WAIT_GREEN = 14 // seconds of green clock before it turns orange
const WAIT_RED = 16 // then this long to fill red
function moodOf(a, t) {
  if (a.mood && a.mood.until > t) return a.mood.kind
  if ((a.state === 'queue' || a.state === 'front') && a.queuedAt != null) {
    const w = t - a.queuedAt
    if (w < 4) return null
    if (w < WAIT_GREEN) return `wait${Math.min(7, Math.floor(((w - 4) / (WAIT_GREEN - 4)) * 8))}`
    return `late${Math.min(7, Math.floor(((w - WAIT_GREEN) / WAIT_RED) * 8))}`
  }
  return null
}
function drawMoods(ctx, world, img, scale) {
  if (!img.ui) return
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.imageSmoothingEnabled = false
  for (const a of world.actors.values()) {
    if (a.kind !== 'customer') continue
    const name = moodOf(a, world.t)
    const r = name && UI[name]
    if (!r) continue
    const lift = isSitting(a.anim) ? 40 : 49
    ctx.drawImage(img.ui, r[0], r[1], r[2], r[3], Math.round(a.x - r[2] / 2), Math.round(a.y - lift - r[3]), r[2], r[3])
  }
}

export function drawCafe(ctx, world, img, scale, dt, opts = {}) {
  const quality = opts.quality || 'high'
  const reduced = !!opts.reducedMotion
  const c = cacheFor(img)
  const L = lightAt(world.dayPhase ? world.dayPhase() : 0.62, world.rain)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, WORLD_W, WORLD_H)
  ctx.drawImage(img.ground, 0, 0)

  // doors swing as people pass
  fx(ctx, img.fx, MAP.fx.door[Math.min(4, Math.round(world.door.open * 4))], MAP.door.x, MAP.door.y)
  fx(ctx, img.fx, MAP.fx.staffDoor[Math.min(4, Math.round(world.staffDoor.open * 4))], MAP.staffDoor.x, MAP.staffDoor.y)
  if (MAP.innerDoor && MAP.fx.innerDoor) fx(ctx, img.fx, MAP.fx.innerDoor[Math.min(4, Math.round((world.innerDoor?.open || 0) * 4))], MAP.innerDoor.x, MAP.innerDoor.y)

  // soft shadows under everything, cast away from the sun
  drawShadows(ctx, world, img, c, L, quality)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.imageSmoothingEnabled = false

  // Y-sorted props & people
  const items = []
  for (const o of OBJECTS) items.push({ z: o.z, o })
  if (world.crates && CRATE) {
    const [dc, dr] = MAP.spots.deliveryDrop.tile
    items.push({ z: dr * T + 30, crate: { x: dc * T + (32 - CRATE.a[2]) / 2, y: dr * T + 30 - CRATE.a[3] } })
  }
  for (const s of world.seats) {
    if (!s.by) continue
    const a = world.actors.get(s.by)
    if (!a || !isSitting(a.anim)) continue
    const [tc, tr] = s.table
    items.push({ z: (tr + 1) * T + 2, cup: { x: tc * T + (s.face === 'right' ? -7 : 7), y: tr * T - 52 } })
  }
  if (MAP.cat && MAP.fx.cat) items.push({ z: MAP.cat.z, cat: true })
  for (const a of world.actors.values()) items.push({ z: a.y + 0.5, a })
  items.sort((p, q) => p.z - q.z)

  for (const it of items) {
    if (it.o) {
      const o = it.o
      const anim = o.m?.anim
      if (anim === 'clock') {
        fx(ctx, img.fx, MAP.fx.clock[Math.floor(world.t * 2) % 4], MAP.animated.clock.x, MAP.animated.clock.y)
      } else if (anim === 'cakeFridge') {
        const left = world.fridgeUntil - world.t
        const fr = left > 0 ? Math.min(11, Math.floor((1 - left / 1.4) * 12)) : 0
        fx(ctx, img.fx, MAP.fx.cakeFridge[fr], MAP.animated.cakeFridge.x, MAP.animated.cakeFridge.y)
      } else {
        const [sx, sy, w, h] = o.a
        ctx.drawImage(img.objects, sx, sy, w, h, o.x, o.y, w, h)
      }
    } else if (it.a) {
      drawActor(ctx, img, it.a, world.t, c, world)
    } else if (it.crate) {
      const [sx, sy, w, h] = CRATE.a
      ctx.drawImage(img.objects, sx, sy, w, h, Math.round(it.crate.x), Math.round(it.crate.y), w, h)
    } else if (it.cup) {
      fx(ctx, img.fx, MAP.fx.coffee[Math.floor(world.t * 5) % 6], it.cup.x, it.cup.y)
    } else if (it.cat) {
      const f = reduced ? 0 : Math.floor(world.t * 4) % MAP.fx.cat.length
      fx(ctx, img.fx, MAP.fx.cat[f], MAP.cat.x, MAP.cat.y)
    }
  }

  drawCandles(ctx, world, L)
  drawSign(ctx, world)
  drawAframe(ctx, world)
  drawPhoneRing(ctx, world)
  drawRain(ctx, world, dt)
  drawLight(ctx, world, c, L, quality)
  if (quality === 'high' || quality === 'medium') drawFilm(ctx, ctx.canvas, world, c, L, quality, reduced)
  drawMoods(ctx, world, img, scale)
}
