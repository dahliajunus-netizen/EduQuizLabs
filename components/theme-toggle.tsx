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

  const toggleTheme = async () => {
    const nextTheme = isDark ? 'light' : 'dark'

    // Icon pop animation
    setPop(true)

    window.setTimeout(() => {
      setPop(false)
    }, 400)

    const button = buttonRef.current

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    // If the user prefers reduced motion, instantly switch.
    if (prefersReducedMotion) {
      setTheme(nextTheme)
      return
    }

    /*
     * Get the button position.
     */
    const rect = button?.getBoundingClientRect()

    const x = rect
      ? rect.left + rect.width / 2
      : window.innerWidth / 2

    const y = rect
      ? rect.top + rect.height / 2
      : window.innerHeight / 2

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    /*
     * =========================================================
     * MODERN BROWSER
     * Use View Transitions API when available.
     * =========================================================
     */

    const documentWithTransition = document as Document & {
      startViewTransition?: (
        callback: () => void | Promise<void>,
      ) => {
        ready: Promise<void>
        finished: Promise<void>
      }
    }

    if (documentWithTransition.startViewTransition) {
      try {
        const transition =
          documentWithTransition.startViewTransition(() => {
            setTheme(nextTheme)
          })

        await transition.ready

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

        return
      } catch (error) {
        console.warn(
          'View Transition failed, using fallback animation.',
          error,
        )
      }
    }

    /*
     * =========================================================
     * FALLBACK
     * Works on browsers without View Transitions API.
     * =========================================================
     */

    const overlay = document.createElement('div')

    overlay.style.position = 'fixed'
    overlay.style.left = '0'
    overlay.style.top = '0'
    overlay.style.width = '100vw'
    overlay.style.height = '100vh'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '99999'
    overlay.style.backgroundColor =
      nextTheme === 'dark' ? '#020617' : '#ffffff'

    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`

    document.body.appendChild(overlay)

    /*
     * First switch the theme while the overlay is invisible.
     */
    setTheme(nextTheme)

    /*
     * Let React/next-themes apply the new theme before
     * starting the expansion.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const animation = overlay.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: 'ease-in-out',
            fill: 'forwards',
          },
        )

        animation.finished
          .catch(() => {})
          .finally(() => {
            overlay.remove()
          })
      })
    })
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="outline"
      size="icon"
      aria-label={
        isDark
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      onClick={toggleTheme}
      className="relative overflow-hidden"
    >
      {mounted && (
        <>
          <Sun
            className={`size-5 transition-all duration-500 ${
              isDark
                ? 'rotate-90 scale-0 opacity-0'
                : 'rotate-0 scale-100 opacity-100'
            } ${
              pop
                ? 'animate-[toggle-pop_0.4s_ease-out]'
                : ''
            }`}
          />

          <Moon
            className={`absolute size-5 transition-all duration-500 ${
              isDark
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-0 opacity-0'
            } ${
              pop
                ? 'animate-[toggle-pop_0.4s_ease-out]'
                : ''
            }`}
          />
        </>
      )}
    </Button>
  )
}
