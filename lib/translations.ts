export const translations = {
  en: {
    overview: 'Overview',
    children: 'Children',
    role: 'Role',
    guestUser: 'Guest User',
    exit: 'Exit',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
  },

  id: {
    overview: 'Ringkasan',
    children: 'Anak',
    role: 'Peran',
    guestUser: 'Pengguna Tamu',
    exit: 'Keluar',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
