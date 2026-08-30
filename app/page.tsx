import { GraduationCap, CheckCircle2 } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { ThemeToggle } from '@/components/theme-toggle'

const highlights = ['Create quizzes and tests', 'Track student grades', 'Share with your class']

export default function Page() {
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-[520px] flex-col overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:min-h-screen lg:px-14 lg:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[30rem] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 size-[32rem] rounded-full bg-primary-foreground/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/10">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">EduQuizLabs</span>
        </div>

        <div className="relative z-10 flex flex-1 items-center py-14 lg:py-20">
          <div className="w-full max-w-xl">
            <h1 className="text-balance text-5xl font-normal italic leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl" style={{ fontFamily: 'Georgia, serif' }}>
              Where curiosity becomes knowledge
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-primary-foreground/75 sm:text-lg">
              Create, share, and manage quizzes, tests, and assignments in one place.
            </p>

            <ul className="mt-10 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2.5 rounded-xl bg-primary-foreground/[0.07] px-4 py-3 text-sm font-medium ring-1 ring-primary-foreground/10">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[560px] items-center justify-center px-5 py-12 sm:px-10 lg:min-h-screen lg:px-16">
        <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md pt-8 lg:pt-0">
          <div className="mb-7">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 lg:hidden">
              <GraduationCap className="size-5" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">Welcome back to EduQuizLabs.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  )
}
