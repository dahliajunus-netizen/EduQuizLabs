'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type AppRole = 'teacher' | 'student';

type CurrentUser = {
  role?: string | null;
};

export function RoleGuard({
  role,
  children,
  allowTeacherClassPages = false,
}: {
  role: AppRole;
  children: React.ReactNode;
  allowTeacherClassPages?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function checkAccess() {
      try {
        // Authentication is now stored in HttpOnly cookies, so the browser
        // cannot read the access token. The profile in current_user is only
        // used here for client-side routing/UI gating; protected API routes
        // perform the real server-side authentication and authorization.
        const raw = localStorage.getItem('current_user');
        if (!raw) {
          router.replace('/');
          return;
        }

        const user: CurrentUser = JSON.parse(raw);
        const actualRole = String(user?.role ?? '').trim().toLowerCase();

        // Teacher class pages live under /dashboard/student/classes/[code]
        // for historical reasons. They are shared class-management pages,
        // not the student dashboard itself.
        const isTeacherClassPage =
          allowTeacherClassPages &&
          role === 'student' &&
          actualRole === 'teacher' &&
          pathname?.startsWith('/dashboard/student/classes/');

        if (actualRole !== role && !isTeacherClassPage) {
          router.replace(`/dashboard/${actualRole === 'teacher' ? 'teacher' : 'student'}`);
          return;
        }

        if (!cancelled) setAllowed(true);
      } catch {
        if (cancelled) return;
        localStorage.removeItem('current_user');
        router.replace('/');
      }
    }

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [role, router, pathname, allowTeacherClassPages]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  return <>{children}</>;
}
