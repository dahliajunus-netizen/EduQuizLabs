import { GraduationCap, CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { ThemeToggle } from '@/components/theme-toggle'

const highlights = [
  'Build adaptive quizzes in minutes',
  'Track mastery with live analytics',
  'Share with your class in one click',
]

export default function Page() {
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative flex min-h-[430px] flex-col justify-between overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 size-[28rem] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '42px 42px' }} />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-foreground/15 shadow-lg ring-1 ring-primary-foreground/10 backdrop-blur-sm">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <span className="block text-lg font-extrabold tracking-tight">EduQuizLabs</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/55">Learn · Create · Compete</span>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-primary-foreground/10 sm:flex">
            <Sparkles className="size-3.5" /> Built for classrooms
          </span>
        </div>

        <div className="relative z-10 my-12 max-w-xl lg:my-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-bold ring-1 ring-primary-foreground/10">
            <ShieldCheck className="size-3.5" /> Education, simplified
          </div>
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Where curiosity becomes knowledge.
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-primary-foreground/70 sm:text-lg">
            A modern quiz platform for educators and learners who want to make every question count.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:max-w-md">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-2xl bg-primary-foreground/[0.07] px-4 py-3 text-sm font-medium ring-1 ring-primary-foreground/10 backdrop-blur-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <CheckCircle2 className="size-4" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-end justify-between gap-5">
          <p className="max-w-sm text-xs leading-5 text-primary-foreground/50 sm:text-sm">
            Trusted by SMP Labschool Cibubur to represent the school in ISIF
          </p>
          <ArrowRight className="hidden size-5 text-primary-foreground/35 sm:block" />
        </div>
      </section>

      <section className="relative flex min-h-[570px] items-center justify-center overflow-hidden px-5 py-12 sm:px-10 lg:min-h-screen lg:px-16">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>

        <div className="relative w-full max-w-md">
          <div className="mb-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 lg:hidden">
              <GraduationCap className="size-5" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">Welcome back</p>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Sign in to EduQuizLabs</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Continue to your classes, tests, assignments, and live quizzes.</p>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-7">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  )
}
