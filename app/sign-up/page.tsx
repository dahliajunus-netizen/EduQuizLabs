'use client';

import { useState, useEffect } from 'react';
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
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
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

  // Initialize Google SDK Script on load
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-button-div'),
          { theme: 'outline', size: 'large', width: '100%' }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Decodes Google credential response token & sends to backend API
  async function handleGoogleResponse(response: any) {
    try {
      setLoading(true);
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const googleUser = JSON.parse(jsonPayload);

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: googleUser.name,
          email: googleUser.email,
          country: 'United States',
          password: `oauth_google_${googleUser.sub}`,
          role: 'student',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Google Sign-Up failed');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Google Sign-Up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Handles standard email/password form submission
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

    // Minimum character check
    if (password.length < 6) {
      setError('Password must be min 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, country, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-between w-full max-w-lg mx-auto p-6 sm:p-12 bg-background min-h-screen overflow-y-auto">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <div className="w-full space-y-6 my-auto py-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
          <p className="text-sm text-muted-foreground">Enter your details to get started.</p>
        </div>

        {error && (
          <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md border border-red-500/20">
            {error}
          </div>
        )}

        {/* Official Google Sign Up Button */}
        <div className="space-y-3">
          <div id="google-button-div" className="flex justify-center w-full min-h-[40px]"></div>
        </div>

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
            <select
              id="country"
              name="country"
              required
              defaultValue=""
              className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select your country</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="h-11 bg-card focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground">Password must be min 6 characters</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="h-11 bg-card focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role</Label>
            <select id="role" name="role" defaultValue="student" className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
  );
}
