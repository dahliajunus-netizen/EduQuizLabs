'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const country = formData.get('country') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const role = formData.get('role') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('edu_users') || '[]');
    const userExists = existingUsers.some((u: any) => u.email === email);
    
    if (userExists) {
      setError('An account with this email already exists.');
      setLoading(false);
      return;
    }

    const newUser = { fullName, email, country, password, role };
    existingUsers.push(newUser);
    localStorage.setItem('edu_users', JSON.stringify(existingUsers));

    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 800);
  }

  function handleGoogleSignUp() {
    const googleName = prompt("Enter your Google account full name:");
    if (!googleName) return;
    const googleEmail = prompt("Enter your Google account email:");
    if (!googleEmail) return;

    const existingUsers = JSON.parse(localStorage.getItem('edu_users') || '[]');
    let user = existingUsers.find((u: any) => u.email === googleEmail);

    if (!user) {
      user = { fullName: googleName, email: googleEmail, country: 'United States', password: 'oauth_google_user', role: 'student' };
      existingUsers.push(user);
      localStorage.setItem('edu_users', JSON.stringify(existingUsers));
    }

    alert(`Successfully signed up with Google as ${googleName}!`);
    router.push('/');
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left Branding Panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-1/2 bg-[#0070f3] p-12 text-white">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            🎓
          </div>
          <span>EduQuizLabs</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold font-serif mb-4 leading-tight">Where curiosity becomes knowledge.</h1>
          <p className="text-blue-100 text-base">The quiz platform built for educators and learners who want to measure what really matters.</p>
          <ul className="mt-8 space-y-3 text-sm text-blue-50">
            <li className="flex items-center gap-2">✓ Build adaptive quizzes in minutes</li>
            <li className="flex items-center gap-2">✓ Track mastery with live analytics</li>
            <li className="flex items-center gap-2">✓ Share with your class in one click</li>
          </ul>
        </div>
        <p className="text-sm text-blue-200">Trusted by 12,000+ classrooms worldwide</p>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 p-6 sm:p-12 bg-background min-h-screen overflow-y-auto">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md mx-auto space-y-6 my-auto py-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
            <p className="text-sm text-muted-foreground">Enter your details to get started.</p>
          </div>

          {error && <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md">{error}</div>}

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="flex items-center justify-center gap-3 w-full h-11 rounded-md border border-input bg-card text-foreground text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.14v3.14C3.15 21.36 7.23 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.14C.41 8.1 0 9.77 0 11.5s.41 3.4 1.14 4.88l4.13-3.14z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.15 2.64 1.14 6.62l4.13 3.14c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            Sign up with Google
          </button>

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-muted"></div>
            <span className="px-3 text-xs uppercase text-muted-foreground">Or continue with</span>
            <div className="flex-grow border-t border-muted"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" type="text" required placeholder="John Doe" className="h-11 bg-card" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@school.edu" className="h-11 bg-card" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <select id="country" name="country" required className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm">
                <option value="" disabled selected>Select your country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required placeholder="••••••••" className="h-11 bg-card" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required placeholder="••••••••" className="h-11 bg-card" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Role</Label>
              <select id="role" name="role" className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full text-base mt-2">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-6">
          By signing up you agree to our <a href="#" className="underline hover:text-foreground">Terms</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
