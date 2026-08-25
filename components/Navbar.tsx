'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, BookOpen, Users, LogOut, Sparkles } from 'lucide-react';
import { translations, Language } from '@/lib/translations';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('current_user');
      if (rawUser) setUser(JSON.parse(rawUser));
      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage === 'en' || savedLanguage === 'id') setLanguage(savedLanguage);
    } catch (e) {
      console.error('Error loading navbar settings', e);
    }
  }, []);

  const t = translations[language];
  const role = user?.role ? user.role.toLowerCase() : 'student';
  const dashboardHref = role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value as Language;
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <Link href={dashboardHref} className="group flex shrink-0 items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
              <BookOpen className="size-5" />
            </span>
            <span className="hidden text-base font-extrabold tracking-tight text-foreground sm:inline">EduQuizLabs</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link href={dashboardHref} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <LayoutDashboard className="size-4" />
              {t.overview}
            </Link>
            {role === 'teacher' && (
              <Link href="/dashboard/teacher/live-quiz" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
                <Sparkles className="size-4" />
                Live Quiz
              </Link>
            )}
            {role === 'student' && (
              <Link href="/dashboard/student/live-quiz" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">
                <Sparkles className="size-4" />
                Join Live Quiz
              </Link>
            )}
            {role === 'parent' && (
              <Link href="/dashboard/parent/children" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Users className="size-4" />
                {t.children}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden rounded-xl border border-border/70 bg-card/70 px-3 py-1.5 text-right sm:block">
            <div className="max-w-[150px] truncate text-sm font-semibold text-foreground">{user?.fullName || user?.full_name || t.guestUser}</div>
            <div className="text-[11px] font-medium capitalize text-muted-foreground">{t.role}: {role}</div>
          </div>
          <ThemeToggle />
          <select value={language} onChange={handleLanguageChange} aria-label="Select language" className="hidden h-9 rounded-xl border border-border/70 bg-card px-2.5 text-xs font-medium text-foreground outline-none transition focus:ring-2 focus:ring-primary sm:block">
            <option value="en">{t.english}</option>
            <option value="id">{t.indonesian}</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleLogout} className="h-9 gap-2 rounded-xl px-3">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{t.exit}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
