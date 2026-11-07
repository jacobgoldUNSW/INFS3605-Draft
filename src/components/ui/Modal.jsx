import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon'

/** A plain, square dialog: click outside or press Escape to close. */
export default function Modal({ open, onClose, label, children, width = 820, className = '' }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    document.body.classList.add('modal-open')
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    setTimeout(() => closeRef.current?.focus(), 30)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', esc)
      prev?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <motion.div
            className={`modal ${className}`}
            style={{ width: `min(${width}px, 100%)` }}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <button ref={closeRef} className="modal-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
