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
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <Link href={backHref} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <ThemeToggle />
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 28, 2026</p>
      </div>

      <div className="space-y-7 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By creating an account or using EduQuizLabs, you agree to these Terms of Service. If you do not agree with these terms, do not use the service.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. The Service</h2>
          <p>EduQuizLabs is an educational platform that allows students and educators to create, join, manage, and complete courses, assignments, tests, quizzes, and live quizzes. Features may be added, changed, temporarily unavailable, or removed as the platform develops.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. Accounts & Security</h2>
          <p>You must provide accurate information when creating an account, including the information requested during registration. Keep your password and other account credentials private. You are responsible for activity performed through your account and should notify us if you believe your account has been accessed without permission.</p>
          <p>Account roles and registration requirements are determined by EduQuizLabs and may differ between students and teachers.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Educational Content</h2>
          <p>Users remain responsible for content they create or upload, including questions, answers, course materials, assignments, images, links, and other educational material. You should only upload or share material that you have the right to use.</p>
          <p>By submitting content to EduQuizLabs, you give EduQuizLabs permission to store, display, reproduce, and distribute that content as reasonably necessary to operate the platform and provide it to the classes, students, teachers, or other users for whom it was intended.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use the platform for unlawful, fraudulent, abusive, threatening, or harmful purposes.</li>
            <li>Upload malicious code or intentionally interfere with the platform.</li>
            <li>Attempt to access another user's account, private data, or restricted systems without authorization.</li>
            <li>Use automated tools to scrape, copy, overload, or disrupt the service without permission.</li>
            <li>Submit content that infringes another person's intellectual-property, privacy, or other rights.</li>
            <li>Misrepresent your identity, role, or authority within a class or course.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. Classes, Tests & Live Quizzes</h2>
          <p>Teachers are responsible for the educational content and settings they publish. Students are responsible for completing activities using their own account and following the instructions of their teacher or school.</p>
          <p>Join codes and class access information should not be intentionally shared with people who are not authorized to participate.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">7. Student & School Use</h2>
          <p>EduQuizLabs may be used in school and educational settings, including by students. Where a school, teacher, parent, or other authorized adult is responsible for a student's use of an educational service, they should provide any permissions or supervision required by their applicable rules and laws.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">8. Intellectual Property</h2>
          <p>The EduQuizLabs name, software, design, branding, and platform features are owned by their respective rights holders and may not be copied, modified, or redistributed without permission. User-created educational content remains subject to the rights of its creator and any third parties whose material is included.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">9. Third-Party Services</h2>
          <p>EduQuizLabs relies on third-party infrastructure and services to operate parts of the platform. Your use of those features may also be subject to the third party's terms and policies. We are not responsible for services or content controlled by third parties.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">10. Availability & Disclaimers</h2>
          <p>EduQuizLabs is provided on an availability basis. We do not guarantee that the service will always be uninterrupted, error-free, secure, or available at every location or time. Educational results, grades, scores, and analytics should be reviewed by the appropriate educator or user and are not guaranteed to be accurate in every circumstance.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">11. Account Suspension or Termination</h2>
          <p>We may restrict, suspend, or terminate access when reasonably necessary to protect the platform, users, or third parties, or when an account violates these Terms. Users may stop using the service at any time. Requests to delete an account or associated personal data can be made using the contact information below.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">12. Changes to These Terms</h2>
          <p>We may update these Terms as EduQuizLabs changes or new requirements arise. The “Last updated” date at the top of this page shows when the current version was published. Continued use of EduQuizLabs after an updated version is posted means you accept the updated Terms, to the extent permitted by applicable law.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">13. Contact Us</h2>
          <p>For questions about these Terms of Service, contact us at <a href="mailto:support@eduquizlabs.com" className="text-primary underline">support@eduquizlabs.com</a>.</p>
        </section>

        <p className="border-t border-border pt-6 text-xs">This document is intended to describe how EduQuizLabs is operated and is not a substitute for legal advice.</p>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground sm:p-12">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <TermsContent />
      </Suspense>
    </div>
  );
}
