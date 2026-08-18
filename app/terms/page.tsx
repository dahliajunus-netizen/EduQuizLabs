'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

function TermsContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const isFromSignIn = from === 'signin';
  const backHref = isFromSignIn ? '/' : '/sign-up';
  const backLabel = isFromSignIn ? 'Back to Sign In' : 'Back to Sign Up';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <ThemeToggle />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: August 14, 2026
        </p>
      </div>

      {/* Content */}
      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using EduQuizLabs, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, please do not use our services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. Account Registration & Security</h2>
          <p>
            You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. User Responsibilities & Rules</h2>
          <p>
            When using EduQuizLabs, you agree not to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Upload or share unlawful, harmful, or abusive content.</li>
            <li>Attempt to gain unauthorized access to our servers or databases.</li>
            <li>Use automated scripts or bots to collect quiz data or disrupt services.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Educational Content & Intellectual Property</h2>
          <p>
            Teachers and creators retain ownership of the original content they author on EduQuizLabs. By publishing content, you grant EduQuizLabs a license to display and distribute it within the platform to your assigned students or classes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Termination</h2>
          <p>
            We reserve the right to suspend or terminate access to your account at any time for violations of these Terms of Service without prior notice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. Contact Us</h2>
          <p>
            If you have questions regarding these terms, please reach out to us at{' '}
            <a href="mailto:support@eduquizlabs.com" className="text-primary underline">
              support@eduquizlabs.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-12">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <TermsContent />
      </Suspense>
    </div>
  );
}
