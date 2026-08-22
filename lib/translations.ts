export const translations = {
  en: {
    overview: 'Overview',
    children: 'Children',
    role: 'Role',
    guestUser: 'Guest User',
    exit: 'Exit',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
    welcomeBack: 'Welcome back!',
    dashboardDescription: "Here's what's happening with your classes.",
  },

  id: {
    overview: 'Ringkasan',
    children: 'Anak',
    role: 'Peran',
    guestUser: 'Pengguna Tamu',
    exit: 'Keluar',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
    welcomeBack: 'Selamat datang kembali!',
    dashboardDescription:
      'Berikut adalah apa yang terjadi dengan kelas Anda.',
  },
}

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.en
