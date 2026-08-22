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

    /*
     * ---------------------------------------------------------
     * Icon pop animation
     * ---------------------------------------------------------
     */

    setPop(true)

    window.setTimeout(() => {
      setPop(false)
    }, 400)

    /*
     * ---------------------------------------------------------
     * Reduced motion
     * ---------------------------------------------------------
     */

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion) {
      setTheme(nextTheme)
      return
    }

    /*
     * ---------------------------------------------------------
     * Get button position
     * ---------------------------------------------------------
     */

    const button = buttonRef.current
    const rect = button?.getBoundingClientRect()

    const x = rect
      ? rect.left + rect.width / 2
      : window.innerWidth / 2

    const y = rect
      ? rect.top + rect.height / 2
      : window.innerHeight / 2

    /*
     * ---------------------------------------------------------
     * Calculate circle size
     * ---------------------------------------------------------
     */

    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(
        window.innerWidth - x,
        window.innerHeight - y,
      ),
    )

    const diameter = radius * 2

    /*
     * ---------------------------------------------------------
     * Create transition circle
     * ---------------------------------------------------------
     */

    const circle = document.createElement('div')

    circle.style.position = 'fixed'
    circle.style.left = `${x - radius}px`
    circle.style.top = `${y - radius}px`
    circle.style.width = `${diameter}px`
    circle.style.height = `${diameter}px`

    circle.style.borderRadius = '50%'
    circle.style.pointerEvents = 'none'

    /*
     * Keep it above the entire page.
     */
    circle.style.zIndex = '2147483647'

    /*
     * Match the colors in globals.css.
     */
    circle.style.backgroundColor =
      nextTheme === 'dark'
        ? 'oklch(0.19 0.03 245)'
        : 'oklch(0.985 0.004 230)'

    /*
     * Start at the center.
     */
    circle.style.transform = 'scale(0)'
    circle.style.transformOrigin = 'center center'

    /*
     * Use standard CSS transition.
     */
    circle.style.transition =
      'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'

    document.body.appendChild(circle)

    /*
     * Force the browser to render the initial state.
     */
    void circle.offsetWidth

    /*
     * Change the actual theme.
     *
     * The circle is currently covering the screen,
     * so the change happens underneath it.
     */
    setTheme(nextTheme)

    /*
     * Wait for the theme change to render,
     * then expand the circle.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        circle.style.transform = 'scale(1)'
      })
    })

    /*
     * Remove the circle after the animation.
     */
    window.setTimeout(() => {
      circle.remove()
    }, 550)
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
