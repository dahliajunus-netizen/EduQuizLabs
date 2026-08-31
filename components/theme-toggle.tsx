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
      background:${nextTheme === 'dark' ? 'rgb(18, 24, 38)' : 'rgb(248, 250, 252)'};
      transform:scale(.01);
      transition:transform 700ms cubic-bezier(.2,.8,.2,1);
      will-change:transform;
    `

    overlay.appendChild(circle)
    document.body.appendChild(overlay)
    void circle.offsetWidth

    requestAnimationFrame(() => {
      circle.style.transform = 'scale(1)'
    })

    // Switch exactly as the expanding reveal reaches the middle of the screen.
    window.setTimeout(() => setTheme(nextTheme), 350)

    window.setTimeout(() => {
      overlay.remove()
      setAnimating(false)
    }, 720)
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
          <Sun className={`absolute size-5 transition-all duration-500 ease-out ${isDark ? 'rotate-[180deg] scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
          <Moon className={`absolute size-5 transition-all duration-500 ease-out ${isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-[-180deg] scale-50 opacity-0'}`} />
        </span>
      ) : (
        <span className="relative size-5 rounded-full bg-muted animate-pulse" aria-hidden="true" />
      )}
    </Button>
  )
}
