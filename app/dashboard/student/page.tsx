'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, PlusCircle, Loader2, CalendarDays, BarChart3, X } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

type StudentClass = { id: string; class_name: string; code: string; school: string | null; course_id: string | null; student_id?: string | null };
type TeacherClass = { id: string; code: string; school_name: string | null; class_name: string; teacher_id?: string | null };
type Course = { id: string; course_name: string; class_code: string };
type Assignment = { id: string; course_id: string; name: string; description: string | null; created_at: string; due_date: string | null };
type Submission = { id: string; assignment_id: string; student_id: string; nickname: string | null; class: string | null; link: string; grade: number | null; created_at: string };
type GradeHistoryItem = { name: string; grade: number; type: 'assignment' | 'test' };

type CurrentUser = { id?: string; user_id?: string; uid?: string; fullName?: string; full_name?: string; email?: string; role?: string };

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
  const headers = useMemo(() => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }), [SUPABASE_KEY]);

  const text = language === 'id' ? {
    dashboardTitle: 'Dasbor Siswa', dashboardDescription: 'Pantau tugas sekolah, bergabung ke kelas dengan kode, dan lihat tugas yang akan datang.',
    classCodeInput: 'Masukkan Kode Kelas', enterCode: 'Masukkan kode (contoh: A3F92)', joinClass: 'Gabung Kelas',
    classesYouAreIn: 'Kelas yang Anda Ikuti', noClasses: 'Anda belum bergabung dengan kelas mana pun. Masukkan kode yang valid di atas!',
    school: 'Sekolah:', active: 'Aktif', assignmentsDue: 'Tugas', assignmentCount: 'tugas', assignment: 'Tugas',
    dueToday: 'Jatuh tempo hari ini', dueTomorrow: 'Jatuh tempo besok', dueIn: 'Jatuh tempo dalam', days: 'hari', overdue: 'Terlambat', noDueDate: 'Tidak ada batas waktu',
    averageGrades: 'Nilai Rata-Rata', noGrades: 'Belum ada nilai', gradeHistory: 'Riwayat Nilai', grades: 'nilai', test: 'Ujian', close: 'Tutup', noAssignments: 'Tidak ada tugas.',
    codeInvalid: 'Kode tidak valid', alreadyJoined: 'Anda sudah bergabung dengan kelas ini.', networkError: 'Terjadi kesalahan jaringan saat bergabung ke kelas.', failedToJoin: 'Gagal bergabung:', unknownError: 'Kesalahan tidak diketahui'
  } : {
    dashboardTitle: 'Student Dashboard', dashboardDescription: 'Track your coursework, join classes with a code, and view upcoming assignments.',
    classCodeInput: 'Class Code Input', enterCode: 'Enter code (e.g., A3F92)', joinClass: 'Join Class', classesYouAreIn: 'Classes You Are In',
    noClasses: "You haven't joined any classes yet. Enter a valid code above!", school: 'School:', active: 'Active', assignmentsDue: 'Assignments Due', assignmentCount: 'assignments', assignment: 'Assignment',
    dueToday: 'Due today', dueTomorrow: 'Due tomorrow', dueIn: 'Due in', days: 'days', overdue: 'Overdue', noDueDate: 'No due date', averageGrades: 'Average Grades', noGrades: 'No grades yet', gradeHistory: 'Grade History', grades: 'grades', test: 'Test', close: 'Close', noAssignments: 'No assignments found.',
    codeInvalid: 'Code is invalid', alreadyJoined: 'You have already joined this class.', networkError: 'Network error joining class.', failedToJoin: 'Failed to join:', unknownError: 'Unknown error'
  };

  const getStudentId = useCallback(() => {
    try {
      const raw = localStorage.getItem('current_user');
      if (!raw) return null;
      const user: CurrentUser = JSON.parse(raw);
      const id = user.id ?? user.user_id ?? user.uid;
      return id ? String(id).trim() : null;
    } catch { return null; }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const studentId = getStudentId();
      if (!studentId) {
        console.error('[Student Dashboard] No current_user id.');
        setMyClasses([]); setTeacherClasses([]); setAssignments([]); setSubmissions([]);
        return;
      }

      // IMPORTANT: only load this student's class memberships.
      const classesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/student_classes?student_id=eq.${encodeURIComponent(studentId)}&select=id,class_name,code,school,course_id,student_id`,
        { headers, cache: 'no-store' }
      );
      if (!classesResponse.ok) throw new Error(await classesResponse.text());
      const classesData: StudentClass[] = await classesResponse.json();
      setMyClasses(classesData);

      const codes = [...new Set(classesData.map(x => x.code).filter(Boolean))];
      if (!codes.length) {
        setTeacherClasses([]);
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      const filter = codes.map(x => `"${String(x).replace(/"/g, '\\"')}"`).join(',');
      const teacherResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/teacher_classes?code=in.(${filter})&select=id,code,school_name,class_name,teacher_id`,
        { headers, cache: 'no-store' }
      );
      const teacherData: TeacherClass[] = teacherResponse.ok ? await teacherResponse.json() : [];
      setTeacherClasses(teacherData);

      // course_id in student_classes must reference class_courses.id.
      // Older rows in this project incorrectly stored teacher_classes.id,
      // so resolve the real courses from the class code instead.
      const coursesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/class_courses?class_code=in.(${filter})&select=id,course_name,class_code&order=id.asc`,
        { headers, cache: 'no-store' }
      );
      if (!coursesResponse.ok) throw new Error(await coursesResponse.text());
      const coursesData: Course[] = await coursesResponse.json();

      const courseIds = [...new Set(coursesData.map(x => x.id).filter(Boolean))];
      if (!courseIds.length) {
        setAssignments([]);
        setSubmissions([]);
        return;
      }

      const courseFilter = courseIds.map(x => `"${x}"`).join(',');
      const assignmentsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/course_assignments?course_id=in.(${courseFilter})&select=id,course_id,name,description,created_at,due_date&order=due_date.asc.nullslast`,
        { headers, cache: 'no-store' }
      );
      if (!assignmentsResponse.ok) throw new Error(await assignmentsResponse.text());
      const assignmentsData: Assignment[] = await assignmentsResponse.json();
      setAssignments(assignmentsData);

      if (!assignmentsData.length) {
        setSubmissions([]);
        return;
      }

      const assignmentFilter = assignmentsData.map(x => `"${x.id}"`).join(',');

      // Fetch submission rows and then match the student's UUID locally.
      const submissionsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/assignment_submissions?assignment_id=in.(${assignmentFilter})&select=id,assignment_id,student_id,nickname,class,link,grade,created_at&order=created_at.desc`,
        { headers, cache: 'no-store' }
      );
      if (!submissionsResponse.ok) throw new Error(await submissionsResponse.text());
      const allSubmissions: Submission[] = await submissionsResponse.json();
      const mine = allSubmissions.filter(x => String(x.student_id ?? '').trim() === studentId);
      console.log('[Student Dashboard] Current student:', studentId, 'submissions:', mine);
      setSubmissions(mine);
    } catch (error) {
      console.error('[Student Dashboard] Error loading dashboard:', error);
      setSubmissions([]);
    } finally { setLoading(false); }
  }, [SUPABASE_URL, headers, getStudentId]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    const refresh = () => fetchDashboardData();
    const visibility = () => { if (document.visibilityState === 'visible') fetchDashboardData(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visibility);
    const interval = setInterval(refresh, 10000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visibility);
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault(); setCodeError(null);
    const code = classCode.trim().toUpperCase(); if (!code) return;
    setJoining(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(code)}&select=id,code,class_name,school_name,teacher_id`,
        { headers, cache: 'no-store' }
      );
      if (!response.ok) throw new Error();
      const found = (await response.json())?.[0];
      if (!found) { setCodeError(text.codeInvalid); return; }

      const studentId = getStudentId();
      if (!studentId) { setCodeError(text.networkError); return; }

      // Check this student's membership, not everybody's membership.
      const existingResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/student_classes?student_id=eq.${encodeURIComponent(studentId)}&code=eq.${encodeURIComponent(found.code)}&select=id,course_id`,
        { headers, cache: 'no-store' }
      );
      if (!existingResponse.ok) throw new Error(await existingResponse.text());
      const existingRows: StudentClass[] = await existingResponse.json();
      if (existingRows.length) { setCodeError(text.alreadyJoined); return; }

      // A class can contain multiple courses. Add this student to every
      // course so assignments are linked to the correct class_courses IDs.
      const coursesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(found.code)}&select=id`,
        { headers, cache: 'no-store' }
      );
      if (!coursesResponse.ok) throw new Error(await coursesResponse.text());
      const classCourses: { id: string }[] = await coursesResponse.json();

      const rows = classCourses.length
        ? classCourses.map(course => ({
            class_name: found.class_name,
            code: found.code,
            school: found.school_name,
            course_id: course.id,
            student_id: studentId,
          }))
        : [{
            class_name: found.class_name,
            code: found.code,
            school: found.school_name,
            course_id: null,
            student_id: studentId,
          }];

      const insert = await fetch(`${SUPABASE_URL}/rest/v1/student_classes`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(rows),
      });
      if (!insert.ok) {
        const data = await insert.text();
        console.error('[Student Dashboard] Join error:', data);
        setCodeError(`${text.failedToJoin} ${data || text.unknownError}`); return;
      }

      setClassCode('');
      await fetchDashboardData();
    } catch (error) {
      console.error(error); setCodeError(text.networkError);
    } finally { setJoining(false); }
  };

  const getLatestSubmission = useCallback((assignmentId: string) => {
    const studentId = getStudentId();
    if (!studentId) return null;
    return submissions
      .filter(x => x.assignment_id === assignmentId && String(x.student_id ?? '').trim() === studentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
  }, [submissions, getStudentId]);

  const gradeHistory: GradeHistoryItem[] = assignments.map(a => {
    const s = getLatestSubmission(a.id);
    if (!s || s.grade === null || s.grade === undefined || Number.isNaN(Number(s.grade))) return null;
    return { name: a.name, grade: Number(s.grade), type: 'assignment' as const };
  }).filter((x): x is GradeHistoryItem => x !== null);

  const averageGrade = gradeHistory.length
    ? Math.round((gradeHistory.reduce((sum, x) => sum + x.grade, 0) / gradeHistory.length) * 100) / 100
    : null;

  const sortedAssignments = [...assignments]
    .filter(a => !getLatestSubmission(a.id))
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const dueStatus = (date: string | null) => {
    if (!date) return { label: text.noDueDate, className: 'text-muted-foreground' };
    const d = new Date(date); const n = new Date();
    const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { label: text.overdue, className: 'text-red-500' };
    if (diff === 0) return { label: text.dueToday, className: 'text-orange-500' };
    if (diff === 1) return { label: text.dueTomorrow, className: 'text-yellow-500' };
    return { label: `${text.dueIn} ${diff} ${text.days}`, className: 'text-primary' };
  };

  const formatDate = (date: string | null) => !date ? text.noDueDate : new Date(date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  const classAssignments = (c: StudentClass) => {
    // Use assignments resolved from the class code's real courses.
    const matchingCourseIds = teacherClasses
      .filter(tc => tc.code === c.code)
      .map(tc => tc.id);
    void matchingCourseIds;
    return assignments.filter(a => {
      const joinedCourse = myClasses.some(mc => mc.code === c.code && mc.course_id === a.course_id);
      return joinedCourse && !getLatestSubmission(a.id);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div><h1 className="text-3xl font-bold tracking-tight text-foreground">{text.dashboardTitle}</h1><p className="text-muted-foreground">{text.dashboardDescription}</p></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card"><CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2"><PlusCircle className="h-5 w-5 text-primary" />{text.classCodeInput}</CardTitle></CardHeader><CardContent>
            <form onSubmit={handleJoinClass} className="space-y-3"><div className="flex gap-3"><Input value={classCode} onChange={e => { setClassCode(e.target.value); setCodeError(null); }} placeholder={text.enterCode} className="bg-background uppercase" /><Button type="submit" disabled={joining}>{joining ? <Loader2 className="size-4 animate-spin" /> : text.joinClass}</Button></div>{codeError && <p className="text-xs font-medium text-red-500">{codeError}</p>}</form>
          </CardContent></Card>

          <Card className="bg-card cursor-pointer hover:bg-accent/20 transition" onClick={() => setShowGrades(true)}><CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />{text.averageGrades}</CardTitle></CardHeader><CardContent>
            {loading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : averageGrade === null ? <><p className="text-4xl font-bold text-muted-foreground">—</p><p className="text-sm text-muted-foreground mt-1">{text.noGrades}</p></> : <><p className="text-4xl font-bold text-primary">{averageGrade}</p><p className="text-sm text-muted-foreground mt-1">{gradeHistory.length} {text.grades}</p></>}
          </CardContent></Card>
        </div>

        <Card className="bg-card"><CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />{text.classesYouAreIn}</CardTitle></CardHeader><CardContent>
          {loading ? <div className="flex justify-center py-6"><Loader2 className="size-6 animate-spin" /></div> : myClasses.length === 0 ? <p className="text-sm text-muted-foreground">{text.noClasses}</p> : <div className="space-y-3">{myClasses.map(c => <Link key={c.id} href={`/dashboard/student/classes/${c.code}`}><div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition"><div className="min-w-0"><h4 className="font-medium truncate">{c.class_name}</h4><p className="text-xs text-muted-foreground">{text.school} {c.school || '—'}</p></div><div className="flex items-center gap-3 shrink-0"><div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" /><span>{classAssignments(c).length} {text.assignmentCount}</span></div><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{text.active}</span></div></div></Link>)}</div>}
        </CardContent></Card>

        <Card className="bg-card"><CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />{text.assignmentsDue}</CardTitle></CardHeader><CardContent>
          {loading ? <div className="flex justify-center py-6"><Loader2 className="size-6 animate-spin" /></div> : sortedAssignments.length === 0 ? <p className="text-sm text-muted-foreground">{text.noAssignments}</p> : <div className="space-y-3">{sortedAssignments.map(a => { const status = dueStatus(a.due_date); const c = myClasses.find(x => x.course_id === a.course_id); return <div key={a.id} className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-accent/20"><div className="min-w-0"><h4 className="font-medium truncate">{a.name}</h4>{c && <p className="text-xs text-muted-foreground mt-1">{c.class_name}</p>}</div><div className="text-right shrink-0"><p className={`text-sm font-semibold ${status.className}`}>{status.label}</p><p className="text-xs text-muted-foreground mt-1">{formatDate(a.due_date)}</p></div></div>; })}</div>}
        </CardContent></Card>
      </main>

      {showGrades && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowGrades(false)}><div className="w-full max-w-lg max-h-[80vh] overflow-hidden bg-card border border-border rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border"><div><h2 className="text-xl font-bold">{text.gradeHistory}</h2>{averageGrade !== null && <p className="text-sm text-muted-foreground mt-1">{text.averageGrades}: <span className="font-semibold text-primary">{averageGrade}</span></p>}</div><Button variant="ghost" size="icon" onClick={() => setShowGrades(false)}><X className="h-5 w-5" /></Button></div>
        <div className="p-5 overflow-y-auto max-h-[55vh]">{gradeHistory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{text.noGrades}</p> : <div className="space-y-2">{gradeHistory.map((g, i) => <div key={`${g.name}-${i}`} className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20"><div><p className="font-medium truncate">{g.name}</p><p className="text-xs text-muted-foreground">{g.type === 'assignment' ? text.assignment : text.test}</p></div><p className="text-lg font-bold text-primary ml-4">{g.grade}</p></div>)}</div>}</div>
        <div className="flex justify-end p-5 border-t border-border"><Button variant="outline" onClick={() => setShowGrades(false)}>{text.close}</Button></div>
      </div></div>}
    </div>
  );
}
