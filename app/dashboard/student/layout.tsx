import { RoleGuard } from '@/components/RoleGuard';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard role="student">{children}</RoleGuard>;
}
