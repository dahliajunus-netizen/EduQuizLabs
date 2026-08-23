'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList } from 'lucide-react';

export default function ClassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';

  // Read the actual class code from the current URL.
  // This prevents "tests" from accidentally being used as the class code.
  const match = pathname.match(/^\/dashboard\/student\/classes\/([^/]+)/);
  const classCode = match?.[1] ? decodeURIComponent(match[1]) : '';

  const testsHref = classCode
    ? `/dashboard/student/classes/${encodeURIComponent(classCode)}/tests`
    : '/dashboard/student';

  return (
    <>
      {children}

      {classCode && (
        <Link
          href={testsHref}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
        >
          <ClipboardList className="size-4" />
          Tests
        </Link>
      )}
    </>
  );
}
