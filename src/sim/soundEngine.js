// Cosy, procedural café sounds with the Web Audio API — no audio files.
// The AudioContext is only created after a user gesture (browsers require it).
const KEY = 'brewmind.muted'

class SoundEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.rain = null
    this.noise = null
    let saved = null
    try { saved = localStorage.getItem(KEY) } catch { /* private mode */ }
    this.muted = saved === '1'
    this.listeners = new Set()
  }

  ensure() {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.32
      this.master.connect(this.ctx.destination)
      if (this._amb > 0) setTimeout(() => this.setAmbience(this._amb), 0)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  setMuted(m) {
    this.muted = m
    try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* ignore */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.32, this.ctx.currentTime, 0.08)
    this.listeners.forEach((fn) => fn(m))
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }

  /** Suspend everything (tab hidden / sim paused). */
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}) }
  resume() { if (this.ctx && this.ctx.state === 'suspended' && !this.muted) this.ctx.resume().catch(() => {}) }

  noiseBuffer() {
    if (this.noise) return this.noise
    const ctx = this.ctx
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    // pink-ish noise (Paul Kellet's economy filter)
    let b0 = 0, b1 = 0, b2 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18
    }
    this.noise = buf
    return buf
  }

  tone(freq, { type = 'sine', at = 0, attack = 0.005, decay = 0.6, gain = 0.25, detune = 0 } = {}) {
    const ctx = this.ctx
    const t = ctx.currentTime + at
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + attack + decay + 0.05)
  }

  play(name) {
    if (this.muted || !this.ensure()) return
    const fn = this[`_${name}`]
    if (fn) fn.call(this)
  }

  // soft pink-noise milk steam
  _steam() {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 3200
    bp.Q.value = 0.7
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.16, t + 0.12)
    g.gain.linearRampToValueAtTime(0.1, t + 0.7)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)
    bp.frequency.linearRampToValueAtTime(4200, t + 1.2)
    src.connect(bp).connect(g).connect(this.master)
    src.start(t, Math.random())
    src.stop(t + 1.6)
  }

  // warm two-tone shop-door bell
  _bell() {
    this.tone(1318.5, { decay: 1.1, gain: 0.14, type: 'sine' })
    this.tone(2637, { decay: 0.4, gain: 0.03, type: 'sine' })
    this.tone(987.8, { at: 0.16, decay: 1.3, gain: 0.13, type: 'sine' })
    this.tone(1975.5, { at: 0.16, decay: 0.45, gain: 0.025, type: 'sine' })
  }

  // wooden marimba pop (permission asked / task done)
  _marimba() {
    this.tone(659.3, { decay: 0.32, gain: 0.2, type: 'sine' })
    this.tone(2637, { decay: 0.08, gain: 0.04, type: 'sine' })
  }

  // gentle approval chime: C–E–G on wood
  _chime() {
    ;[523.25, 659.25, 783.99].forEach((f, i) => {
      this.tone(f, { at: i * 0.09, decay: 0.55, gain: 0.17, type: 'sine' })
      this.tone(f * 4, { at: i * 0.09, decay: 0.1, gain: 0.03, type: 'sine' })
    })
  }

  _pop() {
    this.tone(880, { decay: 0.12, gain: 0.08, type: 'triangle' })
  }

  // quiet old-school phone trill
  _ring() {
    for (let i = 0; i < 6; i++) {
      this.tone(i % 2 ? 1046.5 : 1318.5, { at: i * 0.055, decay: 0.05, gain: 0.05, type: 'triangle' })
    }
    for (let i = 0; i < 6; i++) {
      this.tone(i % 2 ? 1046.5 : 1318.5, { at: 0.45 + i * 0.055, decay: 0.05, gain: 0.05, type: 'triangle' })
    }
  }

  _cash() {
    this.tone(1567.98, { decay: 0.18, gain: 0.08, type: 'square' })
    this.tone(2093, { at: 0.07, decay: 0.3, gain: 0.07, type: 'triangle' })
  }

  /**
   * A quiet bed of café murmur under the music: voice-band noise that swells and fades, plus the
   * odd cup clink. `level` runs from 0 (off) through 0.3 (a quiet afternoon) to 1 (a full rush).
   */
  setAmbience(level) {
    this._amb = level
    if (level <= 0 && !this.amb) return
    // no audio until the visitor has tapped something; ensure() starts the murmur then
    if (!this.ctx || !this.ensure()) return
    const ctx = this.ctx
    if (level > 0 && !this.amb) {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer()
      src.loop = true
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 520
      bp.Q.value = 0.9
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1300
      const g = ctx.createGain()
      g.gain.value = 0
      // a slow wobble, like conversations rising and falling
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.13
      const depth = ctx.createGain()
      depth.gain.value = 0.01
      lfo.connect(depth).connect(g.gain)
      src.connect(bp).connect(lp).connect(g).connect(this.master)
      src.start(0, Math.random())
      lfo.start()
      this.amb = { src, g, lfo }
      this._clinks = setInterval(() => this._clink(), 2300)
    }
    if (!this.amb) return
    const { src, g, lfo } = this.amb
    g.gain.cancelScheduledValues(ctx.currentTime)
    g.gain.setTargetAtTime(level > 0 ? 0.018 + 0.03 * Math.min(1, level) : 0, ctx.currentTime, 0.9)
    if (level <= 0) {
      clearInterval(this._clinks)
      src.stop(ctx.currentTime + 3)
      lfo.stop(ctx.currentTime + 3)
      this.amb = null
    }
  }

  // a cup set down on a saucer somewhere in the room
  _clink() {
    if (this.muted || !this.amb || this.ctx?.state !== 'running') return
    if (Math.random() > 0.3 + 0.4 * Math.min(1, this._amb || 0)) return
    const f = 2300 + Math.random() * 1500
    this.tone(f, { decay: 0.09, gain: 0.016, type: 'sine' })
    this.tone(f * 1.48, { at: 0.006, decay: 0.05, gain: 0.007, type: 'sine' })
  }

  setRain(on) {
    if (this.muted && on) { this._wantRain = true; return }
    this._wantRain = on
    if (!this.ensure()) return
    const ctx = this.ctx
    if (on && !this.rain) {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer()
      src.loop = true
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1600
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 380
      const g = ctx.createGain()
      g.gain.value = 0
      g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 1.6)
      src.connect(hp).connect(lp).connect(g).connect(this.master)
      src.start()
      this.rain = { src, g }
    } else if (!on && this.rain) {
      const { src, g } = this.rain
      g.gain.cancelScheduledValues(ctx.currentTime)
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.5)
      src.stop(ctx.currentTime + 2.5)
      this.rain = null
    }
  }
}

export const sound = new SoundEngine()
