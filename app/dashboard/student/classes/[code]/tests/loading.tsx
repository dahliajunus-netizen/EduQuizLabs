'use client';

import { ClipboardList, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';

export default function TestsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.04]">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="size-6" />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-72 max-w-[70vw] animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="overflow-hidden rounded-3xl">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-80 max-w-[55vw] animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-10 w-28 animate-pulse rounded-xl bg-muted" />
                </div>
                <div className="h-16 animate-pulse rounded-2xl bg-muted/70" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your tests…
        </div>
      </main>
    </div>
  );
}
