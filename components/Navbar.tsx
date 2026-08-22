'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, BookOpen, Users, LogOut } from 'lucide-react';
import { translations, Language } from '@/lib/translations';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    try {
      // Read the active signed-in user session
      const rawUser = localStorage.getItem('current_user');

      if (rawUser) {
        setUser(JSON.parse(rawUser));
      }

      // Load saved language preference
      const savedLanguage = localStorage.getItem('language');

      if (savedLanguage === 'en' || savedLanguage === 'id') {
        setLanguage(savedLanguage);
      }
    } catch (e) {
      console.error('Error loading navbar settings', e);
    }
  }, []);

  // Translation object for the currently selected language
  const t = translations[language];

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLanguage = event.target.value as Language;

    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);

    // The navbar immediately updates because language state changed.
  };

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    router.push('/');
  };

  const role = user?.role ? user.role.toLowerCase() : 'student';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">

        {/* Left side */}
        <div className="flex items-center gap-6">

          {/* Logo */}
          <Link
            href={`/dashboard/${role}`}
            className="flex items-center gap-2 font-bold text-lg text-foreground"
          >
            <BookOpen className="h-6 w-6 text-primary" />
            <span>EduPortal</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">

            {/* Overview */}
            <Link
              href={`/dashboard/${role}`}
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard size={16} />
              {t.overview}
            </Link>

            {/* Children */}
            {role === 'parent' && (
              <Link
                href="/dashboard/parent/children"
                className="hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Users size={16} />
                {t.children}
              </Link>
            )}

          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">

          {/* User information */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium text-foreground">
              {user?.fullName || user?.full_name || t.guestUser}
            </span>

            <span className="text-xs text-muted-foreground capitalize">
              {t.role}: {role}
            </span>
          </div>

          {/* Dark / Light mode */}
          <ThemeToggle />

          {/* Language selector */}
          <select
            value={language}
            onChange={handleLanguageChange}
            aria-label="Select language"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-muted focus:ring-2 focus:ring-primary"
          >
            <option value="en">{t.english}</option>
            <option value="id">{t.indonesian}</option>
          </select>

          {/* Logout */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut size={16} />
            {t.exit}
          </Button>

        </div>
      </div>
    </header>
  );
}
