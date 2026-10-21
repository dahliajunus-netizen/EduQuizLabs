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

    setAnimating(true)

    // Fade to the destination color, switch themes behind it, then fade back out.
    const overlay = document.createElement('div')
    overlay.setAttribute('aria-hidden', 'true')
    overlay.style.cssText = `
      position:fixed;
      inset:0;
      z-index:2147483646;
      pointer-events:none;
      background:${nextTheme === 'dark' ? 'rgb(18, 24, 38)' : 'rgb(248, 250, 252)'};
      opacity:0;
      transition:opacity 300ms ease-in-out;
      will-change:opacity;
    `

    document.body.appendChild(overlay)
    void overlay.offsetWidth

    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
    })

    window.setTimeout(() => {
      setTheme(nextTheme)
      window.setTimeout(() => {
        overlay.style.opacity = '0'
        window.setTimeout(() => {
          overlay.remove()
          setAnimating(false)
        }, 320)
      }, 30)
    }, 300)
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
