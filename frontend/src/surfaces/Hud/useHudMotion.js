import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, useTransform } from 'framer-motion'

/* Cursor tilt + idle drift for the HUD.
   Doctrine: HUD is the only thing that moves; both effects are gated by
   prefers-reduced-motion: no-preference, applied at the consumer (via the
   reducedMotion flag). When reducedMotion is true, returned values stay 0. */

const MAX_TILT_DEG = 7
const TILT_SPRING = { stiffness: 110, damping: 18, mass: 0.6 }

export function useHudMotion({ reducedMotion = false, frozen = false } = {}) {
  const ref = useRef(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const springX = useSpring(rawX, TILT_SPRING)
  const springY = useSpring(rawY, TILT_SPRING)

  const rotateY = useTransform(springX, (v) => v * MAX_TILT_DEG)
  const rotateX = useTransform(springY, (v) => v * -MAX_TILT_DEG)

  useEffect(() => {
    if (reducedMotion || frozen) {
      rawX.set(0)
      rawY.set(0)
      return
    }
    const el = ref.current
    if (!el) return

    function onMove(e) {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)
      rawX.set(clamp(dx, -1, 1))
      rawY.set(clamp(dy, -1, 1))
    }

    function onLeave() {
      rawX.set(0)
      rawY.set(0)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [reducedMotion, frozen, rawX, rawY])

  return { ref, rotateX, rotateY }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
