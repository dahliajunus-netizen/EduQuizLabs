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
  BarChart3,
  X,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

type StudentClass = {
  id: string;
  class_name: string;
  code: string;
  school: string;
  course_id?: string | null;
};

type Assignment = {
  id: string;
  course_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  due_date?: string | null;
};

type Submission = {
  id: string;
  assignment_id: string;
  nickname: string;
  class: string;
  link: string;
  grade: number | null;
  created_at: string;
};

type GradeHistoryItem = {
  name: string;
  grade: number;
  type: 'assignment' | 'test';
};

export default function StudentDashboard() {
  const { language } = useLanguage();

  const [classCode, setClassCode] = useState('');
  const [myClasses, setMyClasses] = useState<StudentClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [showGrades, setShowGrades] = useState(false);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

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

      assignmentsDue: 'Assignments Due',
      noAssignments: 'No upcoming assignments.',

      averageGrades: 'Average Grades',
      noGrades: 'No grades yet',

      gradeHistory: 'Grade History',
      assignment: 'Assignment',
      test: 'Test',

      due: 'Due',
      overdue: 'Overdue',
      noDueDate: 'No due date',

      codeInvalid: 'Code is invalid',
      alreadyJoined: 'You have already joined this class.',
      networkError: 'Network error joining class.',
      failedToJoin: 'Failed to join:',
      unknownError: 'Unknown error',

      close: 'Close',
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

      assignmentsDue: 'Tugas yang Akan Datang',
      noAssignments: 'Tidak ada tugas yang akan datang.',

      averageGrades: 'Nilai Rata-Rata',
      noGrades: 'Belum ada nilai',

      gradeHistory: 'Riwayat Nilai',
      assignment: 'Tugas',
      test: 'Ujian',

      due: 'Batas',
      overdue: 'Terlambat',
      noDueDate: 'Tidak ada batas waktu',

      codeInvalid: 'Kode tidak valid',
      alreadyJoined: 'Anda sudah bergabung dengan kelas ini.',
      networkError: 'Terjadi kesalahan jaringan saat bergabung ke kelas.',
      failedToJoin: 'Gagal bergabung:',
      unknownError: 'Kesalahan tidak diketahui',

      close: 'Tutup',
    },
  };

  const text = language === 'id' ? t.id : t.en;

  /*
   * Fetch student's classes
   */
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        /*
         * 1. Fetch enrolled classes
         */
        const classesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/student_classes?select=*`,
          {
            headers,
          }
        );

        if (!classesResponse.ok) {
          throw new Error('Failed to fetch student classes');
        }

        const classesData: StudentClass[] =
          await classesResponse.json();

        setMyClasses(classesData);

        /*
         * 2. Get course UUIDs
         */
        const courseIds = classesData
          .map((item) => item.course_id)
          .filter(
            (id): id is string =>
              typeof id === 'string' && id.length > 0
          );

        if (courseIds.length === 0) {
          setAssignments([]);
          setSubmissions([]);
          return;
        }

        /*
         * 3. Fetch assignments for those courses
         */
        const courseFilter = courseIds
          .map((id) => `"${id}"`)
          .join(',');

        const assignmentsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/course_assignments?course_id=in.(${courseFilter})&select=*`,
          {
            headers,
          }
        );

        if (assignmentsResponse.ok) {
          const assignmentsData: Assignment[] =
            await assignmentsResponse.json();

          setAssignments(assignmentsData);

          /*
           * 4. Fetch submissions for those assignments
           */
          if (assignmentsData.length > 0) {
            const assignmentIds = assignmentsData
              .map((assignment) => assignment.id)
              .filter(Boolean);

            const assignmentFilter = assignmentIds
              .map((id) => `"${id}"`)
              .join(',');

            const submissionsResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/assignment_submissions?assignment_id=in.(${assignmentFilter})&select=*`,
              {
                headers,
              }
            );

            if (submissionsResponse.ok) {
              const submissionsData: Submission[] =
                await submissionsResponse.json();

              setSubmissions(submissionsData);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching student dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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
       * 1. Find class by code
       */
      const codeCheckResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
          trimmedCode
        )}&select=*`,
        {
          headers,
        }
      );

      if (!codeCheckResponse.ok) {
        throw new Error('Failed to check class code');
      }

      const matchedClasses = await codeCheckResponse.json();
      const foundClass = matchedClasses[0];

      if (!foundClass) {
        setCodeError(text.codeInvalid);
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
        return;
      }

      /*
       * 3. Save enrollment INCLUDING course UUID
       */
      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/student_classes`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            class_name: foundClass.class_name,
            code: foundClass.code,
            school: foundClass.school_name,
            course_id: foundClass.id,
          }),
        }
      );

      if (!insertResponse.ok) {
        const errorData = await insertResponse.json();

        console.error('Supabase Error Details:', errorData);

        setCodeError(
          `${text.failedToJoin} ${
            errorData.message || text.unknownError
          }`
        );

        return;
      }

      const newEnrollment = await insertResponse.json();

      setMyClasses((prev) => [...prev, newEnrollment[0]]);
      setClassCode('');

      /*
       * Fetch assignments for the newly joined course
       */
      const newCourseId = foundClass.id;

      const assignmentsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(
          newCourseId
        )}&select=*`,
        {
          headers,
        }
      );

      if (assignmentsResponse.ok) {
        const newAssignments: Assignment[] =
          await assignmentsResponse.json();

        setAssignments((prev) => [
          ...prev,
          ...newAssignments.filter(
            (newAssignment) =>
              !prev.some(
                (existing) => existing.id === newAssignment.id
              )
          ),
        ]);
      }
    } catch (err) {
      console.error('Error joining class:', err);
      setCodeError(text.networkError);
    } finally {
      setJoining(false);
    }
  };

  /*
   * Find grades
   *
   * IMPORTANT:
   * A submission belongs to an assignment through:
   *
   * assignment_submissions.assignment_id
   *              ↓
   * course_assignments.id
   */
  const gradeHistory: GradeHistoryItem[] = assignments
    .map((assignment) => {
      const submission = submissions.find(
        (item) => item.assignment_id === assignment.id
      );

      if (
        !submission ||
        submission.grade === null ||
        submission.grade === undefined
      ) {
        return null;
      }

      return {
        name: assignment.name,
        grade: Number(submission.grade),
        type: 'assignment' as const,
      };
    })
    .filter(
      (item): item is GradeHistoryItem => item !== null
    );

  /*
   * Calculate average
   */
  const averageGrade =
    gradeHistory.length > 0
      ? Math.round(
          (gradeHistory.reduce(
            (total, item) => total + item.grade,
            0
          ) /
            gradeHistory.length) *
            100
        ) / 100
      : null;

  /*
   * Upcoming assignments
   */
  const now = new Date();

  const upcomingAssignments = assignments
    .filter((assignment) => {
      if (!assignment.due_date) return true;

      return new Date(assignment.due_date) >= now;
    })
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;

      return (
        new Date(a.due_date).getTime() -
        new Date(b.due_date).getTime()
      );
    });

  /*
   * Get assignments for a specific class
   */
  const getClassAssignments = (courseId?: string | null) => {
    if (!courseId) return [];

    return upcomingAssignments.filter(
      (assignment) => assignment.course_id === courseId
    );
  };

  /*
   * Format due date
   */
  const formatDueDate = (date?: string | null) => {
    if (!date) return text.noDueDate;

    return new Date(date).toLocaleDateString(
      language === 'id' ? 'id-ID' : 'en-US',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {text.dashboardTitle}
          </h1>

          <p className="text-muted-foreground">
            {text.dashboardDescription}
          </p>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Join Class */}
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

          {/* Average Grades */}
          <Card
            className="bg-card cursor-pointer hover:bg-accent/20 transition"
            onClick={() => setShowGrades(true)}
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {text.averageGrades}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : averageGrade === null ? (
                <div>
                  <p className="text-3xl font-bold text-muted-foreground">
                    —
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    {text.noGrades}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-4xl font-bold text-primary">
                    {averageGrade}
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    {gradeHistory.length}{' '}
                    {gradeHistory.length === 1
                      ? 'grade'
                      : 'grades'}
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

                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : myClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {text.noClasses}
                  </p>
                ) : (
                  myClasses.map((item, index) => {
                    const classAssignments =
                      getClassAssignments(item.course_id);

                    return (
                      <Link
                        key={item.id || index}
                        href={`/dashboard/student/classes/${item.code}`}
                      >
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition cursor-pointer mb-2">

                          <div className="min-w-0">
                            <h4 className="font-medium text-foreground">
                              {item.class_name}
                            </h4>

                            <p className="text-xs text-muted-foreground">
                              {text.school} {item.school}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">

                            {/* Assignments Due */}
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <CalendarDays className="h-4 w-4 text-primary" />

                              <span>
                                {classAssignments.length}{' '}
                                {text.assignmentsDue}
                              </span>
                            </div>

                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                              {text.active}
                            </span>

                          </div>

                        </div>
                      </Link>
                    );
                  })
                )}

              </div>

            </CardContent>
          </Card>

        </div>

        {/* Assignment Due Section */}
        {myClasses.length > 0 && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {text.assignmentsDue}
              </CardTitle>
            </CardHeader>

            <CardContent>

              {upcomingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {text.noAssignments}
                </p>
              ) : (
                <div className="space-y-3">

                  {upcomingAssignments.map((assignment) => {
                    const parentClass = myClasses.find(
                      (item) =>
                        item.course_id === assignment.course_id
                    );

                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20"
                      >

                        <div className="min-w-0">
                          <h4 className="font-medium text-foreground">
                            {assignment.name}
                          </h4>

                          {parentClass && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {parentClass.class_name}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {text.due}
                          </p>

                          <p className="text-sm font-semibold text-foreground">
                            {formatDueDate(
                              assignment.due_date
                            )}
                          </p>
                        </div>

                      </div>
                    );
                  })}

                </div>
              )}

            </CardContent>
          </Card>
        )}

      </main>

      {/* Grade History Modal */}
      {showGrades && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowGrades(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">

              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {text.gradeHistory}
                </h2>

                {averageGrade !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {text.averageGrades}:{' '}
                    <span className="font-semibold text-primary">
                      {averageGrade}
                    </span>
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGrades(false)}
              >
                <X className="h-5 w-5" />
              </Button>

            </div>

            {/* Grade List */}
            <div className="p-5">

              {gradeHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {text.noGrades}
                </p>
              ) : (
                <div className="space-y-2">

                  {gradeHistory.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20"
                    >

                      <div>
                        <p className="font-medium text-foreground">
                          {item.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {item.type === 'assignment'
                            ? text.assignment
                            : text.test}
                        </p>
                      </div>

                      <p className="text-lg font-bold text-primary">
                        {item.grade}
                      </p>

                    </div>
                  ))}

                </div>
              )}

            </div>

            {/* Close */}
            <div className="flex justify-end p-5 pt-0">
              <Button
                variant="outline"
                onClick={() => setShowGrades(false)}
              >
                {text.close}
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
