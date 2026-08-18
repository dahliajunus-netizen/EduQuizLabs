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
  const [ageError, setAgeError] = useState(false);
  const [loading, setLoading] = useState(false);

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

  function handleGoogleResponse(response: any) {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const googleUser = JSON.parse(jsonPayload);
      
      const existingUsers = JSON.parse(localStorage.getItem('edu_users') || '[]');
      let user = existingUsers.find((u: any) => u.email === googleUser.email);

      if (!user) {
        user = { 
          fullName: googleUser.name, 
          email: googleUser.email, 
          age: 18,
          country: 'United States', 
          password: 'oauth_google_user', 
          role: 'student' 
        };
        existingUsers.push(user);
        localStorage.setItem('edu_users', JSON.stringify(existingUsers));
      }

      alert(`Successfully signed up with Google as ${googleUser.name}!`);
      router.push('/');
    } catch (err) {
      setError('Google Sign-Up failed. Please try again.');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAgeError(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const age = Number(formData.get('age'));
    const country = formData.get('country') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const role = formData.get('role') as string;

    if ((role === 'teacher' || role === 'parent') && age < 18) {
      setAgeError(true);
      setError('Teachers and Parents must be at least 18 years old.');
      setLoading(false);
      return;
    }

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

    const newUser = { fullName, email, age, country, password, role };
    existingUsers.push(newUser);
    localStorage.setItem('edu_users', JSON.stringify(existingUsers));

    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 800);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 py-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
          <p className="text-sm text-muted-foreground">Enter your details to get started.</p>
        </div>

        {error && <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md">{error}</div>}

        <div id="google-button-div" className="flex justify-center w-full"></div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@school.edu" className="h-11 bg-card" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age" 
                name="age" 
                type="number" 
                min="1" 
                max="120" 
                required 
                placeholder="14" 
                className={`h-11 bg-card ${ageError ? '!border-red-500 !ring-red-500 text-red-500' : ''}`} 
              />
            </div>
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
              <option value="parent">Parent</option>
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

        <div className="text-center text-xs text-muted-foreground pt-4">
          By signing up you agree to our <a href="#" className="underline hover:text-foreground">Terms</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
