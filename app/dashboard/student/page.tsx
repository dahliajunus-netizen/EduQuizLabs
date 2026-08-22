'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  BookOpen,
  PlusCircle,
  Loader2,
  ClipboardList,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';

import { useLanguage } from '@/components/language-provider';

type StudentClass = {
  id?: string;
  class_name: string;
  code: string;
  school: string;
};

type Course = {
  id?: string;
  course_name: string;
  class_code: string;
};

type Assignment = {
  id?: string;
  course_id: string;
  name: string;
  description: string;
  due_date?: string | null;
  created_at?: string;
};

type UpcomingAssignment = Assignment & {
  class_name: string;
  class_code: string;
  course_name: string;
};

export default function StudentDashboard() {
  const { language } = useLanguage();

  const [classCode, setClassCode] = useState('');
  const [myClasses, setMyClasses] = useState<StudentClass[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] =
    useState<UpcomingAssignment[]>([]);

  const [codeError, setCodeError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadingAssignments, setLoadingAssignments] =
    useState(true);

  const [joining, setJoining] =
    useState(false);

  /*
   * Translations
   */
  const t = {
    en: {
      dashboardTitle: 'Student Dashboard',

      dashboardDescription:
        'Track your coursework, join classes with a code, and view upcoming assignments.',

      classCodeInput: 'Class Code Input',

      enterCode:
        'Enter code (e.g., A3F92)',

      joinClass: 'Join Class',

      classesYouAreIn:
        'Classes You Are In',

      noClasses:
        "You haven't joined any classes yet. Enter a valid code above!",

      school: 'School:',

      active: 'Active',

      assignmentsDue:
        'Assignments Due',

      noAssignments:
        'No upcoming assignments.',

      due: 'Due',

      today: 'Today',

      tomorrow: 'Tomorrow',

      codeInvalid:
        'Code is invalid',

      alreadyJoined:
        'You have already joined this class.',

      networkError:
        'Network error joining class.',

      failedToJoin:
        'Failed to join:',

      unknownError:
        'Unknown error',
    },

    id: {
      dashboardTitle:
        'Dasbor Siswa',

      dashboardDescription:
        'Pantau tugas sekolah, bergabung ke kelas dengan kode, dan lihat tugas yang akan datang.',

      classCodeInput:
        'Masukkan Kode Kelas',

      enterCode:
        'Masukkan kode (contoh: A3F92)',

      joinClass:
        'Gabung Kelas',

      classesYouAreIn:
        'Kelas yang Anda Ikuti',

      noClasses:
        'Anda belum bergabung dengan kelas mana pun. Masukkan kode yang valid di atas!',

      school:
        'Sekolah:',

      active:
        'Aktif',

      assignmentsDue:
        'Tugas Mendatang',

      noAssignments:
        'Tidak ada tugas yang akan datang.',

      due:
        'Dikumpulkan',

      today:
        'Hari ini',

      tomorrow:
        'Besok',

      codeInvalid:
        'Kode tidak valid',

      alreadyJoined:
        'Anda sudah bergabung dengan kelas ini.',

      networkError:
        'Terjadi kesalahan jaringan saat bergabung ke kelas.',

      failedToJoin:
        'Gagal bergabung:',

      unknownError:
        'Kesalahan tidak diketahui',
    },
  };

  const text =
    language === 'id'
      ? t.id
      : t.en;

  /*
   * Supabase headers
   */
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseHeaders = {
    apikey: supabaseAnonKey || '',
    Authorization:
      `Bearer ${supabaseAnonKey || ''}`,
  };

  /*
   * Format YYYY-MM-DD from Supabase
   * into DD/MM/YYYY.
   */
  const formatDueDate = (
    dateString?: string | null
  ) => {
    if (!dateString) {
      return '—';
    }

    const parts =
      dateString.split('-');

    if (parts.length !== 3) {
      return dateString;
    }

    const [year, month, day] =
      parts;

    return `${day}/${month}/${year}`;
  };

  /*
   * Get today's date as YYYY-MM-DD.
   *
   * We deliberately use local time instead
   * of UTC so students in Indonesia don't
   * get a date shifted by timezone.
   */
  const getTodayString = () => {
    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        now.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  /*
   * Get a friendly "Today" / "Tomorrow"
   * label when appropriate.
   */
  const getDueLabel = (
    dateString?: string | null
  ) => {
    if (!dateString) {
      return '';
    }

    const today =
      getTodayString();

    if (dateString === today) {
      return text.today;
    }

    const tomorrowDate =
      new Date();

    tomorrowDate.setDate(
      tomorrowDate.getDate() + 1
    );

    const tomorrowYear =
      tomorrowDate.getFullYear();

    const tomorrowMonth =
      String(
        tomorrowDate.getMonth() + 1
      ).padStart(2, '0');

    const tomorrowDay =
      String(
        tomorrowDate.getDate()
      ).padStart(2, '0');

    const tomorrow =
      `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;

    if (dateString === tomorrow) {
      return text.tomorrow;
    }

    return '';
  };

  /*
   * Fetch student's classes
   */
  useEffect(() => {
    async function fetchClasses() {
      try {
        const response =
          await fetch(
            `${supabaseUrl}/rest/v1/student_classes?select=*`,
            {
              headers:
                supabaseHeaders,
            }
          );

        if (response.ok) {
          const data =
            await response.json();

          setMyClasses(data);
        }
      } catch (err) {
        console.error(
          'Error fetching classes',
          err
        );
      } finally {
        setLoading(false);
      }
    }

    if (
      supabaseUrl &&
      supabaseAnonKey
    ) {
      fetchClasses();
    } else {
      setLoading(false);
    }
  }, [
    supabaseUrl,
    supabaseAnonKey,
  ]);

  /*
   * Fetch upcoming assignments
   *
   * Flow:
   *
   * Student classes
   *      ↓
   * class_courses
   *      ↓
   * course_assignments
   */
  useEffect(() => {
    async function fetchAssignments() {
      if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        myClasses.length === 0
      ) {
        setUpcomingAssignments([]);
        setLoadingAssignments(false);
        return;
      }

      setLoadingAssignments(true);

      try {
        const allAssignments:
          UpcomingAssignment[] = [];

        /*
         * Fetch courses for every class.
         */
        for (
          const studentClass of myClasses
        ) {
          try {
            const courseResponse =
              await fetch(
                `${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(
                  studentClass.code
                )}&select=*`,
                {
                  headers:
                    supabaseHeaders,
                }
              );

            if (!courseResponse.ok) {
              continue;
            }

            const courses:
              Course[] =
              await courseResponse.json();

            /*
             * Fetch assignments from
             * each course.
             */
            for (
              const course of courses
            ) {
              if (!course.id) {
                continue;
              }

              try {
                const assignmentResponse =
                  await fetch(
                    `${supabaseUrl}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(
                      course.id
                    )}&select=*`,
                    {
                      headers:
                        supabaseHeaders,
                    }
                  );

                if (
                  !assignmentResponse.ok
                ) {
                  continue;
                }

                const assignments:
                  Assignment[] =
                  await assignmentResponse.json();

                /*
                 * Only include assignments
                 * that actually have a due date.
                 */
                assignments
                  .filter(
                    (assignment) =>
                      !!assignment.due_date
                  )
                  .forEach(
                    (assignment) => {
                      allAssignments.push({
                        ...assignment,
                        class_name:
                          studentClass.class_name,
                        class_code:
                          studentClass.code,
                        course_name:
                          course.course_name,
                      });
                    }
                  );
              } catch (err) {
                console.error(
                  'Error fetching assignments for course:',
                  course.course_name,
                  err
                );
              }
            }
          } catch (err) {
            console.error(
              'Error fetching courses for class:',
              studentClass.code,
              err
            );
          }
        }

        /*
         * Remove assignments whose due date
         * has already passed.
         */
        const today =
          getTodayString();

        const futureAssignments =
          allAssignments.filter(
            (assignment) =>
              assignment.due_date &&
              assignment.due_date >= today
          );

        /*
         * Sort nearest due date first.
         */
        futureAssignments.sort(
          (a, b) => {
            const dateA =
              a.due_date || '';

            const dateB =
              b.due_date || '';

            return dateA.localeCompare(
              dateB
            );
          }
        );

        /*
         * Keep the dashboard compact.
         * Show the next 6 assignments.
         */
        setUpcomingAssignments(
          futureAssignments.slice(
            0,
            6
          )
        );
      } catch (err) {
        console.error(
          'Error fetching upcoming assignments:',
          err
        );

        setUpcomingAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    }

    fetchAssignments();
  }, [
    myClasses,
    supabaseUrl,
    supabaseAnonKey,
  ]);

  /*
   * Join a class
   */
  const handleJoinClass = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setCodeError(null);

    const trimmedCode =
      classCode
        .trim()
        .toUpperCase();

    if (!trimmedCode) {
      return;
    }

    setJoining(true);

    try {
      /*
       * 1. Check whether class code exists
       */
      const codeCheckResponse =
        await fetch(
          `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
            trimmedCode
          )}&select=*`,
          {
            headers:
              supabaseHeaders,
          }
        );

      const matchedClasses =
        await codeCheckResponse.json();

      const foundClass =
        matchedClasses[0];

      if (!foundClass) {
        setCodeError(
          text.codeInvalid
        );

        setJoining(false);
        return;
      }

      /*
       * 2. Check whether already joined
       */
      const alreadyJoined =
        myClasses.some(
          (c) =>
            c.code ===
            foundClass.code
        );

      if (alreadyJoined) {
        setCodeError(
          text.alreadyJoined
        );

        setJoining(false);
        return;
      }

      /*
       * 3. Save enrollment
       */
      const insertResponse =
        await fetch(
          `${supabaseUrl}/rest/v1/student_classes`,
          {
            method: 'POST',
            headers: {
              ...supabaseHeaders,
              'Content-Type':
                'application/json',
              Prefer:
                'return=representation',
            },

            body: JSON.stringify({
              class_name:
                foundClass.class_name,

              code:
                foundClass.code,

              school:
                foundClass.school_name,
            }),
          }
        );

      if (insertResponse.ok) {
        const newEnrollment =
          await insertResponse.json();

        setMyClasses(
          (prev) => [
            ...prev,
            newEnrollment[0],
          ]
        );

        setClassCode('');
      } else {
        const errorData =
          await insertResponse.json();

        console.error(
          'Supabase Error Details:',
          errorData
        );

        setCodeError(
          `${text.failedToJoin} ${
            errorData.message ||
            text.unknownError
          }`
        );
      }
    } catch (err) {
      console.error(
        'Error joining class:',
        err
      );

      setCodeError(
        text.networkError
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto space-y-8 px-6 py-8">

        {/* DASHBOARD HEADER */}

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {text.dashboardTitle}
          </h1>

          <p className="text-muted-foreground">
            {text.dashboardDescription}
          </p>
        </div>

        {/* JOIN CLASS */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <PlusCircle className="h-5 w-5 text-primary" />

                {text.classCodeInput}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={
                  handleJoinClass
                }
                className="space-y-3"
              >
                <div className="flex gap-3">

                  <Input
                    type="text"
                    placeholder={
                      text.enterCode
                    }
                    value={classCode}
                    onChange={(e) => {
                      setClassCode(
                        e.target.value
                      );

                      if (codeError) {
                        setCodeError(
                          null
                        );
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
                  <span className="block text-xs font-medium text-red-500">
                    {codeError}
                  </span>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* CLASSES + ASSIGNMENTS */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* CLASSES */}

          <Card className="bg-card lg:col-span-2">

            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">

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

                  myClasses.map(
                    (
                      item,
                      index
                    ) => (

                      <Link
                        key={
                          item.id ||
                          `${item.code}-${index}`
                        }
                        href={`/dashboard/student/classes/${item.code}`}
                      >

                        <div className="mb-2 flex cursor-pointer items-center justify-between rounded-lg border border-border bg-accent/20 p-4 transition hover:bg-accent/40">

                          <div>

                            <h4 className="font-medium text-foreground">
                              {
                                item.class_name
                              }
                            </h4>

                            <p className="text-xs text-muted-foreground">
                              {text.school}{' '}
                              {
                                item.school
                              }
                            </p>

                          </div>

                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {
                              text.active
                            }
                          </span>

                        </div>

                      </Link>

                    )
                  )
                )}

              </div>

            </CardContent>

          </Card>

          {/* ASSIGNMENTS DUE */}

          <Card className="bg-card">

            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">

                <ClipboardList className="h-5 w-5 text-primary" />

                {text.assignmentsDue}

              </CardTitle>
            </CardHeader>

            <CardContent>

              {loadingAssignments ? (

                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>

              ) : upcomingAssignments.length === 0 ? (

                <div className="rounded-lg border border-dashed border-border p-5 text-center">

                  <ClipboardList className="mx-auto mb-2 size-7 text-muted-foreground" />

                  <p className="text-sm text-muted-foreground">
                    {
                      text.noAssignments
                    }
                  </p>

                </div>

              ) : (

                <div className="space-y-3">

                  {upcomingAssignments.map(
                    (
                      assignment,
                      index
                    ) => {

                      const dueLabel =
                        getDueLabel(
                          assignment.due_date
                        );

                      return (
                        <Link
                          key={
                            assignment.id ||
                            `${assignment.class_code}-${index}`
                          }
                          href={`/dashboard/student/classes/${assignment.class_code}`}
                        >

                          <div className="group rounded-lg border border-border bg-background p-3 transition hover:border-primary/50 hover:bg-primary/5">

                            <div className="flex items-start gap-3">

                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <ClipboardList className="size-4 text-primary" />
                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="truncate font-semibold text-foreground">
                                  {
                                    assignment.name
                                  }
                                </p>

                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {
                                    assignment.class_name
                                  }
                                </p>

                                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">

                                  <CalendarDays className="size-3.5" />

                                  {dueLabel && (
                                    <span>
                                      {
                                        dueLabel
                                      }
                                      {' • '}
                                    </span>
                                  )}

                                  {
                                    text.due
                                  }{' '}

                                  {
                                    formatDueDate(
                                      assignment.due_date
                                    )
                                  }

                                </p>

                              </div>

                              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />

                            </div>

                          </div>

                        </Link>
                      );
                    }
                  )}

                </div>

              )}

            </CardContent>

          </Card>

        </div>

      </main>
    </div>
  );
}
