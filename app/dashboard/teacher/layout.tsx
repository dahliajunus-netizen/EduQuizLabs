import { RoleGuard } from '@/components/RoleGuard';

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard role="teacher">{children}</RoleGuard>;
}
