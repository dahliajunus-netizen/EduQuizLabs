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

  return (
    <RoleGuard role="student" allowTeacherClassPages={allowTeacherClassPages}>
      {children}
    </RoleGuard>
  );
}
