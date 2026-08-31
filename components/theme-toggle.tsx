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

  const toggleTheme = () => {
    if (!mounted || animating) return

    const isDark = resolvedTheme === 'dark'
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
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    // A soft, translucent reveal gives the theme change a polished, native feel.
    const overlay = document.createElement('div')
    overlay.setAttribute('aria-hidden', 'true')
    overlay.style.cssText = `
      position:fixed;
      inset:0;
      z-index:2147483646;
      pointer-events:none;
      overflow:hidden;
    `

    const circle = document.createElement('div')
    circle.style.cssText = `
      position:absolute;
      left:${x - radius}px;
      top:${y - radius}px;
      width:${radius * 2}px;
      height:${radius * 2}px;
      border-radius:50%;
      background:${nextTheme === 'dark' ? 'rgba(18, 24, 38, .78)' : 'rgba(248, 250, 252, .78)'};
      box-shadow:0 0 120px ${nextTheme === 'dark' ? 'rgba(110,145,210,.10)' : 'rgba(255,255,255,.42)'};
      transform:scale(.02);
      opacity:.96;
      transition:
        transform 1050ms cubic-bezier(.22,1,.36,1),
        opacity 1050ms cubic-bezier(.22,1,.36,1);
      will-change:transform,opacity;
    `

    overlay.appendChild(circle)
    document.body.appendChild(overlay)
    void circle.offsetWidth

    requestAnimationFrame(() => {
      circle.style.transform = 'scale(1)'
      circle.style.opacity = '.88'
    })

    // Let the reveal get established before switching the underlying theme.
    window.setTimeout(() => setTheme(nextTheme), 180)

    window.setTimeout(() => {
      overlay.remove()
      setAnimating(false)
    }, 1150)
  }

  const isDark = resolvedTheme === 'dark'

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
          <Sun className={`absolute size-5 transition-all duration-700 ease-out ${isDark ? 'rotate-[180deg] scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
          <Moon className={`absolute size-5 transition-all duration-700 ease-out ${isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-[-180deg] scale-50 opacity-0'}`} />
        </span>
      ) : (
        <span className="relative size-5 rounded-full bg-muted animate-pulse" aria-hidden="true" />
      )}
    </Button>
  )
}
