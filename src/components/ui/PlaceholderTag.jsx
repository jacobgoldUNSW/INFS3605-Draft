import React from 'react'

/** Every testimonial on the site is a stand-in until real café owners share theirs. */
export default function PlaceholderTag({ className = '' }) {
  return (
    <span className={`ph-tag ${className}`} title="We don’t have real testimonials yet. The quote, name and photo are placeholders.">
      Placeholder testimonial
    </span>
  )
}
