import { RoleGuard } from '@/components/RoleGuard';
import LiveQuizTeacherReveal from '@/components/live-quiz-teacher-reveal';

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard role="teacher">
      {children}
      <LiveQuizTeacherReveal />
    </RoleGuard>
  );
}
