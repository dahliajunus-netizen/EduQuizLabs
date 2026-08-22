'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  translations,
  Language,
  TranslationKey,
} from '@/lib/translations'

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
)

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode
}) {
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
  }, [])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)

    try {
      localStorage.setItem('language', newLanguage)
    } catch (error) {
      console.error('Error saving language preference:', error)
    }
  }

  const t = (key: TranslationKey) => {
    return translations[language][key]
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error(
      'useLanguage must be used inside LanguageProvider'
    )
  }

  return context
}
