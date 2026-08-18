'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

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
  const [ageError, setAgeError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [role, setRole] = useState<string>('student');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '987240308433-40vrgkfn275ptpl110dqo5dlhk14oa5r.apps.googleusercontent.com',
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-button-div'),
          { theme: 'outline', size: 'large', width: '100%' }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  function validateAgeAndRole(currentAge: string, currentRole: string) {
    const numAge = Number(currentAge);
    if ((currentRole === 'teacher' || currentRole === 'parent') && currentAge !== '' && numAge < 18) {
      setAgeError('Teachers and Parents must be at least 18 years old.');
    } else {
      setAgeError(null);
    }
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setEmail(val);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (val.length > 0 && !emailRegex.test(val)) {
      setEmailError('Please enter a valid email');
    } else {
      setEmailError(null);
    }
  }

  function handleAgeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setAge(val);
    validateAgeAndRole(val, role);
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setRole(val);
    validateAgeAndRole(age, val);
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPassword(val);
    if (val.length > 0 && val.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
    } else {
      setPasswordError(null);
    }
  }

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

      router.push('/');
    } catch (err) {
      setError('Google Sign-Up failed. Please try again.');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
      setLoading(false);
      return;
    }

    const numAge = Number(age);
    if ((role === 'teacher' || role === 'parent') && numAge < 18) {
      setAgeError('Teachers and Parents must be at least 18 years old.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const country = formData.get('country') as string;

    const existingUsers = JSON.parse(localStorage.getItem('edu_users') || '[]');
    const userExists = existingUsers.some((u: any) => u.email === email);
    
    if (userExists) {
      setError('email is already used');
      setLoading(false);
      return;
    }

    const newUser = { fullName, email, age: numAge, country, password, role };
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

        {error && <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md font-medium">{error}</div>}

        <div id="google-button-div" className="flex justify-center w-full"></div>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-muted"></div>
          <span className="px-3 text-xs uppercase text-muted-foreground">Or continue with</span>
          <div className="flex-grow border-t border-muted"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">
              Full Name <span title="required" className="text-red-500 cursor-help">*</span>
            </Label>
            <Input id="fullName" name="fullName" type="text" required placeholder="John Doe" className="h-11 bg-card" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">
                Email <span title="required" className="text-red-500 cursor-help">*</span>
              </Label>
              <Input 
                id="email" 
                name="email" 
                type="text" 
                required 
                value={email}
                onChange={handleEmailChange}
                placeholder="you@school.edu" 
                className={`h-11 bg-card ${emailError ? '!border-red-500 !ring-red-500 text-red-500 focus-visible:ring-red-500' : ''}`} 
              />
              {emailError && <span className="text-xs text-red-500 font-medium">{emailError}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="age">
                Age <span title="required" className="text-red-500 cursor-help">*</span>
              </Label>
              <Input 
                id="age" 
                name="age" 
                type="number" 
                min="1" 
                max="120" 
                required 
                value={age}
                onChange={handleAgeChange}
                placeholder="14" 
                className={`h-11 bg-card ${ageError ? '!border-red-500 !ring-red-500 text-red-500 focus-visible:ring-red-500' : ''}`} 
              />
              {ageError && <span className="text-xs text-red-500 font-medium">{ageError}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="country">
              Country <span title="required" className="text-red-500 cursor-help">*</span>
            </Label>
            <select id="country" name="country" required className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm">
              <option value="" disabled selected>Select your country</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">
                Password <span title="required" className="text-red-500 cursor-help">*</span>
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder="••••••••" 
                  value={password}
                  onChange={handlePasswordChange}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  className={`h-11 bg-card pr-10 ${passwordError ? '!border-red-500 !ring-red-500 text-red-500 focus-visible:ring-red-500' : ''}`} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && <span className="text-xs text-red-500 font-medium">{passwordError}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">
                Confirm Password <span title="required" className="text-red-500 cursor-help">*</span>
              </Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  className="h-11 bg-card pr-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">
              Role <span title="required" className="text-red-500 cursor-help">*</span>
            </Label>
            <select 
              id="role" 
              name="role" 
              value={role}
              onChange={handleRoleChange}
              className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm"
            >
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
