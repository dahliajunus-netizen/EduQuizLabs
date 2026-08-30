import { GraduationCap, CheckCircle2 } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { ThemeToggle } from '@/components/theme-toggle'

const highlights = [
  'Create quizzes and tests',
  'Track student grades',
  'Share with your class',
]

export default function Page() {
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative flex min-h-[430px] flex-col justify-between overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 size-[28rem] rounded-full bg-primary-foreground/10 blur-3xl" />

        <div className="relative z-10 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/10">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">EduQuizLabs</span>
        </div>

        <div className="relative z-10 mx-auto my-12 w-full max-w-xl text-center lg:my-0">
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Quizzes made simple.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-primary-foreground/70 sm:text-lg">
            Create, share, and manage quizzes, tests, and assignments in one place.
          </p>

          <ul className="mx-auto mt-8 grid w-full max-w-md gap-3 sm:max-w-xl sm:grid-cols-3 lg:max-w-md lg:grid-cols-1">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-2xl bg-primary-foreground/[0.07] px-4 py-3 text-left text-sm font-medium ring-1 ring-primary-foreground/10">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <CheckCircle2 className="size-4" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative flex min-h-[570px] items-center justify-center overflow-hidden px-5 py-12 sm:px-10 lg:min-h-screen lg:px-16">
        <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>

        <div className="relative w-full max-w-md">
          <div className="mb-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 lg:hidden">
              <GraduationCap className="size-5" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Sign in to EduQuizLabs</h2>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-7">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  )
}
