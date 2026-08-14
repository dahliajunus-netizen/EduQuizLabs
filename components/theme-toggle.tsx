'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [pop, setPop] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'

    // Trigger the icon pop animation
    setPop(true)
    window.setTimeout(() => setPop(false), 400)

    // Compute the origin of the circular reveal from the button center
    const button = buttonRef.current
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (cb: () => void) => { ready: Promise<void> }
      }
    ).startViewTransition

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!button || !startViewTransition || prefersReducedMotion) {
      setTheme(nextTheme)
      return
    }

    const rect = button.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    const transition = startViewTransition.call(document, () => {
      setTheme(nextTheme)
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className="relative overflow-hidden"
    >
      {/* Render icons only after mount to avoid hydration mismatch */}
      {mounted && (
        <>
          <Sun
            className={`size-5 transition-all duration-500 ${
              isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            } ${pop ? 'animate-[toggle-pop_0.4s_ease-out]' : ''}`}
          />
          <Moon
            className={`absolute size-5 transition-all duration-500 ${
              isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            } ${pop ? 'animate-[toggle-pop_0.4s_ease-out]' : ''}`}
          />
        </>
      )}
    </Button>
  )
}
