'use client'

import { useEffect, useRef, useState } from 'react'

const FADE_DURATION_MS = 700
const SESSION_KEY = 'eduquizlabs_intro_seen'

export function IntroScreen() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === 'true') return
      window.sessionStorage.setItem(SESSION_KEY, 'true')
    } catch {
      // If storage is unavailable, still show the intro for this page load.
    }

    setVisible(true)
  }, [])

  function dismiss() {
    setFading(true)
    window.setTimeout(() => setVisible(false), FADE_DURATION_MS)
  }

  if (!visible) return null

  return (
    <div
      aria-label="EduQuizLabs introduction"
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] overflow-hidden bg-black transition-opacity duration-700 motion-reduce:transition-none ${fading ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
        className="h-full w-full object-cover"
      >
        <source src="/eduquizlabs-logo-intro.mp4" type="video/mp4" />
      </video>
    </div>
  )
}
