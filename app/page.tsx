import { GraduationCap, CheckCircle2 } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { ThemeToggle } from '@/components/theme-toggle'

const highlights = [
  'Build adaptive quizzes in minutes',
  'Track mastery with live analytics',
  'Share with your class in one click',
]

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-primary px-8 py-10 text-primary-foreground lg:w-[46%] lg:px-14 lg:py-14">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">EduQuizLabs</span>
        </div>

        <div className="relative z-10 my-12 max-w-md lg:my-0">
          <h1 className="text-pretty font-serif text-4xl leading-[1.1] lg:text-5xl">
            Where curiosity becomes knowledge.
          </h1>
          <p className="mt-4 text-pretty leading-relaxed text-primary-foreground/70">
            The quiz platform built for educators and learners who want to measure
            what really matters.
          </p>

          <ul className="mt-8 flex flex-col gap-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-primary-foreground/85">
                <CheckCircle2 className="size-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-primary-foreground/60">
          Trusted by 12,000+ classrooms worldwide
        </p>

        {/* Decorative grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </section>

      {/* Form panel */}
      <section className="relative flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="absolute right-6 top-6 sm:right-10 sm:top-8">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <header className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue to your dashboard.
            </p>
          </header>

          <LoginForm />

          <p className="mt-10 text-center text-xs text-muted-foreground">
            By signing in you agree to our{' '}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  )
}
