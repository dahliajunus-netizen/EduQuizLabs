'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LegacyClassTestsRedirect() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params?.code || '');

  useEffect(() => {
    let role = 'student';
    try {
      const raw = localStorage.getItem('current_user') || localStorage.getItem('eduquizlabs_user') || '{}';
      const user = JSON.parse(raw);
      if (String(user?.role || '').toLowerCase() === 'teacher') role = 'teacher';
    } catch {}
    router.replace(`/dashboard/${role}/tests`);
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-background"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin"/>Opening tests…</div></main>;
}
