import React from 'react'
import Icon from '../ui/Icon'

/** Tap to talk to Bea. While listening the mic becomes a little waveform; tap again to send. */
export default function MicButton({ voice, disabled = false, size = 'md' }) {
  if (voice.support === 'none') return null
  const listening = voice.state === 'listening'
  const working = voice.state === 'working'
  return (
    <button
      type="button"
      className={`mic ${size} ${listening ? 'on' : ''} ${working ? 'working' : ''}`}
      onClick={voice.toggle}
      disabled={disabled || working}
      aria-pressed={listening}
      aria-label={listening ? 'Stop and send what you said' : working ? 'Working out what you said' : 'Talk to Bea'}
      title={listening ? 'Tap to send' : 'Tap to talk'}
    >
      {listening ? (
        <span className="mic-wave" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 0.11}s` }} />)}</span>
      ) : (
        <Icon name="mic" size={size === 'lg' ? 22 : 19} stroke={1.7} />
      )}
    </button>
  )
}
