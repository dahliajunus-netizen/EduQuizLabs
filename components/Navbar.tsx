'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, BookOpen, Users, LogOut, Sparkles, Menu, X, Languages } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import type { Language } from '@/lib/translations';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, setLanguage, t, languages } = useLanguage();

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('current_user');
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch (e) {
      console.error('Error loading navbar settings', e);
    }
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const role = user?.role ? user.role.toLowerCase() : 'student';
  const dashboardHref = role === 'teacher' ? '/dashboard/teacher' : role === 'parent' ? '/dashboard/parent' : '/dashboard/student';

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(event.target.value as Language);
  };

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    router.push('/');
  };

  const navItems = [
    { href: dashboardHref, label: t('overview'), icon: LayoutDashboard },
    ...(role === 'teacher' ? [{ href: '/dashboard/teacher/live-quiz', label: 'Live Quiz', icon: Sparkles }] : []),
    ...(role === 'student' ? [{ href: '/dashboard/student/live-quiz', label: 'Join Live Quiz', icon: Sparkles }] : []),
    ...(role === 'parent' ? [{ href: '/dashboard/parent/children', label: t('children'), icon: Users }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 shadow-sm backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:h-[68px] sm:px-6 sm:py-0 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-5">
          <Link href={dashboardHref} className="group flex min-w-0 shrink-0 items-center gap-2.5" aria-label="EduQuizLabs dashboard">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition duration-200 group-hover:scale-105 group-hover:shadow-lg">
              <BookOpen className="size-5" />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </span>
            <span className="hidden text-base font-black tracking-tight text-foreground sm:inline">EduQuizLabs</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== dashboardHref && pathname.startsWith(href));
              return (
                <Link key={href} href={href} className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <Icon className="size-4" />
                  {label}
                  {active && <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="hidden max-w-[190px] rounded-xl border border-border/70 bg-card/70 px-3 py-1.5 text-right shadow-sm sm:block">
            <div className="truncate text-sm font-bold text-foreground">{user?.fullName || user?.full_name || t('guestUser')}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{role}</div>
          </div>
          <ThemeToggle />

          <div className="flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-card px-2 shadow-sm transition hover:border-primary/50 hover:bg-muted/60 focus-within:ring-2 focus-within:ring-primary">
            <Languages className="size-4 shrink-0 text-muted-foreground" />
            <select
              value={language}
              onChange={handleLanguageChange}
              aria-label="Select language"
              title="Select language"
              className="h-full min-w-[120px] cursor-pointer bg-transparent text-xs font-semibold text-foreground outline-none"
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>{item.nativeName}</option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={handleLogout} className="hidden h-9 gap-2 rounded-xl px-3 sm:flex">
            <LogOut className="size-4" />
            <span>{t('exit')}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setMobileOpen(v => !v)} className="size-10 shrink-0 rounded-xl md:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-lg backdrop-blur-xl md:hidden">
          <nav className="space-y-1" aria-label="Mobile navigation">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== dashboardHref && pathname.startsWith(href));
              return (
                <Link key={href} href={href} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <Icon className="size-5 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 border-t border-border/60 pt-3">
            <select
              value={language}
              onChange={handleLanguageChange}
              aria-label="Select language"
              className="h-11 min-w-0 rounded-xl border border-border/70 bg-card px-3 text-sm font-semibold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>{item.nativeName}</option>
              ))}
            </select>
            <Button variant="outline" onClick={handleLogout} className="h-11 gap-2 rounded-xl px-4">
              <LogOut className="size-4" />
              <span>{t('exit')}</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
