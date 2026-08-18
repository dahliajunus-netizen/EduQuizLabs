'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

const countriesWithFlags = [
  { name: "Afghanistan", flag: "🇦🇫" }, { name: "Albania", flag: "🇦🇱" }, { name: "Algeria", flag: "🇩🇿" }, { name: "Andorra", flag: "🇦🇩" }, { name: "Angola", flag: "🇦🇴" }, { name: "Antigua and Barbuda", flag: "🇦🇬" }, { name: "Argentina", flag: "🇦🇷" }, { name: "Armenia", flag: "🇦🇲" }, { name: "Australia", flag: "🇦🇺" }, { name: "Austria", flag: "🇦🇹" }, { name: "Azerbaijan", flag: "🇦🇿" },
  { name: "Bahamas", flag: "🇧🇸" }, { name: "Bahrain", flag: "🇧🇭" }, { name: "Bangladesh", flag: "🇧🇩" }, { name: "Barbados", flag: "🇧🇧" }, { name: "Belarus", flag: "🇧🇾" }, { name: "Belgium", flag: "🇧🇪" }, { name: "Belize", flag: "🇧🇿" }, { name: "Benin", flag: "🇧🇯" }, { name: "Bhutan", flag: "🇧🇹" }, { name: "Bolivia", flag: "🇧🇴" }, { name: "Bosnia and Herzegovina", flag: "🇧🇦" }, { name: "Botswana", flag: "🇧🇼" }, { name: "Brazil", flag: "🇧🇷" }, { name: "Brunei", flag: "🇧🇳" }, { name: "Bulgaria", flag: "🇧🇬" }, { name: "Burkina Faso", flag: "🇧🇫" }, { name: "Burundi", flag: "🇧🇮" },
  { name: "Cabo Verde", flag: "🇨🇻" }, { name: "Cambodia", flag: "🇰🇭" }, { name: "Cameroon", flag: "🇨🇲" }, { name: "Canada", flag: "🇨🇦" }, { name: "Central African Republic", flag: "🇨🇫" }, { name: "Chad", flag: "🇹🇩" }, { name: "Chile", flag: "🇨🇱" }, { name: "China", flag: "🇨🇳" }, { name: "Colombia", flag: "🇨🇴" }, { name: "Comoros", flag: "🇰🇲" }, { name: "Congo", flag: "🇨🇬" }, { name: "Costa Rica", flag: "🇨🇷" }, { name: "Croatia", flag: "🇭🇷" }, { name: "Cuba", flag: "🇨🇺" }, { name: "Cyprus", flag: "🇨🇾" }, { name: "Czechia", flag: "🇨🇿" },
  { name: "Denmark", flag: "🇩🇰" }, { name: "Djibouti", flag: "🇩🇯" }, { name: "Dominica", flag: "🇩🇲" }, { name: "Dominican Republic", flag: "🇩🇴" },
  { name: "Ecuador", flag: "🇪🇨" }, { name: "Egypt", flag: "🇪🇬" }, { name: "El Salvador", flag: "🇸🇻" }, { name: "Equatorial Guinea", flag: "🇬🇶" }, { name: "Eritrea", flag: "🇪🇷" }, { name: "Estonia", flag: "🇪🇪" }, { name: "Eswatini", flag: "🇸🇿" }, { name: "Ethiopia", flag: "🇪🇹" },
  { name: "Fiji", flag: "🇫🇯" }, { name: "Finland", flag: "🇫🇮" }, { name: "France", flag: "🇫🇷" },
  { name: "Gabon", flag: "🇬🇦" }, { name: "Gambia", flag: "🇬🇲" }, { name: "Georgia", flag: "🇬🇪" }, { name: "Germany", flag: "🇩🇪" }, { name: "Ghana", flag: "🇬🇭" }, { name: "Greece", flag: "🇬🇷" }, { name: "Grenada", flag: "🇬🇩" }, { name: "Guatemala", flag: "🇬🇹" }, { name: "Guinea", flag: "🇬🇳" }, { name: "Guinea-Bissau", flag: "🇬🇼" }, { name: "Guyana", flag: "🇬🇾" },
  { name: "Haiti", flag: "🇭🇹" }, { name: "Honduras", flag: "🇭🇳" }, { name: "Hungary", flag: "🇭🇺" },
  { name: "Iceland", flag: "🇮🇸" }, { name: "India", flag: "🇮🇳" }, { name: "Indonesia", flag: "🇮🇩" }, { name: "Iran", flag: "🇮🇷" }, { name: "Iraq", flag: "🇮🇶" }, { name: "Ireland", flag: "🇮🇪" }, { name: "Israel", flag: "🇮🇱" }, { name: "Italy", flag: "🇮🇹" },
  { name: "Jamaica", flag: "🇯🇲" }, { name: "Japan", flag: "🇯🇵" }, { name: "Jordan", flag: "🇯🇴" },
  { name: "Kazakhstan", flag: "🇰🇿" }, { name: "Kenya", flag: "🇰🇪" }, { name: "Kiribati", flag: "🇰🇮" }, { name: "Korea, North", flag: "🇰🇵" }, { name: "Korea, South", flag: "🇰🇷" }, { name: "Kosovo", flag: "🇽🇰" }, { name: "Kuwait", flag: "🇰🇼" }, { name: "Kyrgyzstan", flag: "🇰🇬" },
  { name: "Laos", flag: "🇱🇦" }, { name: "Latvia", flag: "🇱🇻" }, { name: "Lebanon", flag: "🇱🇧" }, { name: "Lesotho", flag: "🇱🇸" }, { name: "Liberia", flag: "🇱🇷" }, { name: "Libya", flag: "🇱🇾" }, { name: "Liechtenstein", flag: "🇱🇮" }, { name: "Lithuania", flag: "🇱🇹" }, { name: "Luxembourg", flag: "🇱🇺" },
  { name: "Madagascar", flag: "🇲🇬" }, { name: "Malawi", flag: "🇲🇼" }, { name: "Malaysia", flag: "🇲🇾" }, { name: "Maldives", flag: "🇲🇻" }, { name: "Mali", flag: "🇲🇱" }, { name: "Malta", flag: "🇲🇹" }, { name: "Marshall Islands", flag: "🇲🇭" }, { name: "Mauritania", flag: "🇲🇷" }, { name: "Mauritius", flag: "🇲🇺" }, { name: "Mexico", flag: "🇲🇽" }, { name: "Micronesia", flag: "🇫🇲" }, { name: "Moldova", flag: "🇲🇩" }, { name: "Monaco", flag: "🇲🇨" }, { name: "Mongolia", flag: "🇲🇳" }, { name: "Montenegro", flag: "🇲🇪" }, { name: "Morocco", flag: "🇲🇦" }, { name: "Mozambique", flag: "🇲🇿" }, { name: "Myanmar", flag: "🇲🇲" },
  { name: "Namibia", flag: "🇳🇦" }, { name: "Nauru", flag: "🇳🇷" }, { name: "Nepal", flag: "🇳🇵" }, { name: "Netherlands", flag: "🇳🇱" }, { name: "New Zealand", flag: "🇳🇿" }, { name: "Nicaragua", flag: "🇳🇮" }, { name: "Niger", flag: "🇳🇪" }, { name: "Nigeria", flag: "🇳🇬" }, { name: "North Macedonia", flag: "🇲🇰" }, { name: "Norway", flag: "🇳🇴" },
  { name: "Oman", flag: "🇴🇲" },
  { name: "Pakistan", flag: "🇵🇰" }, { name: "Palau", flag: "🇵🇼" }, { name: "Palestine", flag: "🇵🇸" }, { name: "Panama", flag: "🇵🇦" }, { name: "Papua New Guinea", flag: "🇵🇬" }, { name: "Paraguay", flag: "🇵🇾" }, { name: "Peru", flag: "🇵🇪" }, { name: "Philippines", flag: "🇵🇭" }, { name: "Poland", flag: "🇵🇱" }, { name: "Portugal", flag: "🇵🇹" },
  { name: "Qatar", flag: "🇶🇦" },
  { name: "Romania", flag: "🇷🇴" }, { name: "Russia", flag: "🇷🇺" }, { name: "Rwanda", flag: "🇷🇼" },
  { name: "Saint Kitts and Nevis", flag: "🇰🇳" }, { name: "Saint Lucia", flag: "🇱🇨" }, { name: "Saint Vincent and the Grenadines", flag: "🇻🇨" }, { name: "Samoa", flag: "🇼🇸" }, { name: "San Marino", flag: "🇸🇲" }, { name: "Sao Tome and Principe", flag: "🇸🇹" }, { name: "Saudi Arabia", flag: "🇸🇦" }, { name: "Senegal", flag: "🇸🇳" }, { name: "Serbia", flag: "🇷🇸" }, { name: "Seychelles", flag: "🇸🇨" }, { name: "Sierra Leone", flag: "🇸🇱" }, { name: "Singapore", flag: "🇸🇬" }, { name: "Slovakia", flag: "🇸🇰" }, { name: "Slovenia", flag: "🇸🇮" }, { name: "Solomon Islands", flag: "🇸🇧" }, { name: "Somalia", flag: "🇸🇴" }, { name: "South Africa", flag: "🇿🇦" }, { name: "South Sudan", flag: "🇸🇸" }, { name: "Spain", flag: "🇪🇸" }, { name: "Sri Lanka", flag: "🇱🇰" }, { name: "Sudan", flag: "🇸🇩" }, { name: "Suriname", flag: "🇸🇷" }, { name: "Sweden", flag: "🇸🇪" }, { name: "Switzerland", flag: "🇨🇭" }, { name: "Syria", flag: "🇸🇾" },
  { name: "Taiwan", flag: "🇹🇼" }, { name: "Tajikistan", flag: "🇹🇯" }, { name: "Tanzania", flag: "🇹🇿" }, { name: "Thailand", flag: "🇹🇭" }, { name: "Timor-Leste", flag: "🇹🇱" }, { name: "Togo", flag: "🇹🇬" }, { name: "Tonga", flag: "🇹🇴" }, { name: "Trinidad and Tobago", flag: "🇹🇹" }, { name: "Tunisia", flag: "🇹🇳" }, { name: "Turkey", flag: "🇹🇷" }, { name: "Turkmenistan", flag: "🇹🇲" }, { name: "Tuvalu", flag: "🇹🇻" },
  { name: "Uganda", flag: "🇺🇬" }, { name: "Ukraine", flag: "🇺🇦" }, { name: "United Arab Emirates", flag: "🇦🇪" }, { name: "United Kingdom", flag: "🇬🇧" }, { name: "United States", flag: "🇺🇸" }, { name: "Uruguay", flag: "🇺🇾" }, { name: "Uzbekistan", flag: "🇺🇿" },
  { name: "Vanuatu", flag: "🇻🇺" }, { name: "Vatican City", flag: "🇻🇦" }, { name: "Venezuela", flag: "🇻🇪" }, { name: "Vietnam", flag: "🇻🇳" },
  { name: "Yemen", flag: "🇾🇪" },
  { name: "Zambia", flag: "🇿🇲" }, { name: "Zimbabwe", flag: "🇿🇼" }
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
  
  // Country custom select states
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isCountryOpen, setIsCountryOpen] = useState<boolean>(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Close custom dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!selectedCountry) {
      setError('Please select your country.');
      setLoading(false);
      return;
    }

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

    const existingUsers = JSON.parse(localStorage.getItem('edu_users') || '[]');
    const userExists = existingUsers.some((u: any) => u.email === email);
    
    if (userExists) {
      setError('email is already used');
      setLoading(false);
      return;
    }

    const newUser = { fullName, email, age: numAge, country: selectedCountry, password, role };
    existingUsers.push(newUser);
    localStorage.setItem('edu_users', JSON.stringify(existingUsers));

    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 800);
  }

  const selectedCountryObj = countriesWithFlags.find(c => c.name === selectedCountry);

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

          {/* Custom Country Dropdown with full flag support on PC */}
          <div className="flex flex-col gap-2 relative" ref={countryDropdownRef}>
            <Label htmlFor="country">
              Country <span title="required" className="text-red-500 cursor-help">*</span>
            </Label>
            <button
              type="button"
              onClick={() => setIsCountryOpen(!isCountryOpen)}
              className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <span className="flex items-center gap-2 truncate">
                {selectedCountryObj ? (
                  <>
                    <span className="text-lg leading-none">{selectedCountryObj.flag}</span>
                    <span>{selectedCountryObj.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select your country</span>
                )}
              </span>
              <ChevronDown size={16} className="text-muted-foreground shrink-0" />
            </button>

            {isCountryOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                {countriesWithFlags.map((c) => (
                  <div
                    key={c.name}
                    onClick={() => {
                      setSelectedCountry(c.name);
                      setIsCountryOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${selectedCountry === c.name ? 'bg-accent/50 font-medium' : ''}`}
                  >
                    <span className="text-lg leading-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
            <input type="hidden" name="country" value={selectedCountry} />
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
          By signing up you agree to our{' '}
          <Link href="/terms?from=signup" className="underline hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy?from=signup" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
