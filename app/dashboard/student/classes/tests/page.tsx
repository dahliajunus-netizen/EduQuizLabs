'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Safety route for /dashboard/student/classes/tests.
 *
 * `classes/[code]` is a dynamic route, so without this static route
 * Next.js interprets "tests" as a class code. The actual test page is:
 * /dashboard/student/classes/[code]/tests
 */
export default function TestsRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/student');
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Returning to your dashboard...
        </div>
      </div>
    </div>
  );
}
