'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      setTheme(nextTheme)
      return
    }

    setAnimating(true)

    const rect = buttonRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y),
    )

    // The new theme is revealed as a soft expanding circle from the toggle.
    const reveal = document.createElement('div')
    reveal.setAttribute('aria-hidden', 'true')
    reveal.style.cssText = `
      position:fixed;
      left:${x - radius}px;
      top:${y - radius}px;
      width:${radius * 2}px;
      height:${radius * 2}px;
      border-radius:50%;
      pointer-events:none;
      z-index:2147483647;
      background:${nextTheme === 'dark' ? 'oklch(0.19 0.03 245)' : 'oklch(0.985 0.004 230)'};
      transform:scale(0);
      transform-origin:center;
      transition:transform 650ms cubic-bezier(0.22,1,0.36,1);
      will-change:transform;
    `

    document.body.appendChild(reveal)
    void reveal.offsetWidth
    setTheme(nextTheme)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reveal.style.transform = 'scale(1)'
      })
    })

    window.setTimeout(() => {
      reveal.remove()
      setAnimating(false)
    }, 700)
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      disabled={animating}
      className="group relative overflow-hidden rounded-xl border-border/70 bg-background/70 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default"
    >
      <span className="absolute inset-0 rounded-xl bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {mounted ? (
        <span className="relative flex size-5 items-center justify-center">
          <Sun
            className={`absolute size-5 transition-[transform,opacity] duration-500 ease-out ${
              isDark ? 'rotate-[135deg] scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
            }`}
          />
          <Moon
            className={`absolute size-5 transition-[transform,opacity] duration-500 ease-out ${
              isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-[-135deg] scale-50 opacity-0'
            }`}
          />
        </span>
      ) : (
        <span className="relative size-5 rounded-full bg-muted animate-pulse" aria-hidden="true" />
      )}
    </Button>
  )
}
