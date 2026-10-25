import { useEffect, useState } from 'react'
import { loadCafeImages } from './assets'

/** The compiled café art (shared and cached), for pixel portraits and clips outside the café. */
export function useCafeImages() {
  const [images, setImages] = useState(null)
  useEffect(() => {
    let alive = true
    loadCafeImages().then((img) => alive && setImages(img)).catch(() => {})
    return () => { alive = false }
  }, [])
  return images
}
