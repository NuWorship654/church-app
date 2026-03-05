import { useRef } from 'react'

export const useSwipe = ({ onSwipeLeft, onSwipeRight, threshold = 60 }) => {
  const startX = useRef(null)
  const startY = useRef(null)

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    // Solo activar si el swipe es más horizontal que vertical
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx < 0 && onSwipeLeft) onSwipeLeft()
      if (dx > 0 && onSwipeRight) onSwipeRight()
    }
    startX.current = null
    startY.current = null
  }

  return { onTouchStart, onTouchEnd }
}