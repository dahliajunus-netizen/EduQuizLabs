'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ChevronDown, X, Award, Loader2 } from 'lucide-react';

const countryCodes = [
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','BN','BG','BF','BI','CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CR','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI','FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IT','JM','JP','JO','KZ','KE','KI','KP','KR','XK','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM','NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PL','PT','QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO','ZA','SS','ES','LK','SD','SR','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TO','TT','TN','TR','TM','TV','UG','UA','AE','GB','US','UY','UZ','VU','VA','VE','VN','YE','ZM','ZW'
];

const creditsList = [
  'Aidan Rayka Dewabrata - SMP Labschool Cibubur',
  'Atha Badzikh Dodi Elang Permana - SMP Labschool Cibubur',
  'Bagas Almer Dzaky - SMP Labschool Cibubur',
  'Bilal Abrizam - SMP Labschool Cibubur',
  'Maher Akbar Alvarez - SMP Labschool Cibubur',
  'Raga Natha Aditya - SMP Labschool Cibubur',
];

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(() => {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return countryCodes.map((code) => ({
      code: code.toLowerCase(),
      name: displayNames.of(code) || code,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedCountryObj = countries.find((c) => c.name === selectedCountry);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function calculateExactAge(d: string, m: string, y: string): number | null {
    if (!d || !m || !y || y.length !== 4) return null;
    const numD = Number(d), numM = Number(m), numY = Number(y);
    const birthDate = new Date(numY, numM - 1, numD);
    if (!Number.isFinite(birthDate.getTime()) || birthDate.getFullYear() !== numY || birthDate.getMonth() !== numM - 1 || birthDate.getDate() !== numD) return null;
    const today = new Date();
    let age = today.getFullYear() - numY;
    if (today.getMonth() < numM - 1 || (today.getMonth() === numM - 1 && today.getDate() < numD)) age--;
    if (age < 0) return null;
    return age;
  }

  function validateBirthday(d: string, m: string, y: string, currentRole = role) {
    if (!d || !m || y.length !== 4) {
      setAgeError(null);
      return;
    }
    const age = calculateExactAge(d, m, y);
    if (age === null) setAgeError('Please enter a valid birthday date.');
    else if (currentRole === 'teacher' && age < 21) setAgeError('Teachers must be at least 21 years old.');
    else setAgeError(null);
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEmail(value);
    setEmailError(value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email' : null);
  }

  function handleDayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(value);
    if (value.length === 2) monthRef.current?.focus();
    validateBirthday(value, month, year);
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(value);
    if (value.length === 2) yearRef.current?.focus();
    validateBirthday(day, value, year);
  }

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(value);
    validateBirthday(day, month, value);
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setRole(value);
    validateBirthday(day, month, year, value);
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(value.length > 0 && value.length < 8 ? 'Password must be at least 8 characters long.' : null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setLoading(true);

    const fullName = String(new FormData(e.currentTarget).get('fullName') ?? '').trim();
    const normalizedEmail = email.trim().toLowerCase();
    const age = calculateExactAge(day, month, year);

    if (!fullName) { setError('Please enter your full name.'); setLoading(false); return; }
    if (!selectedCountry) { setError('Please select your country.'); setLoading(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setEmailError('Please enter a valid email'); setLoading(false); return; }
    if (age === null) { setAgeError('Please enter a valid birthday.'); setLoading(false); return; }
    if (role === 'teacher' && age < 21) { setAgeError('Teachers must be at least 21 years old.'); setLoading(false); return; }
    if (password.length < 8) { setPasswordError('Password must be at least 8 characters long.'); setLoading(false); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment variables are missing.');

      const authResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          data: {
            full_name: fullName,
            age,
            birthday: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            country: selectedCountry,
            role,
          },
        }),
        cache: 'no-store',
      });

      const authData = await authResponse.json().catch(() => ({}));
      if (!authResponse.ok || !authData.user?.id) {
        throw new Error(authData.msg || authData.message || authData.error_description || 'Unable to create account.');
      }

      // The database trigger copies Auth metadata into public.users.
      // If email confirmation is disabled, keep the session so the user can continue immediately.
      if (authData.access_token) {
        localStorage.setItem('supabase_access_token', authData.access_token);
        localStorage.setItem('current_user', JSON.stringify({
          id: authData.user.id,
          fullName,
          email: normalizedEmail,
          role,
          accessToken: authData.access_token,
        }));
        router.push(`/dashboard/${role}`);
      } else {
        setLoading(false);
        setError('Account created. Please check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      console.error('[Signup] Error:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to cloud database.');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="absolute right-6 top-6 flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsCreditsOpen(true)} className="h-9 gap-1.5"><Award size={15} /> Credits</Button>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 py-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
          <p className="text-sm text-muted-foreground">Enter your details to get started.</p>
        </div>

        {error && <div className="break-all rounded-md bg-red-500/10 p-3 text-sm font-medium text-red-500">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
            <Input id="fullName" name="fullName" required placeholder="John Doe" className="h-11 bg-card" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input id="email" name="email" type="email" required value={email} onChange={handleEmailChange} placeholder="you@school.edu" className={`h-11 bg-card ${emailError ? '!border-red-500' : ''}`} />
              {emailError && <span className="text-xs font-medium text-red-500">{emailError}</span>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Birthday <span className="text-red-500">*</span></Label>
              <div className={`flex h-11 items-center rounded-md border bg-card px-3 ${ageError ? 'border-red-500 ring-1 ring-red-500' : 'border-input'}`}>
                <div className="flex w-full items-center gap-1 text-sm">
                  <input inputMode="numeric" placeholder="DD" value={day} onChange={handleDayChange} maxLength={2} className="w-8 bg-transparent text-center font-mono outline-none placeholder:text-muted-foreground" />
                  <span className="text-muted-foreground">/</span>
                  <input ref={monthRef} inputMode="numeric" placeholder="MM" value={month} onChange={handleMonthChange} maxLength={2} className="w-8 bg-transparent text-center font-mono outline-none placeholder:text-muted-foreground" />
                  <span className="text-muted-foreground">/</span>
                  <input ref={yearRef} inputMode="numeric" placeholder="YYYY" value={year} onChange={handleYearChange} maxLength={4} className="w-14 bg-transparent text-center font-mono outline-none placeholder:text-muted-foreground" />
                </div>
              </div>
              {ageError && <span className="text-xs font-medium text-red-500">{ageError}</span>}
            </div>
          </div>

          <div className="relative flex flex-col gap-2" ref={countryDropdownRef}>
            <Label>Country <span className="text-red-500">*</span></Label>
            <button type="button" onClick={() => setIsCountryOpen((open) => !open)} className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3 text-sm shadow-sm">
              <span className="flex items-center gap-2 truncate">
                {selectedCountryObj ? <><img src={`https://flagcdn.com/24x18/${selectedCountryObj.code}.png`} alt="" className="h-3.5 w-5 rounded-sm object-cover" /><span>{selectedCountryObj.name}</span></> : <span className="text-muted-foreground">Select your country</span>}
              </span>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>
            {isCountryOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                {countries.map((country) => (
                  <button key={country.code} type="button" onClick={() => { setSelectedCountry(country.name); setIsCountryOpen(false); }} className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent ${selectedCountry === country.name ? 'bg-accent/50 font-medium' : ''}`}>
                    <img src={`https://flagcdn.com/24x18/${country.code}.png`} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                    <span className="truncate">{country.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={handlePasswordChange} className={`h-11 bg-card pr-10 ${passwordError ? '!border-red-500' : ''}`} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {passwordError && <span className="text-xs font-medium text-red-500">{passwordError}</span>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 bg-card pr-10" />
                <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
            <select id="role" name="role" value={role} onChange={handleRoleChange} className="h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <Button type="submit" disabled={loading} className="mt-2 h-11 w-full text-base">
            {loading ? <><Loader2 className="size-4 animate-spin" /> Creating account...</> : 'Sign Up'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link></p>
        <div className="pt-4 text-center text-xs text-muted-foreground">By signing up you agree to our <Link href="/terms?from=signup" className="underline hover:text-foreground">Terms</Link> and <Link href="/privacy?from=signup" className="underline hover:text-foreground">Privacy Policy</Link>.</div>
      </div>

      {isCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold"><Award size={20} className="text-primary" /> Project Credits</h3>
              <button type="button" onClick={() => setIsCreditsOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
              <p className="text-xs text-muted-foreground">Developed by the following contributors:</p>
              <ul className="space-y-2">{creditsList.map((credit) => <li key={credit} className="rounded-lg border border-border/50 bg-accent/30 p-2.5 text-sm font-medium">{credit}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
