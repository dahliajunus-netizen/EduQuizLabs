'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLiveQuizEntry() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/join?from=dashboard');
  }, [router]);

  return null;
}
