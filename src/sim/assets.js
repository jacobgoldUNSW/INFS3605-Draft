// Loads the compiled café art (see tools/cafe) and answers "which pixels is this frame?"
import groundUrl from '../assets/cafe/cafe_ground.png'
import objectsUrl from '../assets/cafe/cafe_objects.png'
import charsUrl from '../assets/cafe/cafe_chars.png'
import fxUrl from '../assets/cafe/cafe_fx.png'
import uiUrl from '../assets/cafe/cafe_ui.png'
import UI from './cafeUi.json'
import MAP from './cafeMap.json'
import CHARS from './cafeChars.json'

export { MAP, CHARS, UI }
export const T = MAP.tile
export const WORLD_W = MAP.cols * T
export const WORLD_H = MAP.rows * T

let loading = null
export function loadCafeImages() {
  if (loading) return loading
  const load = (src) => new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Couldn't load ${src}`))
    img.src = src
  })
  loading = Promise.all([load(groundUrl), load(objectsUrl), load(charsUrl), load(fxUrl), load(uiUrl)])
    .then(([ground, objects, chars, fx, ui]) => ({ ground, objects, chars, fx, ui }))
  loading.catch(() => { loading = null })
  return loading
}

// ---- character frames -------------------------------------------------------------
// dir: 0 right, 1 up, 2 left, 3 down (LimeZu order)
export const DIR = { right: 0, up: 1, left: 2, down: 3 }
const FW = CHARS.fw
const FH = CHARS.fh

/** Source rect [sx, sy] for a character animation frame. */
export function charFrame(sprite, anim, dir, f) {
  const meta = CHARS.chars[sprite] || CHARS.chars.cust1
  const staff = meta.kind === 'staff'
  const y0 = meta.y
  let row = 0
  let col = 0
  switch (anim) {
    case 'walk': row = 0; col = 24 + dir * 6 + (f % 6); break
    case 'sit': row = staff ? 3 : 1; col = (dir === DIR.left ? 6 : 0) + (f % 6); break
    case 'sit2': row = staff ? 3 : 1; col = 36 + (dir === DIR.left ? 6 : 0) + (f % 6); break // relaxed, for armchairs
    case 'phone': row = staff ? 3 : 1; col = 12 + 4 + (f % 6); break // loop frames 4-9
    case 'book': row = staff ? 3 : 1; col = 24 + 1 + (f % 6); break // loop frames 1-6
    case 'pickup': if (staff) { row = 1; col = dir * 12 + (f % 12) } else { row = 0; col = dir * 6 + (f % 6) } break
    case 'gift': if (staff) { row = 2; col = dir * 10 + (f % 10) } else { row = 0; col = dir * 6 + (f % 6) } break
    case 'idle':
    default: row = 0; col = dir * 6 + (f % 6)
  }
  return [col * FW, y0 + row * FH]
}

export const ANIM_FPS = { idle: 5, walk: 10, sit: 3, sit2: 3, phone: 6, book: 5, pickup: 10, gift: 9 }
export const isSitting = (anim) => anim === 'sit' || anim === 'sit2'
export const CHAR_W = FW
export const CHAR_H = FH
