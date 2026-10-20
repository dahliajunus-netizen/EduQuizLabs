'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'

const FADE_DURATION_MS = 700
const SESSION_KEY = 'eduquizlabs_intro_seen_v2'

export function IntroScreen() {
  const { resolvedTheme } = useTheme()
  const videoRef = useRef<HTMLVideoElement>(null)
  const startedRef = useRef(false)
  const dismissingRef = useRef(false)
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Wait until next-themes resolves light/dark, including the system preference.
    if (!resolvedTheme || startedRef.current) return

    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === 'true') return
      window.sessionStorage.setItem(SESSION_KEY, 'true')
    } catch {
      // If storage is unavailable, still show the intro for this page load.
    }

    startedRef.current = true
    setVisible(true)
  }, [resolvedTheme])

  function dismiss() {
    if (dismissingRef.current) return
    dismissingRef.current = true
    setFading(true)
    window.setTimeout(() => setVisible(false), FADE_DURATION_MS)
  }

  if (!visible) return null

  const introVideo =
    resolvedTheme === 'dark'
      ? '/eduquizlabs-logo-intro-dark.mp4'
      : '/eduquizlabs-logo-intro.mp4'

  return (
    <div
      aria-label="EduQuizLabs introduction"
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] overflow-hidden bg-black transition-opacity duration-700 motion-reduce:transition-none ${fading ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <video
        ref={videoRef}
        key={introVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
        className="h-full w-full object-cover"
      >
        <source src={introVideo} type="video/mp4" />
      </video>
    </div>
  )
}
