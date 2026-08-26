'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleGuard } from '@/components/RoleGuard';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const allowTeacherClassPages = pathname.startsWith('/dashboard/student/classes/');
  const isTestPage = /^\/dashboard\/student\/tests\/[^/]+$/.test(pathname);

  return (
    <RoleGuard role="student" allowTeacherClassPages={allowTeacherClassPages}>
      {children}
      {isTestPage && (
        <Link
          href="/dashboard/student"
          className="fixed bottom-6 left-6 z-50 inline-flex items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-md transition-colors hover:bg-muted"
        >
          ← Back to Dashboard
        </Link>
      )}
    </RoleGuard>
  );
}
