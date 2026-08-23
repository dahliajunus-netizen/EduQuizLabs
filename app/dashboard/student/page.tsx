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
  school: string | null;
  course_id: string | null;
};

type TeacherClass = {
  id: string;
  code: string;
  school_name: string | null;
  class_name: string;
  teacher_id?: string | null;
};

type Assignment = {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  created_at: string;
  due_date: string | null;
};

type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
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
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
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
      grades: 'grades',

      test: 'Test',
      close: 'Close',

      noAssignments: 'No assignments due.',
      loadingAssignments: 'Loading assignments...',

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
      grades: 'nilai',

      test: 'Ujian',
      close: 'Tutup',

      noAssignments: 'Tidak ada tugas yang harus dikerjakan.',
      loadingAssignments: 'Memuat tugas...',

      codeInvalid: 'Kode tidak valid',
      alreadyJoined: 'Anda sudah bergabung dengan kelas ini.',
      networkError: 'Terjadi kesalahan jaringan saat bergabung ke kelas.',
      failedToJoin: 'Gagal bergabung:',
      unknownError: 'Kesalahan tidak diketahui',
    },
  };

  const text = language === 'id' ? t.id : t.en;

  /*
   * ============================================================
   * CURRENT STUDENT
   * ============================================================
   *
   * Login saves:
   *
   * current_user = {
   *   id: "student UUID",
   *   fullName: "...",
   *   email: "...",
   *   role: "student"
   * }
   *
   * We use this UUID to make sure submissions belong
   * ONLY to the currently logged-in student.
   */
  const getCurrentStudentId = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const savedUser = localStorage.getItem('current_user');

      if (!savedUser) {
        console.error(
          '[Student Dashboard] current_user not found.'
        );
        return null;
      }

      const user = JSON.parse(savedUser);

      const studentId = user?.id;

      if (
        !studentId ||
        String(studentId).trim() === ''
      ) {
        console.error(
          '[Student Dashboard] current_user has no ID:',
          user
        );
        return null;
      }

      return String(studentId);
    } catch (error) {
      console.error(
        '[Student Dashboard] Failed to read current_user:',
        error
      );

      return null;
    }
  };

  /*
   * ============================================================
   * FETCH DASHBOARD DATA
   * ============================================================
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const studentId = getCurrentStudentId();

      if (!studentId) {
        setMyClasses([]);
        setTeacherClasses([]);
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      console.log(
        '[Student Dashboard] Current student ID:',
        studentId
      );

      /*
       * ========================================================
       * STEP 1
       * Get student's classes.
       * ========================================================
       */
      const classesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/student_classes?select=id,class_name,code,school,course_id`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!classesResponse.ok) {
        const error = await classesResponse.text();

        console.error(
          '[Student Dashboard] Student classes error:',
          error
        );

        throw new Error(
          'Failed to fetch student classes'
        );
      }

      const classesData: StudentClass[] =
        await classesResponse.json();

      setMyClasses(classesData);

      if (classesData.length === 0) {
        setTeacherClasses([]);
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      /*
       * ========================================================
       * STEP 2
       * Get teacher class information.
       * ========================================================
       */
      const codes = classesData
        .map((item) => item.code)
        .filter(Boolean);

      if (codes.length > 0) {
        const codeFilter = codes
          .map(
            (code) =>
              `"${String(code).replace(
                /"/g,
                '\\"'
              )}"`
          )
          .join(',');

        const teacherResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/teacher_classes?code=in.(${codeFilter})&select=id,code,school_name,class_name,teacher_id`,
          {
            headers,
            cache: 'no-store',
          }
        );

        if (teacherResponse.ok) {
          const teacherData: TeacherClass[] =
            await teacherResponse.json();

          setTeacherClasses(teacherData);
        }
      }

      /*
       * ========================================================
       * STEP 3
       * Get course IDs.
       * ========================================================
       */
      const courseIds = Array.from(
        new Set(
          classesData
            .map((item) => item.course_id)
            .filter(
              (id): id is string =>
                typeof id === 'string' &&
                id.length > 0
            )
        )
      );

      console.log(
        '[Student Dashboard] Course IDs:',
        courseIds
      );

      if (courseIds.length === 0) {
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      /*
       * ========================================================
       * STEP 4
       * Fetch assignments.
       * ========================================================
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
        const error =
          await assignmentsResponse.text();

        console.error(
          '[Student Dashboard] Course assignments error:',
          error
        );

        setAssignments([]);
        setSubmissions([]);
        return;
      }

      const assignmentsData: Assignment[] =
        await assignmentsResponse.json();

      console.log(
        '[Student Dashboard] Assignments:',
        assignmentsData
      );

      setAssignments(assignmentsData);

      /*
       * ========================================================
       * STEP 5
       * Fetch ONLY THIS STUDENT'S submissions.
       *
       * THIS IS THE IMPORTANT FIX.
       *
       * Before:
       *   assignment_id=in.(...)
       *
       * Now:
       *   assignment_id=in.(...)
       *   AND student_id=eq.<current student UUID>
       *
       * Therefore one student's grades/submissions cannot
       * affect another student's dashboard.
       * ========================================================
       */
      if (assignmentsData.length === 0) {
        setSubmissions([]);
        return;
      }

      const assignmentIds =
        assignmentsData.map(
          (assignment) => assignment.id
        );

      const assignmentFilter =
        assignmentIds
          .map((id) => `"${id}"`)
          .join(',');

      const submissionsResponse =
        await fetch(
          `${SUPABASE_URL}/rest/v1/assignment_submissions?assignment_id=in.(${assignmentFilter})&student_id=eq.${encodeURIComponent(
            studentId
          )}&select=id,assignment_id,student_id,nickname,class,link,grade,created_at&order=created_at.desc`,
          {
            headers,
            cache: 'no-store',
          }
        );

      if (!submissionsResponse.ok) {
        const error =
          await submissionsResponse.text();

        console.error(
          '[Student Dashboard] Assignment submissions error:',
          error
        );

        setSubmissions([]);
        return;
      }

      const submissionsData: Submission[] =
        await submissionsResponse.json();

      console.log(
        '[Student Dashboard] Current student submissions:',
        submissionsData
      );

      setSubmissions(submissionsData);
    } catch (error) {
      console.error(
        '[Student Dashboard] Error loading dashboard:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, [SUPABASE_URL, headers]);

  /*
   * Initial load.
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /*
   * Refresh when returning to dashboard.
   */
  useEffect(() => {
    const refresh = () => {
      fetchDashboardData();
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        fetchDashboardData();
      }
    };

    window.addEventListener(
      'focus',
      refresh
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    /*
     * Refresh every 10 seconds so teacher grades
     * appear automatically.
     */
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);

    return () => {
      window.removeEventListener(
        'focus',
        refresh
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  /*
   * ============================================================
   * JOIN CLASS
   * ============================================================
   */
  const handleJoinClass = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setCodeError(null);

    const trimmedCode =
      classCode.trim().toUpperCase();

    if (!trimmedCode) return;

    setJoining(true);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
          trimmedCode
        )}&select=id,code,class_name,school_name,teacher_id`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error(
          'Failed to check class code'
        );
      }

      const matchedClasses =
        await response.json();

      const foundClass =
        matchedClasses[0];

      if (!foundClass) {
        setCodeError(text.codeInvalid);
        return;
      }

      /*
       * Prevent duplicate enrollment.
       */
      const alreadyJoined =
        myClasses.some(
          (item) =>
            item.code?.toUpperCase() ===
            foundClass.code?.toUpperCase()
        );

      if (alreadyJoined) {
        setCodeError(
          text.alreadyJoined
        );
        return;
      }

      /*
       * Save teacher_classes.id into
       * student_classes.course_id.
       */
      const insertResponse =
        await fetch(
          `${SUPABASE_URL}/rest/v1/student_classes`,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type':
                'application/json',
              Prefer:
                'return=representation',
            },
            body: JSON.stringify({
              class_name:
                foundClass.class_name,
              code: foundClass.code,
              school:
                foundClass.school_name,
              course_id:
                foundClass.id,
            }),
          }
        );

      if (!insertResponse.ok) {
        const errorData =
          await insertResponse.json();

        console.error(
          '[Student Dashboard] Enrollment error:',
          errorData
        );

        setCodeError(
          `${text.failedToJoin} ${
            errorData.message ||
            text.unknownError
          }`
        );

        return;
      }

      setClassCode('');

      await fetchDashboardData();
    } catch (error) {
      console.error(
        '[Student Dashboard] Error joining class:',
        error
      );

      setCodeError(
        text.networkError
      );
    } finally {
      setJoining(false);
    }
  };

  /*
   * ============================================================
   * GET ASSIGNMENTS FOR CLASS
   * ============================================================
   */
  const getClassAssignments = (
    studentClass: StudentClass
  ) => {
    if (!studentClass.course_id) {
      return [];
    }

    return assignments.filter(
      (assignment) =>
        assignment.course_id ===
        studentClass.course_id
    );
  };

  /*
   * ============================================================
   * FIND THIS STUDENT'S SUBMISSION
   * ============================================================
   *
   * The API already filters by student_id, but we also
   * check it here for safety.
   */
  const getLatestSubmission = (
    assignmentId: string
  ) => {
    const studentId =
      getCurrentStudentId();

    if (!studentId) {
      return null;
    }

    const matching =
      submissions
        .filter(
          (submission) =>
            submission.assignment_id ===
              assignmentId &&
            String(
              submission.student_id
            ) === studentId
        )
        .sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );

    return matching[0] || null;
  };

  /*
   * ============================================================
   * GRADED ASSIGNMENTS
   * ============================================================
   *
   * IMPORTANT:
   * A submission with no grade does NOT count toward the
   * average yet.
   */
  const gradeHistory: GradeHistoryItem[] =
    assignments
      .map((assignment) => {
        const submission =
          getLatestSubmission(
            assignment.id
          );

        if (!submission) {
          return null;
        }

        if (
          submission.grade === null ||
          submission.grade === undefined
        ) {
          return null;
        }

        const grade = Number(
          submission.grade
        );

        if (
          Number.isNaN(grade)
        ) {
          return null;
        }

        return {
          name: assignment.name,
          grade,
          type: 'assignment' as const,
        };
      })
      .filter(
        (
          item
        ): item is GradeHistoryItem =>
          item !== null
      );

  /*
   * ============================================================
   * AVERAGE GRADE
   * ============================================================
   */
  const averageGrade =
    gradeHistory.length > 0
      ? Math.round(
          (gradeHistory.reduce(
            (sum, item) =>
              sum + item.grade,
            0
          ) /
            gradeHistory.length) *
            100
        ) / 100
      : null;

  /*
   * ============================================================
   * DUE STATUS
   * ============================================================
   */
  const getDueStatus = (
    dueDate: string | null
  ) => {
    if (!dueDate) {
      return {
        label: text.noDueDate,
        className:
          'text-muted-foreground',
      };
    }

    const due = new Date(dueDate);
    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const dueDay = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate()
    );

    const difference =
      Math.round(
        (dueDay.getTime() -
          today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

    if (difference < 0) {
      return {
        label: text.overdue,
        className:
          'text-red-500',
      };
    }

    if (difference === 0) {
      return {
        label: text.dueToday,
        className:
          'text-orange-500',
      };
    }

    if (difference === 1) {
      return {
        label: text.dueTomorrow,
        className:
          'text-yellow-500',
      };
    }

    return {
      label: `${text.dueIn} ${difference} ${text.days}`,
      className:
        'text-primary',
    };
  };

  /*
   * ============================================================
   * FORMAT DATE
   * ============================================================
   */
  const formatDueDate = (
    date: string | null
  ) => {
    if (!date) {
      return text.noDueDate;
    }

    return new Date(
      date
    ).toLocaleDateString(
      language === 'id'
        ? 'id-ID'
        : 'en-US',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  /*
   * ============================================================
   * ASSIGNMENTS DUE
   * ============================================================
   *
   * ONLY assignments WITHOUT a submission from the
   * CURRENT student are displayed.
   */
  const sortedAssignments =
    [...assignments]
      .filter((assignment) => {
        const submission =
          getLatestSubmission(
            assignment.id
          );

        /*
         * If the current student has submitted it,
         * remove it from Assignments Due.
         */
        return submission === null;
      })
      .sort((a, b) => {
        if (
          !a.due_date &&
          !b.due_date
        ) {
          return 0;
        }

        if (!a.due_date) {
          return 1;
        }

        if (!b.due_date) {
          return -1;
        }

        return (
          new Date(
            a.due_date
          ).getTime() -
          new Date(
            b.due_date
          ).getTime()
        );
      });

  /*
   * ============================================================
   * CLASS ASSIGNMENT COUNTS
   * ============================================================
   *
   * Also exclude assignments already submitted by the
   * current student.
   */
  const getPendingClassAssignments = (
    studentClass: StudentClass
  ) => {
    return getClassAssignments(
      studentClass
    ).filter(
      (assignment) =>
        !getLatestSubmission(
          assignment.id
        )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-8 space-y-8">

        {/* ====================================================
            HEADER
            ==================================================== */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {text.dashboardTitle}
          </h1>

          <p className="text-muted-foreground">
            {text.dashboardDescription}
          </p>
        </div>

        {/* ====================================================
            TOP CARDS
            ==================================================== */}
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

                      if (
                        codeError
                      ) {
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
            onClick={() =>
              setShowGrades(true)
            }
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
              ) : averageGrade ===
                null ? (
                <div>
                  <p className="text-4xl font-bold text-muted-foreground">
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
                    {
                      gradeHistory.length
                    }{' '}
                    {text.grades}
                  </p>
                </div>
              )}

            </CardContent>
          </Card>

        </div>

        {/* ====================================================
            CLASSES
            ==================================================== */}
        <Card className="bg-card">

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
              ) : myClasses.length ===
                0 ? (
                <p className="text-sm text-muted-foreground">
                  {text.noClasses}
                </p>
              ) : (
                myClasses.map(
                  (item) => {

                    const pendingAssignments =
                      getPendingClassAssignments(
                        item
                      );

                    return (
                      <Link
                        key={
                          item.id
                        }
                        href={`/dashboard/student/classes/${item.code}`}
                      >
                        <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition cursor-pointer">

                          <div className="min-w-0">

                            <h4 className="font-medium text-foreground truncate">
                              {
                                item.class_name
                              }
                            </h4>

                            <p className="text-xs text-muted-foreground">
                              {
                                text.school
                              }{' '}
                              {
                                item.school ||
                                '—'
                              }
                            </p>

                          </div>

                          <div className="flex items-center gap-3 shrink-0">

                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <CalendarDays className="h-4 w-4 text-primary" />

                              <span>
                                {
                                  pendingAssignments.length
                                }{' '}
                                {
                                  text.assignmentCount
                                }
                              </span>
                            </div>

                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                              {
                                text.active
                              }
                            </span>

                          </div>

                        </div>
                      </Link>
                    );
                  }
                )
              )}

            </div>

          </CardContent>
        </Card>

        {/* ====================================================
            ASSIGNMENTS DUE
            ==================================================== */}
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
            ) : sortedAssignments.length ===
              0 ? (
              <p className="text-sm text-muted-foreground">
                {
                  text.noAssignments
                }
              </p>
            ) : (
              <div className="space-y-3">

                {sortedAssignments.map(
                  (assignment) => {

                    const dueStatus =
                      getDueStatus(
                        assignment.due_date
                      );

                    const studentClass =
                      myClasses.find(
                        (item) =>
                          item.course_id ===
                          assignment.course_id
                      );

                    return (
                      <div
                        key={
                          assignment.id
                        }
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-accent/20"
                      >

                        <div className="min-w-0">

                          <h4 className="font-medium text-foreground truncate">
                            {
                              assignment.name
                            }
                          </h4>

                          {studentClass && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {
                                studentClass.class_name
                              }
                            </p>
                          )}

                        </div>

                        <div className="text-right shrink-0">

                          <p
                            className={`text-sm font-semibold ${dueStatus.className}`}
                          >
                            {
                              dueStatus.label
                            }
                          </p>

                          <p className="text-xs text-muted-foreground mt-1">
                            {
                              formatDueDate(
                                assignment.due_date
                              )
                            }
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </CardContent>
        </Card>

      </main>

      {/* ======================================================
          GRADE HISTORY MODAL
          ====================================================== */}
      {showGrades && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setShowGrades(false)
          }
        >

          <div
            className="w-full max-w-lg max-h-[80vh] overflow-hidden bg-card border border-border rounded-xl shadow-xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">

              <div>

                <h2 className="text-xl font-bold text-foreground">
                  {
                    text.gradeHistory
                  }
                </h2>

                {averageGrade !==
                  null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {
                      text.averageGrades
                    }:{' '}

                    <span className="font-semibold text-primary">
                      {
                        averageGrade
                      }
                    </span>
                  </p>
                )}

              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setShowGrades(
                    false
                  )
                }
              >
                <X className="h-5 w-5" />
              </Button>

            </div>

            {/* History */}
            <div className="p-5 overflow-y-auto max-h-[55vh]">

              {gradeHistory.length ===
              0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {
                    text.noGrades
                  }
                </p>
              ) : (
                <div className="space-y-2">

                  {gradeHistory.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20"
                      >

                        <div className="min-w-0">

                          <p className="font-medium text-foreground truncate">
                            {
                              item.name
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {
                              item.type ===
                              'assignment'
                                ? text.assignment
                                : text.test
                            }
                          </p>

                        </div>

                        <p className="text-lg font-bold text-primary ml-4">
                          {
                            item.grade
                          }
                        </p>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex justify-end p-5 border-t border-border">

              <Button
                variant="outline"
                onClick={() =>
                  setShowGrades(
                    false
                  )
                }
              >
                {
                  text.close
                }
              </Button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}
