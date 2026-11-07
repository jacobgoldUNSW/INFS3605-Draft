import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'

// Talking to Bea.
// 1. Browsers with built-in speech recognition (Chrome, Edge, Safari) transcribe as you speak, in Australian English.
// 2. Others record a short voice note and our server has Gemini transcribe it.
// 3. Bea can read her replies aloud with the device's own voice (an Australian one when there is one).

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const canRecord = typeof window !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
export const voiceSupport = SR ? 'speech' : canRecord ? 'record' : 'none'
const MAX_MS = 20000

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1] || '')
  r.onerror = reject
  r.readAsDataURL(blob)
})

/** Speech in, text out. `onFinal(text)` fires once per utterance. */
export function useVoice({ onFinal, lang = 'en-AU' } = {}) {
  const [state, setState] = useState('idle') // idle · listening · working
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const rec = useRef(null)
  const media = useRef(null)
  const timer = useRef(null)
  const finalRef = useRef(onFinal)
  finalRef.current = onFinal

  const cleanup = useCallback(() => {
    clearTimeout(timer.current)
    media.current?.stream?.getTracks().forEach((t) => t.stop())
    media.current = null
  }, [])
  useEffect(() => () => { try { rec.current?.abort() } catch { /* already stopped */ } cleanup() }, [cleanup])

  const startSpeech = useCallback(() => {
    const r = new SR()
    r.lang = lang
    r.interimResults = true
    r.continuous = false
    r.maxAlternatives = 1
    let finalText = ''
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else live += t
      }
      setInterim((finalText + live).trim())
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Your browser blocked the microphone. Allow it in the address bar, or type instead.')
      else if (e.error === 'no-speech') setError('I didn’t catch anything. Tap the mic and try again.')
      else if (e.error !== 'aborted') setError('Voice stopped working for a moment. Try again, or type instead.')
    }
    r.onend = () => {
      setState('idle')
      setInterim('')
      const t = finalText.trim()
      if (t) finalRef.current?.(t)
    }
    rec.current = r
    r.start()
    setState('listening')
  }, [lang])

  const startRecording = useCallback(async () => {
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Your browser blocked the microphone. Allow it in the address bar, or type instead.')
      return
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder.isTypeSupported?.(m)) || ''
    const mr = new window.MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined)
    const chunks = []
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    mr.onstop = async () => {
      cleanup()
      setState('working')
      try {
        const blob = new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' })
        const audio = await blobToBase64(blob)
        const r = await api.beaTranscribe({ audio, mime: blob.type })
        setState('idle')
        if (r.text) finalRef.current?.(r.text)
        else setError('I didn’t catch anything. Tap the mic and try again.')
      } catch (e) {
        setState('idle')
        setError(e.message || 'Voice isn’t available right now. You can type instead.')
      }
    }
    media.current = { recorder: mr, stream }
    mr.start()
    setState('listening')
    timer.current = setTimeout(() => mr.state === 'recording' && mr.stop(), MAX_MS)
  }, [cleanup])

  const start = useCallback(() => {
    setError('')
    setInterim('')
    if (voiceSupport === 'speech') {
      try { startSpeech() } catch { setError('Voice isn’t available in this browser. You can type instead.') }
    } else if (voiceSupport === 'record') startRecording()
    else setError('Voice isn’t available in this browser. You can type instead.')
  }, [startSpeech, startRecording])

  const stop = useCallback(() => {
    if (rec.current && state === 'listening' && voiceSupport === 'speech') { try { rec.current.stop() } catch { /* already stopped */ } }
    if (media.current?.recorder?.state === 'recording') media.current.recorder.stop()
  }, [state])

  const toggle = useCallback(() => (state === 'listening' ? stop() : state === 'idle' ? start() : null), [state, start, stop])

  return { support: voiceSupport, state, interim, error, setError, start, stop, toggle }
}

// ---------------------------------------------------------------- Bea's voice
const SPEAK_KEY = 'cafinity.bea.speak'
export const speakPref = {
  get() { try { return localStorage.getItem(SPEAK_KEY) === '1' } catch { return false } },
  set(on) { try { localStorage.setItem(SPEAK_KEY, on ? '1' : '0') } catch { /* private mode */ } },
}
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'en-AU' && /karen|catherine|female|natural/i.test(v.name))
    || voices.find((v) => v.lang === 'en-AU')
    || voices.find((v) => v.lang === 'en-GB')
    || voices.find((v) => v.lang?.startsWith('en'))
    || null
}

/** Read text aloud (cancels whatever Bea was saying before). */
export function speak(text) {
  if (!canSpeak || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const clean = String(text).replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
  const u = new SpeechSynthesisUtterance(clean)
  const v = pickVoice()
  if (v) u.voice = v
  u.lang = v?.lang || 'en-AU'
  u.rate = 1.02
  u.pitch = 1
  synth.speak(u)
}
export const hush = () => canSpeak && window.speechSynthesis.cancel()
