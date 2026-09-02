'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations, Language, TranslationKey } from '@/lib/translations'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '简体中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
] as const

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
  languages: typeof SUPPORTED_LANGUAGES
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function isSupportedLanguage(value: string | null): value is Language {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value)
}

function setGoogleTranslateCookie(language: Language) {
  if (typeof document === 'undefined') return
  const value = language === 'en' ? '' : `/en/${language}`
  const expires = language === 'en' ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : '; max-age=31536000'

  // Host-only cookie works reliably on localhost and production domains.
  document.cookie = `googtrans=${value}; path=/${expires}`

  // Also set the domain cookie when possible for Google Translate compatibility.
  if (window.location.hostname.includes('.')) {
    document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}${expires}`
  }
}

function loadGoogleTranslate() {
  if (typeof window === 'undefined') return
  if ((window as any).google?.translate?.TranslateElement) return

  ;(window as any).googleTranslateElementInit = () => {
    const GoogleTranslate = (window as any).google?.translate?.TranslateElement
    const target = document.getElementById('google_translate_element')
    if (!GoogleTranslate || !target || target.getAttribute('data-loaded') === 'true') return

    target.setAttribute('data-loaded', 'true')
    new GoogleTranslate({
      pageLanguage: 'en',
      includedLanguages: SUPPORTED_LANGUAGES.filter(({ code }) => code !== 'en')
        .map(({ code }) => code)
        .join(','),
      autoDisplay: false,
    }, 'google_translate_element')
  }

  if (document.querySelector('script[data-google-translate]')) return

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
      if (isSupportedLanguage(savedLanguage)) setLanguageState(savedLanguage)
    } catch (error) {
      console.error('Error loading language preference:', error)
    }

    loadGoogleTranslate()
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('translate', 'yes')
    document.body.setAttribute('translate', 'yes')
    setGoogleTranslateCookie(language)
  }, [language])

  const setLanguage = (newLanguage: Language) => {
    if (!isSupportedLanguage(newLanguage) || newLanguage === language) return

    try {
      localStorage.setItem('language', newLanguage)
      setGoogleTranslateCookie(newLanguage)
      setLanguageState(newLanguage)

      // Google Translate reads the googtrans cookie when the page loads.
      // Reloading ensures the whole app is translated, not just the next render.
      window.location.reload()
    } catch (error) {
      console.error('Error saving language preference:', error)
    }
  }

  const t = (key: TranslationKey) => {
    const selected = translations[language]
    return selected?.[key] ?? translations.en[key] ?? key
  }

  const value = useMemo(() => ({ language, setLanguage, t, languages: SUPPORTED_LANGUAGES }), [language])

  return (
    <LanguageContext.Provider value={value}>
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}
