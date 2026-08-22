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
  CalendarDays,
  GraduationCap,
  X,
  ClipboardList,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

type ClassItem = {
  class_name: string;
  code: string;
  school?: string;
};

type GradeItem = {
  id: string;
  name: string;
  grade: number;
  type: 'assignment' | 'test';
};

type AssignmentItem = {
  id: string;
  title: string;
  name?: string;
  assignment_name?: string;
  due_date?: string | null;
  class_code?: string;
  code?: string;
  class_name?: string;
  grade?: number | string | null;
  score?: number | string | null;
  points?: number | string | null;
};

type TestItem = {
  id: string;
  title?: string;
  name?: string;
  test_name?: string;
  class_code?: string;
  code?: string;
  class_name?: string;
  grade?: number | string | null;
  score?: number | string | null;
  points?: number | string | null;
};

export default function StudentDashboard() {
  const { language } = useLanguage();

  const [classCode, setClassCode] = useState('');
  const [myClasses, setMyClasses] = useState<ClassItem[]>([]);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);

  const [showGrades, setShowGrades] = useState(false);

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

      assignmentsDue: 'Assignments Due',
      noAssignments: 'No upcoming assignments.',

      averageGrades: 'Average Grades',
      noGrades: 'No grades yet',
      viewGrades: 'View Grade History',

      gradeHistory: 'Grade History',
      assignment: 'Assignment',
      test: 'Test',

      close: 'Close',
      due: 'Due',
      today: 'Today',
      tomorrow: 'Tomorrow',
      overdue: 'Overdue',

      loading: 'Loading...',
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

      assignmentsDue: 'Tugas Mendatang',
      noAssignments: 'Tidak ada tugas yang akan datang.',

      averageGrades: 'Rata-rata Nilai',
      noGrades: 'Belum ada nilai',
      viewGrades: 'Lihat Riwayat Nilai',

      gradeHistory: 'Riwayat Nilai',
      assignment: 'Tugas',
      test: 'Ujian',

      close: 'Tutup',
      due: 'Batas',
      today: 'Hari ini',
      tomorrow: 'Besok',
      overdue: 'Terlambat',

      loading: 'Memuat...',
    },
  };

  const text = language === 'id' ? t.id : t.en;

  /*
   * Supabase helpers
   */
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseHeaders = {
    apikey: supabaseKey!,
    Authorization: `Bearer ${supabaseKey!}`,
  };

  /*
   * Get a useful name from an assignment/test row.
   */
  const getItemName = (item: any, fallback: string) => {
    return (
      item.title ||
      item.name ||
      item.assignment_name ||
      item.test_name ||
      fallback
    );
  };

  /*
   * Get the grade from a row.
   */
  const getGrade = (item: any): number | null => {
    const possibleGrade =
      item.grade ??
      item.score ??
      item.points ??
      item.mark;

    if (
      possibleGrade === null ||
      possibleGrade === undefined ||
      possibleGrade === ''
    ) {
      return null;
    }

    const numberGrade = Number(possibleGrade);

    if (Number.isNaN(numberGrade)) {
      return null;
    }

    return Math.max(0, Math.min(100, numberGrade));
  };

  /*
   * Check whether an item belongs to one of the student's classes.
   */
  const belongsToMyClass = (item: any) => {
    if (!myClasses.length) return false;

    const itemCode =
      item.class_code ||
      item.code ||
      item.classCode;

    const itemClassName =
      item.class_name ||
      item.className;

    /*
     * If the row has no class information, allow it.
     * This keeps compatibility with tables where RLS already
     * restricts the returned rows to the current student.
     */
    if (!itemCode && !itemClassName) {
      return true;
    }

    return myClasses.some(
      (classItem) =>
        (itemCode &&
          String(itemCode).toUpperCase() ===
            String(classItem.code).toUpperCase()) ||
        (itemClassName &&
          String(itemClassName).toLowerCase() ===
            String(classItem.class_name).toLowerCase())
    );
  };

  /*
   * Fetch student's classes
   */
  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/student_classes?select=*`,
          {
            headers: supabaseHeaders,
          }
        );

        if (response.ok) {
          const data = await response.json();
          setMyClasses(data || []);
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
   * Fetch assignments and tests.
   *
   * course_assignments requires:
   * - title/name/assignment_name
   * - due_date
   * - grade/score if the grade is stored directly there
   *
   * course_tests is optional. If it does not exist, the dashboard
   * will simply continue without test grades.
   */
  useEffect(() => {
    async function fetchAcademicData() {
      setGradesLoading(true);

      try {
        /*
         * Fetch assignments
         */
        const assignmentResponse = await fetch(
          `${supabaseUrl}/rest/v1/course_assignments?select=*`,
          {
            headers: supabaseHeaders,
          }
        );

        let assignmentData: AssignmentItem[] = [];

        if (assignmentResponse.ok) {
          assignmentData = await assignmentResponse.json();
        } else {
          console.error(
            'Could not fetch assignments:',
            await assignmentResponse.text()
          );
        }

        /*
         * Fetch tests.
         *
         * If your project does not have course_tests yet,
         * this safely falls back to an empty list.
         */
        let testData: TestItem[] = [];

        try {
          const testResponse = await fetch(
            `${supabaseUrl}/rest/v1/course_tests?select=*`,
            {
              headers: supabaseHeaders,
            }
          );

          if (testResponse.ok) {
            testData = await testResponse.json();
          }
        } catch (err) {
          console.log('No course_tests table available.');
        }

        /*
         * Keep only assignments belonging to the student's classes.
         */
        const filteredAssignments = assignmentData.filter(
          belongsToMyClass
        );

        const filteredTests = testData.filter(belongsToMyClass);

        setAssignments(filteredAssignments);
        setTests(filteredTests);

        /*
         * Build grade history
         */
        const gradeHistory: GradeItem[] = [];

        filteredAssignments.forEach((assignment, index) => {
          const grade = getGrade(assignment);

          if (grade !== null) {
            gradeHistory.push({
              id: `assignment-${assignment.id || index}`,
              name: getItemName(
                assignment,
                language === 'id' ? 'Tugas' : 'Assignment'
              ),
              grade,
              type: 'assignment',
            });
          }
        });

        filteredTests.forEach((test, index) => {
          const grade = getGrade(test);

          if (grade !== null) {
            gradeHistory.push({
              id: `test-${test.id || index}`,
              name: getItemName(
                test,
                language === 'id' ? 'Ujian' : 'Test'
              ),
              grade,
              type: 'test',
            });
          }
        });

        setGrades(gradeHistory);
      } catch (err) {
        console.error('Error fetching academic data:', err);
      } finally {
        setGradesLoading(false);
      }
    }

    /*
     * Wait until classes have loaded before filtering
     * the assignments/tests.
     */
    if (!loading) {
      fetchAcademicData();
    }
  }, [loading, myClasses, language]);

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
        `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
          trimmedCode
        )}&select=*`,
        {
          headers: supabaseHeaders,
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
        `${supabaseUrl}/rest/v1/student_classes`,
        {
          method: 'POST',
          headers: {
            ...supabaseHeaders,
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

  /*
   * Average grade
   */
  const averageGrade =
    grades.length > 0
      ? grades.reduce((sum, item) => sum + item.grade, 0) /
        grades.length
      : null;

  /*
   * Upcoming assignments
   */
  const upcomingAssignments = assignments
    .filter((assignment) => assignment.due_date)
    .filter((assignment) => {
      const due = new Date(assignment.due_date as string);
      return !Number.isNaN(due.getTime());
    })
    .sort((a, b) => {
      const dateA = new Date(a.due_date as string).getTime();
      const dateB = new Date(b.due_date as string).getTime();

      return dateA - dateB;
    })
    .slice(0, 5);

  /*
   * Format due date
   */
  const formatDueDate = (dateString?: string | null) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    const today = new Date();
    const tomorrow = new Date();

    tomorrow.setDate(today.getDate() + 1);

    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    const isTomorrow =
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate();

    if (isToday) return text.today;
    if (isTomorrow) return text.tomorrow;

    return date.toLocaleDateString(
      language === 'id' ? 'id-ID' : 'en-US',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  /*
   * Check whether assignment is overdue
   */
  const isOverdue = (dateString?: string | null) => {
    if (!dateString) return false;

    const dueDate = new Date(dateString).getTime();

    return dueDate < Date.now();
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

        {/* Assignments + Average Grades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Assignments Due */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />

                {text.assignmentsDue}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {gradesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {text.noAssignments}
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingAssignments.map((assignment, index) => {
                    const overdue = isOverdue(
                      assignment.due_date
                    );

                    return (
                      <div
                        key={
                          assignment.id ||
                          `assignment-${index}`
                        }
                        className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-accent/20"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {getItemName(
                              assignment,
                              text.assignment
                            )}
                          </p>

                          {assignment.class_name && (
                            <p className="text-xs text-muted-foreground">
                              {assignment.class_name}
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-xs font-semibold whitespace-nowrap ${
                            overdue
                              ? 'text-red-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {overdue
                            ? text.overdue
                            : `${text.due} ${formatDueDate(
                                assignment.due_date
                              )}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Average Grades */}
          <Card
            className="bg-card cursor-pointer hover:bg-accent/10 transition"
            onClick={() => {
              if (grades.length > 0) {
                setShowGrades(true);
              }
            }}
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />

                {text.averageGrades}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {gradesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : averageGrade === null ? (
                <div className="py-4">
                  <p className="text-3xl font-bold text-muted-foreground">
                    —
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    {text.noGrades}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-5xl font-bold tracking-tight text-primary">
                    {averageGrade % 1 === 0
                      ? averageGrade
                      : averageGrade.toFixed(1)}
                  </p>

                  <p className="text-sm text-muted-foreground mt-2">
                    {text.viewGrades}
                  </p>
                </div>
              )}
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

                  <p className="text-sm text-muted-foreground">
                    {text.noClasses}
                  </p>

                ) : (

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

      {/* Grade History Popup */}
      {showGrades && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowGrades(false)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Popup Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">

              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {text.gradeHistory}
                </h2>

                {averageGrade !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {text.averageGrades}:{' '}
                    <span className="font-semibold text-primary">
                      {averageGrade % 1 === 0
                        ? averageGrade
                        : averageGrade.toFixed(1)}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowGrades(false)}
                className="rounded-md p-2 hover:bg-accent transition"
                aria-label={text.close}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>

            </div>

            {/* Grade List */}
            <div className="overflow-y-auto max-h-[60vh] p-5">

              <div className="space-y-2">

                {grades.map((item) => (

                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-accent/20 p-4"
                  >

                    <div className="flex items-center gap-3 min-w-0">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        {item.type === 'assignment' ? (
                          <ClipboardList className="h-4 w-4 text-primary" />
                        ) : (
                          <GraduationCap className="h-4 w-4 text-primary" />
                        )}
                      </div>

                      <div className="min-w-0">

                        <p className="font-medium text-sm text-foreground truncate">
                          {item.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {item.type === 'assignment'
                            ? text.assignment
                            : text.test}
                        </p>

                      </div>

                    </div>

                    <span className="text-lg font-bold text-primary shrink-0">
                      {item.grade}
                    </span>

                  </div>

                ))}

              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
