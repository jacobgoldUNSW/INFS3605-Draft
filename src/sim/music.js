// Background music for the café: every track in src/assets/music, shuffled (no repeats until the
// whole set has played), crossfading into each other. It follows the café: it plays while the café
// runs, fades out when you pause, hide the tab or leave the dashboard, and respects both the
// master mute (🔊) and its own on/off toggle (🎵).
import { sound } from './soundEngine'

const files = import.meta.glob('../assets/music/*.mp3', { eager: true, query: '?url', import: 'default' })
const titleOf = (path) => path.split('/').pop().replace(/\.mp3$/, '').split('-').map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ')
export const TRACKS = Object.entries(files).map(([path, url]) => ({ url, title: titleOf(path) }))

const KEY = 'brewmind.music'
const VOLUME = 0.3
const FADE = 2.5 // seconds of crossfade between tracks (and fade in / out on pause)

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

class MusicPlayer {
  constructor() {
    let saved = null
    try { saved = localStorage.getItem(KEY) } catch { /* private mode */ }
    this.enabled = saved !== '0'
    this.want = false // the café is running and would like music
    this.cur = null // { el, track }
    this.bag = []
    this.last = null
    this.blocked = false // the browser refused to autoplay; retry on the next tap
    this.listeners = new Set()
    sound.onChange(() => this.sync())
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  emit() { this.listeners.forEach((fn) => fn(this.state())) }
  state() { return { enabled: this.enabled, playing: this.audible() && !!this.cur && !this.blocked, title: this.cur?.track.title || null } }

  audible() { return this.enabled && !sound.muted && this.want && TRACKS.length > 0 }

  setEnabled(on) {
    this.enabled = on
    try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
    this.sync()
  }

  /** the café started / stopped running */
  start() { this.want = true; this.sync() }
  stop() { this.want = false; this.sync() }

  /** call from a user gesture: browsers only allow sound after one */
  unlock() { if (this.blocked) { this.blocked = false; this.sync() } }

  nextTrack() {
    if (!this.bag.length) {
      this.bag = shuffle(TRACKS)
      // never the same song twice in a row across shuffles
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.last) this.bag.unshift(this.bag.pop())
    }
    return this.bag.pop()
  }

  fade(el, to, sec, then) {
    clearInterval(el._fade)
    const from = el.volume
    const t0 = performance.now()
    el._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000))
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k))
      if (k >= 1) { clearInterval(el._fade); then?.() }
    }, 50)
  }

  playNext() {
    const old = this.cur
    const track = this.nextTrack()
    this.last = track
    const el = new Audio(track.url)
    el.preload = 'auto'
    el.volume = 0
    // start the next song a little before this one ends, so they overlap
    el.addEventListener('timeupdate', () => {
      if (!el._handedOff && el.duration && el.currentTime > el.duration - FADE - 0.2 && this.cur?.el === el) {
        el._handedOff = true
        if (this.audible()) this.playNext()
      }
    })
    el.addEventListener('ended', () => { if (this.cur?.el === el && this.audible()) this.playNext() })
    this.cur = { el, track }
    if (old) this.fade(old.el, 0, FADE, () => { old.el.pause(); old.el.src = '' })
    this.resume(el)
    this.emit()
  }

  resume(el) {
    el.play().then(() => {
      this.blocked = false
      this.fade(el, VOLUME, FADE)
      this.emit()
    }).catch(() => {
      // autoplay blocked until the visitor taps something — CafeStage calls unlock() on the next tap
      this.blocked = true
      this.emit()
    })
  }

  sync() {
    if (this.audible()) {
      if (!this.cur) this.playNext()
      else if (this.cur.el.paused) this.resume(this.cur.el)
    } else if (this.cur && !this.cur.el.paused) {
      const { el } = this.cur
      this.fade(el, 0, 0.8, () => { if (!this.audible()) el.pause() })
    }
    this.emit()
  }
}

export const music = new MusicPlayer()
