'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, BookOpen, Users, LogOut } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      // Read the active signed-in user session securely
      const rawUser = localStorage.getItem('current_user');
      if (rawUser) {
        setUser(JSON.parse(rawUser));
      }
    } catch (e) {
      console.error('Error loading user session in navbar', e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    router.push('/');
  };

  const role = user?.role ? user.role.toLowerCase() : 'student';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href={`/dashboard/${role}`} className="flex items-center gap-2 font-bold text-lg text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>EduPortal</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href={`/dashboard/${role}`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <LayoutDashboard size={16} /> Overview
            </Link>
            {role === 'parent' && (
              <Link href="/dashboard/parent/children" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                <Users size={16} /> Children
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium text-foreground">{user?.fullName || user?.full_name || 'Guest User'}</span>
            <span className="text-xs text-muted-foreground capitalize">Role: {role}</span>
          </div>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut size={16} /> Exit
          </Button>
        </div>
      </div>
    </header>
  );
}
