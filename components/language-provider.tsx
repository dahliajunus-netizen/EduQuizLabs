'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations, Language, TranslationKey } from '@/lib/translations'

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function setGoogleTranslateCookie(language: Language) {
  if (typeof document === 'undefined') return

  if (language === 'en') {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
  } else {
    const value = `/en/${language}`
    document.cookie = `googtrans=${value}; path=/; max-age=31536000`
    document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}; max-age=31536000`
  }
}

function loadGoogleTranslate() {
  if (typeof window === 'undefined') return
  if ((window as any).google?.translate?.TranslateElement) return

  ;(window as any).googleTranslateElementInit = () => {
    const GoogleTranslate = (window as any).google?.translate?.TranslateElement
    const target = document.getElementById('google_translate_element')
    if (!GoogleTranslate || !target) return

    if (target.getAttribute('data-loaded') === 'true') return
    target.setAttribute('data-loaded', 'true')

    new GoogleTranslate(
      {
        pageLanguage: 'en',
        includedLanguages: 'en,id',
        autoDisplay: false,
      },
      'google_translate_element'
    )
  }

  const existing = document.querySelector('script[data-google-translate]')
  if (existing) return

  const script = document.createElement('script')
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
  script.async = true
  script.setAttribute('data-google-translate', 'true')
  document.head.appendChild(script)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('language')
      if (savedLanguage === 'en' || savedLanguage === 'id') {
        setLanguageState(savedLanguage)
      }
    } catch (error) {
      console.error('Error loading language preference:', error)
    }

    document.documentElement.lang = 'en'
    document.documentElement.setAttribute('translate', 'yes')
    document.body.setAttribute('translate', 'yes')
    loadGoogleTranslate()
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.setAttribute('translate', 'yes')
    document.body.setAttribute('translate', 'yes')
  }, [language])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)

    try {
      localStorage.setItem('language', newLanguage)
      setGoogleTranslateCookie(newLanguage)
      window.location.reload()
    } catch (error) {
      console.error('Error saving language preference:', error)
    }
  }

  const t = (key: TranslationKey) => translations[language][key]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return context
}
