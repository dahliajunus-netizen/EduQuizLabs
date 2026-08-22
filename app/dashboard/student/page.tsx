'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, PlusCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/language.provider';

export default function StudentDashboard() {
  const { language } = useLanguage();

  const [classCode, setClassCode] = useState('');
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  /*
   * Translations
   */
  const t = {
    en: {
      dashboardTitle: 'Student Dashboard',
      dashboardDescription:
        'Track your coursework, join classes with a code, and view upcoming assignments.',

      classCodeInput: 'Class Code Input',
      enterCode: 'Enter code (e.g., A3F92)',
      joinClass: 'Join Class',

      classesYouAreIn: 'Classes You Are In',
      noClasses:
        "You haven't joined any classes yet. Enter a valid code above!",

      school: 'School:',
      active: 'Active',

      codeInvalid: 'Code is invalid',
      alreadyJoined: 'You have already joined this class.',
      networkError: 'Network error joining class.',
      failedToJoin: 'Failed to join:',
      unknownError: 'Unknown error',
    },

    id: {
      dashboardTitle: 'Dasbor Siswa',
      dashboardDescription:
        'Pantau tugas sekolah, bergabung ke kelas dengan kode, dan lihat tugas yang akan datang.',

      classCodeInput: 'Masukkan Kode Kelas',
      enterCode: 'Masukkan kode (contoh: A3F92)',
      joinClass: 'Gabung Kelas',

      classesYouAreIn: 'Kelas yang Anda Ikuti',
      noClasses:
        'Anda belum bergabung dengan kelas mana pun. Masukkan kode yang valid di atas!',

      school: 'Sekolah:',
      active: 'Aktif',

      codeInvalid: 'Kode tidak valid',
      alreadyJoined: 'Anda sudah bergabung dengan kelas ini.',
      networkError: 'Terjadi kesalahan jaringan saat bergabung ke kelas.',
      failedToJoin: 'Gagal bergabung:',
      unknownError: 'Kesalahan tidak diketahui',
    },
  };

  const text = language === 'id' ? t.id : t.en;

  /*
   * Fetch student's classes
   */
  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/student_classes?select=*`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMyClasses(data);
        }
      } catch (err) {
        console.error('Error fetching classes', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, []);

  /*
   * Join a class
   */
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    const trimmedCode = classCode.trim().toUpperCase();

    if (!trimmedCode) return;

    setJoining(true);

    try {
      /*
       * 1. Check whether class code exists
       */
      const codeCheckResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
          trimmedCode
        )}&select=*`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        }
      );

      const matchedClasses = await codeCheckResponse.json();
      const foundClass = matchedClasses[0];

      if (!foundClass) {
        setCodeError(text.codeInvalid);
        setJoining(false);
        return;
      }

      /*
       * 2. Check whether already joined
       */
      const alreadyJoined = myClasses.some(
        (c) => c.code === foundClass.code
      );

      if (alreadyJoined) {
        setCodeError(text.alreadyJoined);
        setJoining(false);
        return;
      }

      /*
       * 3. Save enrollment
       */
      const insertResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/student_classes`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            class_name: foundClass.class_name,
            code: foundClass.code,
            school: foundClass.school_name,
          }),
        }
      );

      if (insertResponse.ok) {
        const newEnrollment = await insertResponse.json();

        setMyClasses((prev) => [...prev, newEnrollment[0]]);
        setClassCode('');
      } else {
        const errorData = await insertResponse.json();

        console.error('Supabase Error Details:', errorData);

        setCodeError(
          `${text.failedToJoin} ${
            errorData.message || text.unknownError
          }`
        );
      }
    } catch (err) {
      console.error('Error joining class:', err);
      setCodeError(text.networkError);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-8 space-y-8">

        {/* Dashboard Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {text.dashboardTitle}
          </h1>

          <p className="text-muted-foreground">
            {text.dashboardDescription}
          </p>
        </div>

        {/* Join Class */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />

                {text.classCodeInput}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleJoinClass}
                className="space-y-3"
              >
                <div className="flex gap-3">

                  <Input
                    type="text"
                    placeholder={text.enterCode}
                    value={classCode}
                    onChange={(e) => {
                      setClassCode(e.target.value);

                      if (codeError) {
                        setCodeError(null);
                      }
                    }}
                    className={`bg-background uppercase ${
                      codeError
                        ? '!border-red-500 !ring-red-500 text-red-500'
                        : ''
                    }`}
                  />

                  <Button
                    type="submit"
                    disabled={joining}
                  >
                    {joining ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      text.joinClass
                    )}
                  </Button>

                </div>

                {codeError && (
                  <span className="text-xs text-red-500 font-medium block">
                    {codeError}
                  </span>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <Card className="lg:col-span-2 bg-card">

            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">

                <BookOpen className="h-5 w-5 text-primary" />

                {text.classesYouAreIn}

              </CardTitle>
            </CardHeader>

            <CardContent>

              <div className="space-y-3">

                {/* Loading */}
                {loading ? (

                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>

                ) : myClasses.length === 0 ? (

                  /* No classes */
                  <p className="text-sm text-muted-foreground">
                    {text.noClasses}
                  </p>

                ) : (

                  /* Classes */
                  myClasses.map((item, index) => (

                    <Link
                      key={index}
                      href={`/dashboard/student/classes/${item.code}`}
                    >

                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition cursor-pointer mb-2">

                        <div>

                          <h4 className="font-medium text-foreground">
                            {item.class_name}
                          </h4>

                          <p className="text-xs text-muted-foreground">
                            {text.school} {item.school}
                          </p>

                        </div>

                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          {text.active}
                        </span>

                      </div>

                    </Link>

                  ))
                )}

              </div>

            </CardContent>

          </Card>

        </div>

      </main>
    </div>
  );
}
