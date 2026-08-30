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
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative flex min-h-[430px] flex-col overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 size-[28rem] rounded-full bg-primary-foreground/10 blur-3xl" />

        <div className="relative z-10 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/10">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">EduQuizLabs</span>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="mx-auto w-full max-w-2xl text-center">
            <h1
              className="text-balance text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'cursive' }}
            >
              Where curiosity becomes knowledge
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-foreground/70 sm:text-xl">
              Create, share, and manage quizzes, tests, and assignments in one place.
            </p>

            <ul className="mx-auto mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <li key={item} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-primary-foreground/[0.07] px-4 py-4 text-center text-base font-medium ring-1 ring-primary-foreground/10">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
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
