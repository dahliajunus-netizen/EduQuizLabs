'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/RoleGuard';
import LiveQuizTeacherReveal from '@/components/live-quiz-teacher-reveal';

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== '/dashboard/teacher/live-quiz') return;

    const handleFinishedBack = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (button?.textContent?.trim() !== 'Back to Live Quiz') return;
      event.preventDefault();
      event.stopPropagation();
      router.push('/dashboard/teacher');
    };

    document.addEventListener('click', handleFinishedBack, true);
    return () => document.removeEventListener('click', handleFinishedBack, true);
  }, [pathname, router]);

  return (
    <RoleGuard role="teacher">
      {children}
      <LiveQuizTeacherReveal />
    </RoleGuard>
  );
}
