'use client';

import { usePathname } from 'next/navigation';
import { RoleGuard } from '@/components/RoleGuard';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const allowTeacherClassPages = pathname.startsWith('/dashboard/student/classes/');
  const isPublicLiveQuiz = pathname.startsWith('/dashboard/student/live-quiz/');

  // Live quiz sessions are intentionally public so students can join from
  // a teacher's QR code without signing in first.
  if (isPublicLiveQuiz) return <>{children}</>;

  return (
    <RoleGuard role="student" allowTeacherClassPages={allowTeacherClassPages}>
      {children}
    </RoleGuard>
  );
}
