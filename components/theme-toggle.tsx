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

    const button = buttonRef.current

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    // Icon animation
    setPop(true)

    window.setTimeout(() => {
      setPop(false)
    }, 400)

    // No animation if the user/device requests reduced motion
    if (reducedMotion) {
      setTheme(nextTheme)
      return
    }

    /*
     * Get the center of the theme button.
     */
    const rect = button?.getBoundingClientRect()

    const x = rect
      ? rect.left + rect.width / 2
      : window.innerWidth / 2

    const y = rect
      ? rect.top + rect.height / 2
      : window.innerHeight / 2

    /*
     * Find the furthest corner from the button.
     * The circle needs to be large enough to cover
     * the entire screen.
     */
    const distances = [
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(
        window.innerWidth - x,
        window.innerHeight - y,
      ),
    ]

    const radius = Math.max(...distances)

    /*
     * ============================================================
     * Create the transition circle
     * ============================================================
     */

    const circle = document.createElement('div')

    const diameter = radius * 2

    circle.style.position = 'fixed'
    circle.style.left = `${x - radius}px`
    circle.style.top = `${y - radius}px`
    circle.style.width = `${diameter}px`
    circle.style.height = `${diameter}px`

    circle.style.borderRadius = '50%'
    circle.style.pointerEvents = 'none'

    /*
     * Extremely high z-index so the circle is above
     * the entire application.
     */
    circle.style.zIndex = '2147483647'

    /*
     * The circle has the COLOR OF THE NEW THEME.
     */
    circle.style.background =
      nextTheme === 'dark'
        ? 'hsl(222 47% 11%)'
        : 'hsl(0 0% 100%)'

    /*
     * Start completely collapsed.
     */
    circle.style.transform = 'scale(0)'
    circle.style.transformOrigin = 'center center'

    document.body.appendChild(circle)

    /*
     * Force the browser to acknowledge the initial
     * scale(0) before we change it.
     */
    void circle.offsetWidth

    /*
     * Change the actual theme BEFORE expanding the circle.
     *
     * The circle hides the change, then expands over it.
     */
    setTheme(nextTheme)

    /*
     * Give next-themes/React a frame to apply the new theme.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const animation = circle.animate(
          [
            {
              transform: 'scale(0)',
            },
            {
              transform: 'scale(1)',
            },
          ],
          {
            duration: 500,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards',
          },
        )

        animation.onfinish = () => {
          circle.remove()
        }

        animation.oncancel = () => {
          circle.remove()
        }
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
