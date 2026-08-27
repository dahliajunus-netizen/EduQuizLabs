'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

function PrivacyContent() {
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
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 28, 2026</p>
      </div>

      <div className="space-y-7 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Overview</h2>
          <p>This Privacy Policy explains what information EduQuizLabs collects, why we use it, how it may be shared, and the choices available to users. EduQuizLabs is an educational platform for students and educators.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
          <p>Depending on how you use the platform, we may collect:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Account information:</strong> full name, email address, country, date of birth, age, and account role such as student or teacher.</li>
            <li><strong>Authentication information:</strong> password credentials handled by our authentication system. Passwords are stored in hashed form rather than as readable passwords.</li>
            <li><strong>Educational activity:</strong> classes joined or created, courses, tests, quizzes, assignments, answers, scores, submissions, completion information, and related learning activity.</li>
            <li><strong>User-created content:</strong> questions, answers, course materials, assignments, images, links, and other content submitted to the platform.</li>
            <li><strong>Technical information:</strong> information that may be generated when the service is used, such as browser/device information, request information, security logs, and basic usage information.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. How We Use Information</h2>
          <p>We use information to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Create and manage accounts and authenticate users.</li>
            <li>Provide courses, classes, tests, assignments, quizzes, live quizzes, results, and educational analytics.</li>
            <li>Connect students with the classes and educational content they are authorized to access.</li>
            <li>Maintain platform reliability, prevent abuse, investigate security incidents, and troubleshoot problems.</li>
            <li>Improve the usability, performance, and functionality of EduQuizLabs.</li>
            <li>Respond to support requests and privacy or account-related requests.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Educational & Student Privacy</h2>
          <p>EduQuizLabs is designed for educational use and may process information relating to students and their learning activity. We do not sell personal information or educational records to advertisers, and we do not use student educational data for targeted advertising.</p>
          <p>Teachers, schools, parents, and other authorized adults remain responsible for using the platform in accordance with the policies and permissions that apply to their educational setting. Where applicable, they should ensure that students have the appropriate authorization to use the service.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. How Information Is Shared</h2>
          <p>We may share or disclose information only as reasonably necessary to operate the service, including:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Within EduQuizLabs:</strong> information may be visible to teachers, students, or other class participants when required for the educational features they are using.</li>
            <li><strong>Service providers:</strong> trusted infrastructure, hosting, authentication, analytics, database, security, and other providers may process information on our behalf.</li>
            <li><strong>Legal and safety requirements:</strong> information may be disclosed when reasonably necessary to comply with applicable law, protect users, protect the platform, or respond to valid legal requests.</li>
          </ul>
          <p>We do not sell personal information to third-party advertisers.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">6. Third-Party Services</h2>
          <p>EduQuizLabs uses third-party services to operate parts of the platform. The current application uses Supabase for authentication/database infrastructure and Vercel Analytics for basic product analytics. These providers may process information according to their own privacy policies and contractual arrangements with the service.</p>
          <p>EduQuizLabs also uses Google Translate to provide the English/Indonesian language-switching feature. When translation is enabled, the Google translation service may process page content and use translation-related cookies or similar technologies.</p>
          <p>EduQuizLabs does not currently use Google OAuth as a sign-in method.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">7. Cookies, Local Storage & Similar Technologies</h2>
          <p>The platform may use browser storage and cookies to keep necessary preferences and session-related information. For example, language preferences may be stored locally, and Google Translate may use its own translation cookie when the translation feature is used.</p>
          <p>Browser settings can be used to restrict or clear cookies and local storage, although doing so may affect some platform features.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">8. Data Security</h2>
          <p>We use reasonable technical and organizational measures intended to protect information against unauthorized access, alteration, disclosure, or destruction. No online service can guarantee absolute security, so users should also protect their passwords and account credentials.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">9. Data Retention & Deletion</h2>
          <p>We retain information for as long as reasonably necessary to provide the service, maintain security and records, resolve disputes, enforce our terms, or satisfy applicable legal requirements. Retention periods may vary depending on the type of information and the purpose for which it is used.</p>
          <p>You may request deletion of your account and associated personal information by contacting us. Some information may need to be retained where required by law or reasonably necessary for legitimate operational, security, or dispute-resolution purposes.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">10. Your Privacy Choices & Rights</h2>
          <p>Depending on where you live and the laws that apply to you, you may have rights to request access to, correction of, or deletion of personal information, or to object to or restrict certain processing. You may also ask questions about how your information is used.</p>
          <p>To make a privacy or data request, contact <a href="mailto:privacy@eduquizlabs.com" className="text-primary underline">privacy@eduquizlabs.com</a>. We may need enough information to verify and safely process a request.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">11. International Use</h2>
          <p>EduQuizLabs may be accessed from different countries, and information may be processed or stored by service providers in countries other than the country where a user lives. By using the service, users acknowledge that such processing may occur, subject to applicable privacy requirements.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">12. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy when the platform, its features, or applicable requirements change. The “Last updated” date at the top of this page identifies the current version. Material changes will be reflected in the updated policy.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">13. Contact Us</h2>
          <p>For privacy questions, data requests, or concerns, contact <a href="mailto:privacy@eduquizlabs.com" className="text-primary underline">privacy@eduquizlabs.com</a>. For general service or account support, contact <a href="mailto:support@eduquizlabs.com" className="text-primary underline">support@eduquizlabs.com</a>.</p>
        </section>

        <p className="border-t border-border pt-6 text-xs">This policy is intended to explain the current operation of EduQuizLabs and is not a substitute for legal advice.</p>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground sm:p-12">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <PrivacyContent />
      </Suspense>
    </div>
  );
}
