'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: August 14, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We collect information that you directly provide when registering for an account or using EduQuizLabs:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Info:</strong> Full name, email address, country, and selected account role (student/teacher).</li>
              <li><strong>Authentication Data:</strong> Securely hashed passwords and Google OAuth tokens.</li>
              <li><strong>Quiz Performance:</strong> Quiz responses, scores, and completion times to provide learning analytics.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>
              We use collected information solely to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Manage your account and authenticate your sign-ins.</li>
              <li>Deliver quiz results and performance insights to students and educators.</li>
              <li>Improve platform functionality and maintain server security.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Student Privacy Safeguards</h2>
            <p>
              We take student privacy extremely seriously. We do not sell user data to third-party advertisers or use educational data for targeted commercial marketing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Data Storage & Security</h2>
            <p>
              Your personal information is stored securely. Passwords are non-reversibly encrypted (hashed) before being stored in our account database.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Your Data Rights</h2>
            <p>
              You have the right to request a copy of your personal data or request that your account be permanently deleted from our servers. Contact us at{' '}
              <a href="mailto:privacy@eduquizlabs.com" className="text-primary underline">
                privacy@eduquizlabs.com
              </a>{' '}
              for any data requests.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
