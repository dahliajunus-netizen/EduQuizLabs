'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

type TeacherClass = {
  id: string;
  class_name: string;
  code: string;
  school_name?: string | null;
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

  const headers = useMemo(
    () => ({
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }),
    [SUPABASE_KEY]
  );

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
      assignmentCount: 'assignments',
      assignment: 'Assignment',
      assignments: 'Assignments',

      dueToday: 'Due today',
      dueTomorrow: 'Due tomorrow',
      dueIn: 'Due in',
      days: 'days',
      overdue: 'Overdue',
      noDueDate: 'No due date',

      averageGrades: 'Average Grades',
      noGrades: 'No grades yet',
      gradeHistory: 'Grade History',

      test: 'Test',
      close: 'Close',

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

      assignmentsDue: 'Tugas',
      assignmentCount: 'tugas',
      assignment: 'Tugas',
      assignments: 'Tugas',

      dueToday: 'Jatuh tempo hari ini',
      dueTomorrow: 'Jatuh tempo besok',
      dueIn: 'Jatuh tempo dalam',
      days: 'hari',
      overdue: 'Terlambat',
      noDueDate: 'Tidak ada batas waktu',

      averageGrades: 'Nilai Rata-Rata',
      noGrades: 'Belum ada nilai',
      gradeHistory: 'Riwayat Nilai',

      test: 'Ujian',
      close: 'Tutup',

      codeInvalid: 'Kode tidak valid',
      alreadyJoined: 'Anda sudah bergabung dengan kelas ini.',
      networkError: 'Terjadi kesalahan jaringan saat bergabung ke kelas.',
      failedToJoin: 'Gagal bergabung:',
      unknownError: 'Kesalahan tidak diketahui',
    },
  };

  const text = language === 'id' ? t.id : t.en;

  /*
   * Fetch all dashboard data.
   *
   * Important:
   * student_classes does NOT need course_id to already exist.
   * We use the class code to find the matching teacher_classes row,
   * then use teacher_classes.id as course_assignments.course_id.
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      /*
       * 1. Get student's enrolled classes
       */
      const classesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/student_classes?select=*`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!classesResponse.ok) {
        throw new Error('Failed to fetch student classes');
      }

      const classesData: StudentClass[] = await classesResponse.json();

      setMyClasses(classesData);

      if (classesData.length === 0) {
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      /*
       * 2. Get the teacher class records using the class codes.
       *
       * This is what connects:
       *
       * student_classes.code
       *        ↓
       * teacher_classes.code
       *        ↓
       * teacher_classes.id
       *        ↓
       * course_assignments.course_id
       */
      const classCodes = classesData
        .map((item) => item.code)
        .filter(Boolean);

      const codeFilter = classCodes
        .map((code) => `"${String(code).replace(/"/g, '\\"')}"`)
        .join(',');

      const teacherClassesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/teacher_classes?code=in.(${codeFilter})&select=id,class_name,code,school_name`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!teacherClassesResponse.ok) {
        throw new Error('Failed to fetch teacher classes');
      }

      const teacherClasses: TeacherClass[] =
        await teacherClassesResponse.json();

      /*
       * 3. Build course UUID list.
       */
      const courseIds = teacherClasses
        .map((item) => item.id)
        .filter(Boolean);

      /*
       * Also use student_classes.course_id if it exists.
       * This makes the system compatible with the new column.
       */
      classesData.forEach((studentClass) => {
        if (
          studentClass.course_id &&
          !courseIds.includes(studentClass.course_id)
        ) {
          courseIds.push(studentClass.course_id);
        }
      });

      if (courseIds.length === 0) {
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      /*
       * 4. Fetch ALL assignments belonging to the student's courses.
       */
      const courseFilter = courseIds
        .map((id) => `"${id}"`)
        .join(',');

      const assignmentsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/course_assignments?course_id=in.(${courseFilter})&select=id,course_id,name,description,created_at,due_date&order=due_date.asc.nullslast`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!assignmentsResponse.ok) {
        const error = await assignmentsResponse.text();
        console.error('Assignment fetch error:', error);

        setAssignments([]);
        setSubmissions([]);
        return;
      }

      const assignmentsData: Assignment[] =
        await assignmentsResponse.json();

      setAssignments(assignmentsData);

      /*
       * 5. Fetch submissions for the assignments.
       *
       * We fetch every submission belonging to these assignments.
       * The submission is then matched to the assignment by
       * assignment_id.
       */
      if (assignmentsData.length === 0) {
        setSubmissions([]);
        return;
      }

      const assignmentIds = assignmentsData.map(
        (assignment) => assignment.id
      );

      const assignmentFilter = assignmentIds
        .map((id) => `"${id}"`)
        .join(',');

      const submissionsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/assignment_submissions?assignment_id=in.(${assignmentFilter})&select=id,assignment_id,nickname,class,link,grade,created_at&order=created_at.desc`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!submissionsResponse.ok) {
        const error = await submissionsResponse.text();
        console.error('Submission fetch error:', error);

        setSubmissions([]);
        return;
      }

      const submissionsData: Submission[] =
        await submissionsResponse.json();

      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [SUPABASE_URL, headers]);

  /*
   * Initial load
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /*
   * Refresh when the student returns to the dashboard.
   *
   * This makes a teacher's newly saved grade appear after
   * navigating back / switching back to the tab.
   */
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [fetchDashboardData]);

  /*
   * Join class
   */
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    const trimmedCode = classCode.trim().toUpperCase();

    if (!trimmedCode) return;

    setJoining(true);

    try {
      /*
       * Find teacher class.
       */
      const codeCheckResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
          trimmedCode
        )}&select=*`,
        {
          headers,
          cache: 'no-store',
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
       * Check duplicate enrollment.
       */
      const alreadyJoined = myClasses.some(
        (c) => c.code === foundClass.code
      );

      if (alreadyJoined) {
        setCodeError(text.alreadyJoined);
        return;
      }

      /*
       * Save enrollment.
       *
       * course_id is included now.
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

      setClassCode('');

      /*
       * Reload everything so assignments appear immediately.
       */
      await fetchDashboardData();
    } catch (error) {
      console.error('Error joining class:', error);
      setCodeError(text.networkError);
    } finally {
      setJoining(false);
    }
  };

  /*
   * Match every graded submission to its assignment.
   */
  const gradeHistory: GradeHistoryItem[] = assignments
    .map((assignment) => {
      /*
       * Use the newest submission for the assignment.
       */
      const matchingSubmissions = submissions
        .filter(
          (submission) =>
            submission.assignment_id === assignment.id
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

      const submission = matchingSubmissions[0];

      if (
        !submission ||
        submission.grade === null ||
        submission.grade === undefined ||
        Number.isNaN(Number(submission.grade))
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
   * Average grade.
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
   * Get assignments belonging to a class.
   */
  const getClassAssignments = (studentClass: StudentClass) => {
    const matchingTeacherClass = teacherClassesForDisplay.find(
      (teacherClass) =>
        teacherClass.code === studentClass.code
    );

    const courseId =
      studentClass.course_id ||
      matchingTeacherClass?.id ||
      null;

    if (!courseId) return [];

    return assignments.filter(
      (assignment) => assignment.course_id === courseId
    );
  };

  /*
   * We don't need to store this separately.
   * Reconstruct the teacher class data from assignments/classes
   * isn't enough, so fetch it directly for display matching.
   */
  const [teacherClassesForDisplay, setTeacherClassesForDisplay] =
    useState<TeacherClass[]>([]);

  /*
   * Keep teacher class data available.
   */
  useEffect(() => {
    async function fetchTeacherClassesForDisplay() {
      if (myClasses.length === 0) {
        setTeacherClassesForDisplay([]);
        return;
      }

      try {
        const classCodes = myClasses
          .map((item) => item.code)
          .filter(Boolean);

        if (classCodes.length === 0) {
          setTeacherClassesForDisplay([]);
          return;
        }

        const codeFilter = classCodes
          .map((code) => `"${String(code).replace(/"/g, '\\"')}"`)
          .join(',');

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/teacher_classes?code=in.(${codeFilter})&select=id,class_name,code,school_name`,
          {
            headers,
            cache: 'no-store',
          }
        );

        if (response.ok) {
          const data: TeacherClass[] = await response.json();
          setTeacherClassesForDisplay(data);
        }
      } catch (error) {
        console.error(
          'Error fetching teacher class information:',
          error
        );
      }
    }

    fetchTeacherClassesForDisplay();
  }, [myClasses, SUPABASE_URL, headers]);

  /*
   * Assignment status.
   */
  const getDueStatus = (dueDate?: string | null) => {
    if (!dueDate) {
      return {
        label: text.noDueDate,
        className: 'text-muted-foreground',
      };
    }

    const due = new Date(dueDate);
    const now = new Date();

    /*
     * Compare calendar days instead of raw hours.
     */
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const startOfDueDay = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate()
    );

    const difference =
      Math.round(
        (startOfDueDay.getTime() -
          startOfToday.getTime()) /
          (1000 * 60 * 60 * 24)
      );

    if (difference < 0) {
      return {
        label: text.overdue,
        className: 'text-red-500',
      };
    }

    if (difference === 0) {
      return {
        label: text.dueToday,
        className: 'text-orange-500',
      };
    }

    if (difference === 1) {
      return {
        label: text.dueTomorrow,
        className: 'text-yellow-500',
      };
    }

    return {
      label: `${text.dueIn} ${difference} ${text.days}`,
      className: 'text-primary',
    };
  };

  /*
   * Format exact due date.
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

  /*
   * ALL assignments.
   *
   * Nothing is hidden because it is overdue.
   */
  const sortedAssignments = [...assignments].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;

    return (
      new Date(a.due_date).getTime() -
      new Date(b.due_date).getTime()
    );
  });

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
                      getClassAssignments(item);

                    return (
                      <Link
                        key={item.id || index}
                        href={`/dashboard/student/classes/${item.code}`}
                      >
                        <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition cursor-pointer mb-2">

                          <div className="min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {item.class_name}
                            </h4>

                            <p className="text-xs text-muted-foreground">
                              {text.school} {item.school}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">

                            {/* Assignment count */}
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <CalendarDays className="h-4 w-4 text-primary" />

                              <span>
                                {classAssignments.length}{' '}
                                {text.assignmentCount}
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

        {/* Assignments */}
        {myClasses.length > 0 && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {text.assignmentsDue}
              </CardTitle>
            </CardHeader>

            <CardContent>

              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No assignments found.
                </p>
              ) : (
                <div className="space-y-3">

                  {sortedAssignments.map((assignment) => {
                    const dueStatus = getDueStatus(
                      assignment.due_date
                    );

                    const parentClass =
                      myClasses.find((studentClass) => {
                        const teacherClass =
                          teacherClassesForDisplay.find(
                            (teacher) =>
                              teacher.code === studentClass.code
                          );

                        return (
                          teacherClass?.id ===
                          assignment.course_id
                        );
                      });

                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-accent/20"
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

                          <p
                            className={`text-sm font-semibold ${dueStatus.className}`}
                          >
                            {dueStatus.label}
                          </p>

                          <p className="text-xs text-muted-foreground mt-1">
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
            className="w-full max-w-lg max-h-[80vh] overflow-hidden bg-card border border-border rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}
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

            {/* Grades */}
            <div className="p-5 overflow-y-auto max-h-[55vh]">

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

                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {item.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {item.type === 'assignment'
                            ? text.assignment
                            : text.test}
                        </p>
                      </div>

                      <p className="text-lg font-bold text-primary ml-4">
                        {item.grade}
                      </p>

                    </div>
                  ))}

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex justify-end p-5 border-t border-border">
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
