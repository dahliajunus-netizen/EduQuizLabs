'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type AppRole = 'teacher' | 'student';

type CurrentUser = {
  role?: string | null;
};

export function RoleGuard({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('current_user');
      if (!raw) {
        router.replace('/login');
        return;
      }

      const user: CurrentUser = JSON.parse(raw);
      const actualRole = String(user?.role ?? '').trim().toLowerCase();

      if (actualRole !== role) {
        router.replace(`/dashboard/${actualRole === 'teacher' ? 'teacher' : 'student'}`);
        return;
      }

      setAllowed(true);
    } catch {
      localStorage.removeItem('current_user');
      router.replace('/login');
    }
  }, [role, router]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  return <>{children}</>;
}
