import Link from 'next/link';
import { ClipboardList } from 'lucide-react';

export default function ClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { code: string };
}) {
  const code = encodeURIComponent(params.code || '');

  return (
    <>
      {children}
      <Link
        href={`/dashboard/student/classes/${code}/tests`}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
      >
        <ClipboardList className="size-4" />
        Tests
      </Link>
    </>
  );
}
