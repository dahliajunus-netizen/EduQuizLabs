'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function TestsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-destructive/[0.03]">
      <Navbar />
      <main className="flex min-h-[75vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg overflow-hidden rounded-3xl shadow-lg">
          <CardContent className="p-8 text-center sm:p-10">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-8" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-destructive">Test system error</p>
            <h1 className="mt-2 text-2xl font-black">We couldn't load this page</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Something went wrong while loading the tests. Try again, or return to the class.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
              <Button onClick={() => reset()} className="rounded-xl">
                <RefreshCw className="mr-2 size-4" />
                Try Again
              </Button>
              <Link href="..">
                <Button variant="outline" className="w-full rounded-xl sm:w-auto">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Class
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
