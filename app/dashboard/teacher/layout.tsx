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

    const renameFinishedButton = () => {
      document.querySelectorAll('button').forEach((button) => {
        if (button.textContent?.trim() !== 'Back to Live Quiz') return;
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
          if (node.nodeValue?.trim() === 'Back to Live Quiz') {
            node.nodeValue = 'Back to Dashboard';
            break;
          }
        }
      });
    };

    const handleFinishedBack = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;
      const label = button.textContent?.trim();
      if (label !== 'Back to Dashboard' && label !== 'Back to Live Quiz') return;
      event.preventDefault();
      event.stopPropagation();
      router.push('/dashboard/teacher');
    };

    renameFinishedButton();
    const observer = new MutationObserver(renameFinishedButton);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleFinishedBack, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleFinishedBack, true);
    };
  }, [pathname, router]);

  return (
    <RoleGuard role="teacher">
      {children}
      <LiveQuizTeacherReveal />
    </RoleGuard>
  );
}
