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

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    setPop(true)
    window.setTimeout(() => setPop(false), 400)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setTheme(nextTheme)
      return
    }

    const button = buttonRef.current
    const rect = button?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y),
    )

    const circle = document.createElement('div')
    circle.style.cssText = `position:fixed;left:${x - radius}px;top:${y - radius}px;width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;pointer-events:none;z-index:2147483647;background:${nextTheme === 'dark' ? 'oklch(0.19 0.03 245)' : 'oklch(0.985 0.004 230)'};transform:scale(0);transform-origin:center;transition:transform 500ms cubic-bezier(0.4,0,0.2,1);`
    document.body.appendChild(circle)
    void circle.offsetWidth
    setTheme(nextTheme)

    requestAnimationFrame(() => requestAnimationFrame(() => {
      circle.style.transform = 'scale(1)'
    }))

    window.setTimeout(() => circle.remove(), 550)
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
      className="relative overflow-hidden rounded-xl border-border/70 bg-background/70 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {mounted ? (
        <>
          <Sun className={`size-5 transition-all duration-500 ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'} ${pop ? 'animate-[toggle-pop_0.4s_ease-out]' : ''}`} />
          <Moon className={`absolute size-5 transition-all duration-500 ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'} ${pop ? 'animate-[toggle-pop_0.4s_ease-out]' : ''}`} />
        </>
      ) : (
        <span className="size-5 rounded-full bg-muted animate-pulse" aria-hidden="true" />
      )}
    </Button>
  )
}
