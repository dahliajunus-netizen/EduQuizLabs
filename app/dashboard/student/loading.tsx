'use client'

const shimmer = 'animate-pulse bg-muted/70'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className={`h-8 w-32 rounded-lg ${shimmer}`} />
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-lg ${shimmer}`} />
            <div className={`h-9 w-24 rounded-lg ${shimmer}`} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-2">
          <div className={`h-8 w-48 rounded-lg ${shimmer}`} />
          <div className={`h-4 w-72 rounded ${shimmer}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`h-32 rounded-xl ${shimmer}`} />
          <div className={`h-32 rounded-xl ${shimmer}`} />
          <div className={`h-32 rounded-xl ${shimmer}`} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border p-5">
            <div className={`h-6 w-40 rounded ${shimmer}`} />
            <div className={`h-20 w-full rounded-lg ${shimmer}`} />
            <div className={`h-20 w-full rounded-lg ${shimmer}`} />
            <div className={`h-20 w-full rounded-lg ${shimmer}`} />
          </div>
          <div className="space-y-4 rounded-xl border p-5">
            <div className={`h-6 w-36 rounded ${shimmer}`} />
            <div className={`h-20 w-full rounded-lg ${shimmer}`} />
            <div className={`h-20 w-full rounded-lg ${shimmer}`} />
            <div className={`h-20 w-full rounded-lg ${shimmer}`} />
          </div>
        </div>
      </main>
    </div>
  )
}
