'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ChevronDown, X, Award } from 'lucide-react';

const countriesWithFlags = [
  { name: "Afghanistan", code: "af" }, { name: "Albania", code: "al" }, { name: "Algeria", code: "dz" }, { name: "Andorra", code: "ad" }, { name: "Angola", code: "ao" }, { name: "Antigua and Barbuda", code: "ag" }, { name: "Argentina", code: "ar" }, { name: "Armenia", code: "am" }, { name: "Australia", code: "au" }, { name: "Austria", code: "at" }, { name: "Azerbaijan", code: "az" },
  { name: "Bahamas", code: "bs" }, { name: "Bahrain", code: "bh" }, { name: "Bangladesh", code: "bd" }, { name: "Barbados", code: "bb" }, { name: "Belarus", code: "by" }, { name: "Belgium", code: "be" }, { name: "Belize", code: "bz" }, { name: "Benin", code: "bj" }, { name: "Bhutan", code: "bt" }, { name: "Bolivia", code: "bo" }, { name: "Bosnia and Herzegovina", code: "ba" }, { name: "Botswana", code: "bw" }, { name: "Brazil", code: "br" }, { name: "Brunei", code: "bn" }, { name: "Bulgaria", code: "bg" }, { name: "Burkina Faso", code: "bf" }, { name: "Burundi", code: "bi" },
  { name: "Cabo Verde", code: "cv" }, { name: "Cambodia", code: "kh" }, { name: "Cameroon", code: "cm" }, { name: "Canada", code: "ca" }, { name: "Central African Republic", code: "cf" }, { name: "Chad", code: "td" }, { name: "Chile", code: "cl" }, { name: "China", code: "cn" }, { name: "Colombia", code: "co" }, { name: "Comoros", code: "km" }, { name: "Congo", code: "cg" }, { name: "Costa Rica", code: "cr" }, { name: "Croatia", code: "hr" }, { name: "Cuba", code: "cu" }, { name: "Cyprus", code: "cy" }, { name: "Czechia", code: "cz" },
  { name: "Denmark", code: "dk" }, { name: "Djibouti", code: "dj" }, { name: "Dominica", code: "dm" }, { name: "Dominican Republic", code: "do" },
  { name: "Ecuador", code: "ec" }, { name: "Egypt", code: "eg" }, { name: "El Salvador", code: "sv" }, { name: "Equatorial Guinea", code: "gq" }, { name: "Eritrea", code: "er" }, { name: "Estonia", code: "ee" }, { name: "Eswatini", code: "sz" }, { name: "Ethiopia", code: "et" },
  { name: "Fiji", code: "fj" }, { name: "Finland", code: "fi" }, { name: "France", code: "fr" },
  { name: "Gabon", code: "ga" }, { name: "Gambia", code: "gm" }, { name: "Georgia", code: "ge" }, { name: "Germany", code: "de" }, { name: "Ghana", code: "gh" }, { name: "Greece", code: "gr" }, { name: "Grenada", code: "gd" }, { name: "Guatemala", code: "gt" }, { name: "Guinea", code: "gn" }, { name: "Guinea-Bissau", code: "gw" }, { name: "Guyana", code: "gy" },
  { name: "Haiti", code: "ht" }, { name: "Honduras", code: "hn" }, { name: "Hungary", code: "hu" },
  { name: "Iceland", code: "is" }, { name: "India", code: "in" }, { name: "Indonesia", code: "id" }, { name: "Iran", code: "ir" }, { name: "Iraq", code: "iq" }, { name: "Ireland", code: "ie" }, { name: "Italy", code: "it" },
  { name: "Jamaica", code: "jm" }, { name: "Japan", code: "jp" }, { name: "Jordan", code: "jo" },
  { name: "Kazakhstan", code: "kz" }, { name: "Kenya", code: "ke" }, { name: "Kiribati", code: "ki" }, { name: "Korea, North", code: "kp" }, { name: "Korea, South", code: "kr" }, { name: "Kosovo", code: "xk" }, { name: "Kuwait", code: "kw" }, { name: "Kyrgyzstan", code: "kg" },
  { name: "Laos", code: "la" }, { name: "Latvia", code: "lv" }, { name: "Lebanon", code: "lb" }, { name: "Lesotho", code: "ls" }, { name: "Liberia", code: "lr" }, { name: "Libya", code: "ly" }, { name: "Liechtenstein", code: "li" }, { name: "Lithuania", code: "lt" }, { name: "Luxembourg", code: "lu" },
  { name: "Madagascar", code: "mg" }, { name: "Malawi", code: "mw" }, { name: "Malaysia", code: "my" }, { name: "Maldives", code: "mv" }, { name: "Mali", code: "ml" }, { name: "Malta", code: "mt" }, { name: "Marshall Islands", code: "mh" }, { name: "Mauritania", code: "mr" }, { name: "Mauritius", code: "mu" }, { name: "Mexico", code: "mx" }, { name: "Micronesia", code: "fm" }, { name: "Moldova", code: "md" }, { name: "Monaco", code: "mc" }, { name: "Mongolia", code: "mn" }, { name: "Montenegro", code: "me" }, { name: "Morocco", code: "ma" }, { name: "Mozambique", code: "mz" }, { name: "Myanmar", code: "mm" },
  { name: "Namibia", code: "na" }, { name: "Nauru", code: "nr" }, { name: "Nepal", code: "np" }, { name: "Netherlands", code: "nl" }, { name: "New Zealand", code: "nz" }, { name: "Nicaragua", code: "ni" }, { name: "Niger", code: "ne" }, { name: "Nigeria", code: "ng" }, { name: "North Macedonia", code: "mk" }, { name: "Norway", code: "no" },
  { name: "Oman", code: "om" },
  { name: "Pakistan", code: "pk" }, { name: "Palau", code: "pw" }, { name: "Palestine", code: "ps" }, { name: "Panama", code: "pa" }, { name: "Papua New Guinea", code: "pg" }, { name: "Paraguay", code: "py" }, { name: "Peru", code: "pe" }, { name: "Philippines", code: "ph" }, { name: "Poland", code: "pl" }, { name: "Portugal", code: "pt" },
  { name: "Qatar", code: "qa" },
  { name: "Romania", code: "ro" }, { name: "Russia", code: "ru" }, { name: "Rwanda", code: "rw" },
  { name: "Saint Kitts and Nevis", code: "kn" }, { name: "Saint Lucia", code: "lc" }, { name: "Saint Vincent and the Grenadines", code: "vc" }, { name: "Samoa", code: "ws" }, { name: "San Marino", code: "sm" }, { name: "Sao Tome and Principe", code: "st" }, { name: "Saudi Arabia", code: "sa" }, { name: "Senegal", code: "sn" }, { name: "Serbia", code: "rs" }, { name: "Seychelles", code: "sc" }, { name: "Sierra Leone", code: "sl" }, { name: "Singapore", code: "sg" }, { name: "Slovakia", code: "sk" }, { name: "Slovenia", code: "si" }, { name: "Solomon Islands", code: "sb" }, { name: "Somalia", code: "so" }, { name: "South Africa", code: "za" }, { name: "South Sudan", code: "ss" }, { name: "Spain", code: "es" }, { name: "Sri Lanka", code: "lk" }, { name: "Sudan", code: "sd" }, { name: "Suriname", code: "sr" }, { name: "Sweden", code: "se" }, { name: "Switzerland", code: "ch" }, { name: "Syria", code: "sy" },
  { name: "Taiwan", code: "tw" }, { name: "Tajikistan", code: "tj" }, { name: "Tanzania", code: "tz" }, { name: "Thailand", code: "th" }, { name: "Timor-Leste", code: "tl" }, { name: "Togo", code: "tg" }, { name: "Tonga", code: "to" }, { name: "Trinidad and Tobago", code: "tt" }, { name: "Tunisia", code: "tn" }, { name: "Turkey", code: "tr" }, { name: "Turkmenistan", code: "tm" }, { name: "Tuvalu", code: "tv" },
  { name: "Uganda", code: "ug" }, { name: "Ukraine", code: "ua" }, { name: "United Arab Emirates", code: "ae" }, { name: "United Kingdom", code: "gb" }, { name: "United States", code: "us" }, { name: "Uruguay", code: "uy" }, { name: "Uzbekistan", code: "uz" },
  { name: "Vanuatu", code: "vu" }, { name: "Vatican City", code: "va" }, { name: "Venezuela", code: "ve" }, { name: "Vietnam", code: "vn" },
  { name: "Yemen", code: "ye" },
  { name: "Zambia", code: "zm" }, { name: "Zimbabwe", code: "zw" }
];

const creditsList = [
  "Aidan Rayka Dewabrata - SMP Labschool Cibubur",
  "Atha Badzikh Dodi Elang Permana - SMP Labschool Cibubur",
  "Bagas Almer Dzaky - SMP Labschool Cibubur",
  "Bilal Abrizam - SMP Labschool Cibubur",
  "Maher Akbar Alvarez - SMP Labschool Cibubur",
  "Raga Natha Aditya - SMP Labschool Cibubur"
];

export default function SignUpPage() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  const [email, setEmail] = useState<string>('');

  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Only Student and Teacher are allowed.
  const [role, setRole] = useState<string>('student');

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isCountryOpen, setIsCountryOpen] = useState<boolean>(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setIsCountryOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
  }, []);

  function calculateExactAge(
    d: string,
    m: string,
    y: string
  ): number | null {
    if (!d || !m || !y || y.length < 4) {
      return null;
    }

    const numD = Number(d);
    const numM = Number(m);
    const numY = Number(y);

    const birthDate = new Date(
      numY,
      numM - 1,
      numD
    );

    if (isNaN(birthDate.getTime())) {
      return null;
    }

    let calculatedAge =
      new Date().getFullYear() -
      birthDate.getFullYear();

    const mDiff =
      new Date().getMonth() -
      birthDate.getMonth();

    if (
      mDiff < 0 ||
      (mDiff === 0 &&
        new Date().getDate() <
          birthDate.getDate())
    ) {
      calculatedAge--;
    }

    return calculatedAge;
  }

  function validateBirthdayAndRole(
    currDay: string,
    currMonth: string,
    currYear: string,
    currRole: string
  ) {
    if (
      currDay &&
      currMonth &&
      currYear.length === 4
    ) {
      const ageNum =
        calculateExactAge(
          currDay,
          currMonth,
          currYear
        );

      if (ageNum === null) {
        setAgeError(
          'Please enter a valid birthday date.'
        );
        return;
      }

      // Teachers must be at least 21.
      if (
        currRole === 'teacher' &&
        ageNum < 21
      ) {
        setAgeError(
          'Teachers must be at least 21 years old.'
        );
      } else {
        setAgeError(null);
      }
    } else {
      setAgeError(null);
    }
  }

  function handleEmailChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const val = e.target.value;

    setEmail(val);

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      val.length > 0 &&
      !emailRegex.test(val)
    ) {
      setEmailError(
        'Please enter a valid email'
      );
    } else {
      setEmailError(null);
    }
  }

  function handleDayChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const val = e.target.value
      .replace(/\D/g, '')
      .slice(0, 2);

    setDay(val);

    if (
      val.length === 2 &&
      monthRef.current
    ) {
      monthRef.current.focus();
    }

    validateBirthdayAndRole(
      val,
      month,
      year,
      role
    );
  }

  function handleMonthChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const val = e.target.value
      .replace(/\D/g, '')
      .slice(0, 2);

    setMonth(val);

    if (
      val.length === 2 &&
      yearRef.current
    ) {
      yearRef.current.focus();
    }

    validateBirthdayAndRole(
      day,
      val,
      year,
      role
    );
  }

  function handleYearChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const val = e.target.value
      .replace(/\D/g, '')
      .slice(0, 4);

    setYear(val);

    validateBirthdayAndRole(
      day,
      month,
      val,
      role
    );
  }

  function handleRoleChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const val = e.target.value;

    setRole(val);

    validateBirthdayAndRole(
      day,
      month,
      year,
      val
    );
  }

  function handlePasswordChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const val = e.target.value;

    setPassword(val);

    if (
      val.length > 0 &&
      val.length < 8
    ) {
      setPasswordError(
        'Password must be at least 8 characters long.'
      );
    } else {
      setPasswordError(null);
    }
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    if (!selectedCountry) {
      setError(
        'Please select your country.'
      );
      setLoading(false);
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setEmailError(
        'Please enter a valid email'
      );
      setLoading(false);
      return;
    }

    const exactAge =
      calculateExactAge(
        day,
        month,
        year
      );

    if (exactAge === null) {
      setAgeError(
        'Please enter a valid birthday.'
      );
      setLoading(false);
      return;
    }

    // Only teachers have an age requirement.
    if (
      role === 'teacher' &&
      exactAge < 21
    ) {
      setAgeError(
        'Teachers must be at least 21 years old.'
      );
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setPasswordError(
        'Password must be at least 8 characters long.'
      );
      setLoading(false);
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );
      setLoading(false);
      return;
    }

    const formData =
      new FormData(e.currentTarget);

    const fullName =
      formData.get(
        'fullName'
      ) as string;

    const birthdayString = `${year}-${month.padStart(
      2,
      '0'
    )}-${day.padStart(2, '0')}`;

    try {
      const supabaseUrl =
        process.env
          .NEXT_PUBLIC_SUPABASE_URL;

      const supabaseAnonKey =
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const res = await fetch(
        `${supabaseUrl}/rest/v1/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            apikey:
              supabaseAnonKey || '',
            Authorization: `Bearer ${
              supabaseAnonKey || ''
            }`,
            Prefer:
              'return=minimal',
          },
          body: JSON.stringify({
            full_name: fullName,
            email: email,
            age: exactAge,
            birthday:
              birthdayString,
            country:
              selectedCountry,
            password: password,
            role: role,
          }),
        }
      );

      if (!res.ok) {
        const errorData =
          await res
            .json()
            .catch(() => ({}));

        throw new Error(
          errorData.message ||
            errorData.hint ||
            `Database error: ${res.statusText}`
        );
      }

      setLoading(false);

      router.push('/');
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to connect to cloud database.'
      );

      setLoading(false);
    }
  }

  const selectedCountryObj =
    countriesWithFlags.find(
      (c) =>
        c.name === selectedCountry
    );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 relative">

      <div className="absolute top-6 right-6 flex items-center gap-3">

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setIsCreditsOpen(true)
          }
          className="gap-1.5 h-9"
        >
          <Award size={15} />
          Credits
        </Button>

        <ThemeToggle />

      </div>

      <div className="w-full max-w-md space-y-6 py-8">

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Create an account
          </h2>

          <p className="text-sm text-muted-foreground">
            Enter your details to get started.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md font-medium break-all">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* Full Name */}
          <div className="flex flex-col gap-2">

            <Label htmlFor="fullName">
              Full Name{' '}
              <span
                title="required"
                className="text-red-500 cursor-help"
              >
                *
              </span>
            </Label>

            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="John Doe"
              className="h-11 bg-card"
            />

          </div>

          {/* Email + Birthday */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="flex flex-col gap-2">

              <Label htmlFor="email">
                Email{' '}
                <span
                  title="required"
                  className="text-red-500 cursor-help"
                >
                  *
                </span>
              </Label>

              <Input
                id="email"
                name="email"
                type="text"
                required
                value={email}
                onChange={
                  handleEmailChange
                }
                placeholder="you@school.edu"
                className={`h-11 bg-card ${
                  emailError
                    ? '!border-red-500 !ring-red-500 text-red-500 focus-visible:ring-red-500'
                    : ''
                }`}
              />

              {emailError && (
                <span className="text-xs text-red-500 font-medium">
                  {emailError}
                </span>
              )}

            </div>

            {/* Birthday */}
            <div className="flex flex-col gap-2">

              <Label>
                Birthday{' '}
                <span
                  title="required"
                  className="text-red-500 cursor-help"
                >
                  *
                </span>
              </Label>

              <div
                className={`flex h-11 items-center justify-between rounded-md border bg-card px-3 shadow-sm ${
                  ageError
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-input'
                }`}
              >

                <div className="flex items-center gap-1 w-full text-sm">

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD"
                    value={day}
                    onChange={
                      handleDayChange
                    }
                    maxLength={2}
                    className="w-7 text-center bg-transparent focus:outline-none placeholder:text-muted-foreground font-mono"
                  />

                  <span className="text-muted-foreground">
                    /
                  </span>

                  <input
                    ref={monthRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="MM"
                    value={month}
                    onChange={
                      handleMonthChange
                    }
                    maxLength={2}
                    className="w-7 text-center bg-transparent focus:outline-none placeholder:text-muted-foreground font-mono"
                  />

                  <span className="text-muted-foreground">
                    /
                  </span>

                  <input
                    ref={yearRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY"
                    value={year}
                    onChange={
                      handleYearChange
                    }
                    maxLength={4}
                    className="w-12 text-center bg-transparent focus:outline-none placeholder:text-muted-foreground font-mono"
                  />

                </div>

              </div>

              {ageError && (
                <span className="text-xs text-red-500 font-medium">
                  {ageError}
                </span>
              )}

            </div>

          </div>

          {/* Country */}
          <div
            className="flex flex-col gap-2 relative"
            ref={countryDropdownRef}
          >

            <Label htmlFor="country">
              Country{' '}
              <span
                title="required"
                className="text-red-500 cursor-help"
              >
                *
              </span>
            </Label>

            <button
              type="button"
              onClick={() =>
                setIsCountryOpen(
                  !isCountryOpen
                )
              }
              className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >

              <span className="flex items-center gap-2 truncate">

                {selectedCountryObj ? (
                  <>
                    <img
                      src={`https://flagcdn.com/24x18/${selectedCountryObj.code}.png`}
                      alt={
                        selectedCountryObj.name
                      }
                      className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                    />

                    <span>
                      {
                        selectedCountryObj.name
                      }
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Select your country
                  </span>
                )}

              </span>

              <ChevronDown
                size={16}
                className="text-muted-foreground shrink-0"
              />

            </button>

            {isCountryOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">

                {countriesWithFlags.map(
                  (c) => (
                    <div
                      key={c.name}
                      onClick={() => {
                        setSelectedCountry(
                          c.name
                        );
                        setIsCountryOpen(
                          false
                        );
                      }}
                      className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                        selectedCountry ===
                        c.name
                          ? 'bg-accent/50 font-medium'
                          : ''
                      }`}
                    >

                      <img
                        src={`https://flagcdn.com/24x18/${c.code}.png`}
                        alt={c.name}
                        className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                      />

                      <span className="truncate">
                        {c.name}
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

            <input
              type="hidden"
              name="country"
              value={selectedCountry}
            />

          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="flex flex-col gap-2">

              <Label htmlFor="password">
                Password{' '}
                <span
                  title="required"
                  className="text-red-500 cursor-help"
                >
                  *
                </span>
              </Label>

              <div className="relative">

                <Input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={
                    handlePasswordChange
                  }
                  onCopy={(e) =>
                    e.preventDefault()
                  }
                  onPaste={(e) =>
                    e.preventDefault()
                  }
                  onCut={(e) =>
                    e.preventDefault()
                  }
                  className={`h-11 bg-card pr-10 ${
                    passwordError
                      ? '!border-red-500 !ring-red-500 text-red-500 focus-visible:ring-red-500'
                      : ''
                  }`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

              {passwordError && (
                <span className="text-xs text-red-500 font-medium">
                  {passwordError}
                </span>
              )}

            </div>

            <div className="flex flex-col gap-2">

              <Label htmlFor="confirmPassword">
                Confirm Password{' '}
                <span
                  title="required"
                  className="text-red-500 cursor-help"
                >
                  *
                </span>
              </Label>

              <div className="relative">

                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  placeholder="••••••••"
                  value={
                    confirmPassword
                  }
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  onCopy={(e) =>
                    e.preventDefault()
                  }
                  onPaste={(e) =>
                    e.preventDefault()
                  }
                  onCut={(e) =>
                    e.preventDefault()
                  }
                  className="h-11 bg-card pr-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>

          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">

            <Label htmlFor="role">
              Role{' '}
              <span
                title="required"
                className="text-red-500 cursor-help"
              >
                *
              </span>
            </Label>

            <select
              id="role"
              name="role"
              value={role}
              onChange={
                handleRoleChange
              }
              className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm"
            >

              <option value="student">
                Student
              </option>

              <option value="teacher">
                Teacher
              </option>

            </select>

          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full text-base mt-2"
          >
            {loading
              ? 'Creating account...'
              : 'Sign Up'}
          </Button>

        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}

          <Link
            href="/"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>

        <div className="text-center text-xs text-muted-foreground pt-4">

          By signing up you agree to our{' '}

          <Link
            href="/terms?from=signup"
            className="underline hover:text-foreground"
          >
            Terms
          </Link>{' '}

          and{' '}

          <Link
            href="/privacy?from=signup"
            className="underline hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .

        </div>

      </div>

      {/* Credits Modal */}
      {isCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-4">

            <div className="flex items-center justify-between border-b border-border pb-3">

              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">

                <Award
                  size={20}
                  className="text-primary"
                />

                Project Credits

              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsCreditsOpen(
                    false
                  )
                }
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X size={16} />
              </button>

            </div>

            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">

              <p className="text-xs text-muted-foreground">
                Developed by the following contributors:
              </p>

              <ul className="space-y-2">

                {creditsList.map(
                  (credit, idx) => (
                    <li
                      key={idx}
                      className="text-sm bg-accent/30 p-2.5 rounded-lg border border-border/50 text-foreground font-medium"
                    >
                      {credit}
                    </li>
                  )
                )}

              </ul>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
