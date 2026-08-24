'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Link as LinkIcon,
  Loader2,
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';

type Course = {
  id?: string;
  course_name: string;
  class_code: string;
};

type Material = {
  id?: string;
  course_id: string;
  name: string;
  link: string;
};

type Assignment = {
  id?: string;
  course_id: string;
  name: string;
  description: string;
  due_date?: string | null;
};

type Submission = {
  id?: string;
  assignment_id: string;
  student_id?: string | null;
  nickname: string;
  class: string;
  link: string;
  grade?: number | null;
};

type Test = {
  id: string;
  course_id?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  published: boolean;
};

type Question = {
  id?: string;
  test_id: string;
  question_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
};

type AddType = 'material' | 'assignment';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const jsonHeaders = {
  ...headers,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

export default function ClassDetailsPage() {
  const params = useParams();

  const code = String(
    Array.isArray(params.code)
      ? params.code[0]
      : params.code || ''
  );

  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [assignments, setAssignments] = useState<
    Record<string, Assignment[]>
  >({});
  const [submissions, setSubmissions] = useState<
    Record<string, Submission[]>
  >({});
  const [tests, setTests] = useState<Record<string, Test[]>>({});
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});

  const [teacher, setTeacher] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [school, setSchool] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [openA, setOpenA] = useState<Record<string, boolean>>({});
  const [openT, setOpenT] = useState<Record<string, boolean>>({});

  /* ---------------- COURSE ---------------- */

  const [courseModal, setCourseModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseError, setCourseError] = useState('');

  /* ---------------- MATERIAL / ASSIGNMENT ---------------- */

  const [addModal, setAddModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [addType, setAddType] = useState<AddType>('material');

  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [linkCheckStatus, setLinkCheckStatus] = useState<'idle' | 'checking' | 'safe' | 'unsafe' | 'error'>('idle');
  const [linkCheckReason, setLinkCheckReason] = useState('');

  const [assignmentName, setAssignmentName] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');

  /* ---------------- TEST BUILDER ---------------- */

  const [testBuilder, setTestBuilder] = useState(false);
  const [builderTest, setBuilderTest] = useState<Test | null>(null);

  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testDueDate, setTestDueDate] = useState('');

  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<Question | null>(null);

  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');

  const [questionType, setQuestionType] = useState<'multiple-choice' | 'true-false'>('multiple-choice');

  const [correctAnswer, setCorrectAnswer] =
    useState<'A' | 'B' | 'C' | 'D'>('A');

  /* ---------------- SUBMISSIONS ---------------- */

  const [submissionModal, setSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [submissionClass, setSubmissionClass] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');

  const [gradeInputs, setGradeInputs] =
    useState<Record<string, string>>({});

  /* ---------------- HTTP HELPERS ---------------- */

  async function get<T>(u: string): Promise<T> {
    const r = await fetch(u, {
      headers,
      cache: 'no-store',
    });

    const text = await r.text();

    if (!r.ok) {
      throw new Error(text || `Request failed (${r.status})`);
    }

    return text ? JSON.parse(text) : [];
  }

  async function del(u: string) {
    const r = await fetch(u, {
      method: 'DELETE',
      headers,
    });

    if (!r.ok) {
      throw new Error(
        (await r.text()) || `Delete failed (${r.status})`
      );
    }
  }

  async function patch(u: string, body: unknown) {
    const r = await fetch(u, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      throw new Error(
        (await r.text()) || `Update failed (${r.status})`
      );
    }

    return r;
  }

  async function deleteItem(table: string, id: string) {
    if (!id) return;

    if (!confirm('Delete this item?')) return;

    try {
      await del(
        `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`
      );

      await load();
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : 'Failed to delete item.'
      );
    }
  }

  /* ---------------- HELPERS ---------------- */

  const validUrl = (value: string) => {
    try {
      const u = new URL(value.trim());

      return (
        u.protocol === 'http:' ||
        u.protocol === 'https:'
      );
    } catch {
      return false;
    }
  };

  const parseDate = (value: string) => {
    const match = value.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  };

  const dbDate = (value: string) => {
    const date = parseDate(value);

    if (!date) return null;

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  };

  const displayDate = (value?: string | null) =>
    value ? value.split('-').reverse().join('/') : '';

  const pointsFor = (count: number) =>
    count > 0 ? 100 / count : 0;

  const formatPoints = (count: number) =>
    Number(pointsFor(count).toFixed(2));

  /* ---------------- CURRENT USER ---------------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem('current_user');

      if (!raw) return;

      const u = JSON.parse(raw);

      const resolvedStudentId = String(
        u.student_id ??
          u.id ??
          u.user_id ??
          u.uid ??
          u.user?.student_id ??
          u.user?.id ??
          ''
      );

      const resolvedName = String(
        u.fullName ??
          u.full_name ??
          u.name ??
          u.user?.fullName ??
          u.user?.full_name ??
          ''
      );

      const resolvedRole = String(
        u.role ??
          u.user?.role ??
          ''
      ).toLowerCase();

      setStudentId(resolvedStudentId);
      setName(resolvedName);
      setTeacher(resolvedRole === 'teacher');
    } catch {
      // Ignore malformed localStorage data.
    }
  }, []);

  /* ---------------- LOAD EVERYTHING ---------------- */

  async function load() {
    if (!code) return;

    setLoading(true);
    setError('');

    try {
      const classes = await get<any[]>(
        `${url}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
          code
        )}&select=*`
      );

      if (!classes[0]) {
        throw new Error('Class not found');
      }

      setClassName(classes[0].class_name || '');
      setSchool(classes[0].school_name || '');

      const cs = await get<Course[]>(
        `${url}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(
          code
        )}&select=*&order=id.asc`
      );

      const mm: Record<string, Material[]> = {};
      const aa: Record<string, Assignment[]> = {};
      const tt: Record<string, Test[]> = {};
      const qq: Record<string, Question[]> = {};
      const ss: Record<string, Submission[]> = {};

      for (const course of cs) {
        if (!course.id) continue;

        mm[course.id] = await get<Material[]>(
          `${url}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(
            course.id
          )}&select=*`
        ).catch(() => []);

        aa[course.id] = await get<Assignment[]>(
          `${url}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(
            course.id
          )}&select=*&order=created_at.asc`
        ).catch(() => []);

        const testFilter = teacher
          ? ''
          : '&published=eq.true';

        tt[course.id] = await get<Test[]>(
          `${url}/rest/v1/tests?course_id=eq.${encodeURIComponent(
            course.id
          )}${testFilter}&select=*&order=created_at.asc`
        ).catch(() => []);

        for (const test of tt[course.id]) {
          qq[test.id] = await get<Question[]>(
            `${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(
              test.id
            )}&select=*&order=question_order.asc`
          ).catch(() => []);
        }

        for (const assignment of aa[course.id]) {
          if (!assignment.id) continue;

          const filter = teacher
            ? `assignment_id=eq.${encodeURIComponent(
                assignment.id
              )}`
            : `assignment_id=eq.${encodeURIComponent(
                assignment.id
              )}&student_id=eq.${encodeURIComponent(
                studentId
              )}`;

          ss[assignment.id] = await get<Submission[]>(
            `${url}/rest/v1/assignment_submissions?${filter}&select=*`
          ).catch(() => []);
        }
      }

      setCourses(cs);
      setMaterials(mm);
      setAssignments(aa);
      setTests(tt);
      setQuestions(qq);
      setSubmissions(ss);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to load class'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (code) {
      load();
    }
  }, [code, teacher, studentId]);

  /* =========================================================
     CREATE COURSE
     ========================================================= */

  async function createCourse(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setCourseError('');

    const trimmedName = courseName.trim();

    if (!trimmedName) {
      setCourseError('Please enter a course name.');
      return;
    }

    if (!code) {
      setCourseError('Class code is missing.');
      return;
    }

    if (busy) return;

    setBusy(true);

    try {
      const response = await fetch(
        `${url}/rest/v1/class_courses`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            course_name: trimmedName,
            class_code: code,
          }),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        let readableError = responseText;

        try {
          const parsed = JSON.parse(responseText);

          readableError =
            parsed?.message ||
            parsed?.hint ||
            parsed?.details ||
            responseText;
        } catch {
          // Keep raw response.
        }

        throw new Error(
          readableError ||
            `Failed to create course (${response.status})`
        );
      }

      setCourseName('');
      setCourseError('');
      setCourseModal(false);

      await load();
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : 'Failed to create course.';

      console.error('CREATE COURSE ERROR:', e);

      setCourseError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     ADD MATERIAL / ASSIGNMENT
     ========================================================= */

  async function checkMaterialLink(link: string) {
    setLinkCheckStatus('checking');
    setLinkCheckReason('Checking this link with Gemini...');

    try {
      const response = await fetch('/api/moderate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link.trim() }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLinkCheckStatus('error');
        setLinkCheckReason(result?.reason || 'The link could not be checked.');
        return false;
      }

      if (result?.safe === true) {
        setLinkCheckStatus('safe');
        setLinkCheckReason(result.reason || 'Link passed the Gemini safety check.');
        return true;
      }

      setLinkCheckStatus('unsafe');
      setLinkCheckReason(result?.reason || 'This link is not allowed as classroom material.');
      return false;
    } catch {
      setLinkCheckStatus('error');
      setLinkCheckReason('The link could not be checked. Please try again.');
      return false;
    }
  }

  async function addItem(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!selectedCourse?.id) return;

    setBusy(true);
    setMessage('');

    try {
      if (addType === 'material') {
        if (
          !materialName.trim() ||
          !validUrl(materialLink)
        ) {
          throw new Error(
            'Enter a valid material name and link.'
          );
        }

        const linkIsSafe = await checkMaterialLink(materialLink);

        if (!linkIsSafe) {
          setBusy(false);
          return;
        }

        const response = await fetch(
          `${url}/rest/v1/course_materials`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              course_id: selectedCourse.id,
              name: materialName.trim(),
              link: materialLink.trim(),
            }),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }
      } else {
        const due = dbDate(assignmentDueDate);

        if (
          !assignmentName.trim() ||
          !assignmentDescription.trim() ||
          !due
        ) {
          throw new Error(
            'Enter a valid due date as DD/MM/YYYY.'
          );
        }

        const response = await fetch(
          `${url}/rest/v1/course_assignments`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              course_id: selectedCourse.id,
              name: assignmentName.trim(),
              description:
                assignmentDescription.trim(),
              due_date: due,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }
      }

      setAddModal(false);
      setMaterialName('');
      setMaterialLink('');
      setLinkCheckStatus('idle');
      setLinkCheckReason('');
      setAssignmentName('');
      setAssignmentDescription('');
      setAssignmentDueDate('');

      await load();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Failed to add item.'
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     TESTS
     ========================================================= */

  async function createTest(course: Course) {
    if (!course.id) return;

    if (busy) return;

    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(
        `${url}/rest/v1/tests`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            course_id: course.id,
            title: 'Untitled Test',
            description: null,
            due_date: null,
            published: false,
          }),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText);
      }

      let created: any;

      try {
        created = JSON.parse(responseText);
      } catch {
        throw new Error(
          'Test was created, but Supabase did not return the test.'
        );
      }

      const test = Array.isArray(created)
        ? created[0]
        : created;

      if (!test?.id) {
        throw new Error(
          'Test was created but its ID was not returned.'
        );
      }

      setBuilderTest(test as Test);
      setTestTitle(test.title || 'Untitled Test');
      setTestDescription(test.description || '');
      setTestDueDate('');
      setMessage('');
      setTestBuilder(true);

      await load();
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : 'Failed to create test.'
      );
    } finally {
      setBusy(false);
    }
  }

  function openBuilder(test: Test) {
    setBuilderTest(test);
    setTestTitle(test.title || '');
    setTestDescription(test.description || '');
    setTestDueDate(displayDate(test.due_date));
    setMessage('');
    setTestBuilder(true);
  }

  async function saveTestDetails() {
    if (!builderTest) return;

    if (!testTitle.trim()) {
      setMessage('Test title is required.');
      return;
    }

    const due = dbDate(testDueDate);

    if (!due) {
      setMessage(
        'Enter a valid due date as DD/MM/YYYY.'
      );
      return;
    }

    setBusy(true);

    try {
      await patch(
        `${url}/rest/v1/tests?id=eq.${encodeURIComponent(
          builderTest.id
        )}`,
        {
          title: testTitle.trim(),
          description:
            testDescription.trim() || null,
          due_date: due,
        }
      );

      setBuilderTest({
        ...builderTest,
        title: testTitle.trim(),
        description:
          testDescription.trim() || null,
        due_date: due,
      });

      setMessage('Test details saved.');

      await load();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Failed to save test details.'
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     QUESTIONS
     ========================================================= */

  function openNewQuestion() {
    if (!builderTest) return;

    setEditingQuestion(null);
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setQuestionType('multiple-choice');
    setCorrectAnswer('A');
    setMessage('');
    setQuestionModal(true);
  }

  function openEditQuestion(question: Question) {
    setEditingQuestion(question);
    setQuestionText(question.question);
    setOptionA(question.option_a);
    setOptionB(question.option_b);
    setOptionC(question.option_c);
    setOptionD(question.option_d);
    setQuestionType('multiple-choice');
    setCorrectAnswer(question.correct_answer);
    setMessage('');
    setQuestionModal(true);
  }

  async function rebalanceQuestions(testId: string) {
    const qs = await get<Question[]>(
      `${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(
        testId
      )}&select=*&order=question_order.asc`
    ).catch(() => []);

    const points = pointsFor(qs.length);

    for (let i = 0; i < qs.length; i++) {
      if (!qs[i].id) continue;

      await patch(
        `${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(
          qs[i].id
        )}`,
        {
          question_order: i + 1,
          points,
        }
      );
    }
  }

  async function saveQuestion(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!builderTest) return;

    if (
      !questionText.trim() ||
      !optionA.trim() ||
      !optionB.trim() ||
      !optionC.trim() ||
      !optionD.trim()
    ) {
      setMessage(
        'Question text and all four answers are required.'
      );
      return;
    }

    setBusy(true);

    try {
      const body = {
        test_id: builderTest.id,
        question: questionText.trim(),
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        option_c: optionC.trim(),
        option_d: optionD.trim(),
        correct_answer: correctAnswer,
        question_order:
          editingQuestion?.question_order ??
          ((questions[builderTest.id]?.length || 0) + 1),
        points: 0,
      };

      if (editingQuestion?.id) {
        await patch(
          `${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(
            editingQuestion.id
          )}`,
          body
        );
      } else {
        const response = await fetch(
          `${url}/rest/v1/test_questions`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }
      }

      await rebalanceQuestions(builderTest.id);

      setQuestionModal(false);
      setMessage('');

      await load();
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : 'Failed to save question.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(question: Question) {
    if (!question.id) return;

    if (!confirm('Delete this question?')) return;

    try {
      await del(
        `${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(
          question.id
        )}`
      );

      await rebalanceQuestions(question.test_id);
      await load();
    } catch {
      alert('Failed to delete question.');
    }
  }

  async function deleteTest(test: Test) {
    if (!confirm(`Delete "${test.title}"?`)) return;

    try {
      await del(
        `${url}/rest/v1/tests?id=eq.${encodeURIComponent(
          test.id
        )}`
      );

      await load();
    } catch {
      alert('Failed to delete test.');
    }
  }

  async function toggleTest(test: Test) {
    if (!test.published) {
      const qs = questions[test.id] || [];

      if (
        !test.title.trim() ||
        !test.due_date ||
        qs.length === 0
      ) {
        alert(
          'Finish the test in Test Maker first: add a title, due date, and at least one question.'
        );
        return;
      }
    }

    try {
      await patch(
        `${url}/rest/v1/tests?id=eq.${encodeURIComponent(
          test.id
        )}`,
        {
          published: !test.published,
        }
      );

      await load();
    } catch {
      alert('Failed to change publication status.');
    }
  }

  /* =========================================================
     ASSIGNMENT SUBMISSIONS
     ========================================================= */

  const studentSubmission = (id: string) =>
    submissions[id]?.find(
      submission =>
        String(submission.student_id) ===
        String(studentId)
    );

  function openSubmit(assignment: Assignment) {
    if (studentSubmission(assignment.id!)) return;

    setSelectedAssignment(assignment);
    setSubmissionClass('');
    setSubmissionLink('');
    setSubmissionModal(true);
  }

  async function submitAssignment(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !selectedAssignment?.id ||
      !studentId ||
      !submissionClass ||
      !validUrl(submissionLink)
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `${url}/rest/v1/assignment_submissions`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            assignment_id: selectedAssignment.id,
            student_id: studentId,
            nickname: name,
            class: submissionClass.toUpperCase(),
            link: submissionLink.trim(),
            grade: null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSubmissionModal(false);

      await load();
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : 'Submission failed.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function undo(assignment: Assignment) {
    const submission = studentSubmission(assignment.id!);

    if (!submission?.id) return;

    if (!confirm('Undo your submission?')) return;

    try {
      await del(
        `${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(
          submission.id
        )}&student_id=eq.${encodeURIComponent(
          studentId
        )}`
      );

      await load();
    } catch {
      alert('Failed to undo submission.');
    }
  }

  async function saveGrade(submission: Submission) {
    if (!submission.id) return;

    const raw = Number(
      gradeInputs[submission.id] ??
        submission.grade ??
        0
    );

    if (
      !Number.isFinite(raw) ||
      raw < 0 ||
      raw > 100
    ) {
      alert('Grade must be between 0 and 100.');
      return;
    }

    try {
      await patch(
        `${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(
          submission.id
        )}`,
        {
          grade: Math.trunc(raw),
        }
      );

      await load();
    } catch {
      alert('Failed to save grade.');
    }
  }

  /* =========================================================
     LOADING / ERROR
     ========================================================= */

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="flex min-h-[80vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />

        <main className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-3 size-10" />

              <h1 className="text-xl font-semibold">
                {error}
              </h1>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <>
      <Navbar />

      <main className="container mx-auto space-y-8 px-6 py-8">
        {/* BACK BUTTON */}

        <Link
          href={
            teacher
              ? '/dashboard/teacher'
              : '/dashboard/student'
          }
        >
          <Button
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* CLASS HEADER */}

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {className}
            </h1>

            <p className="text-sm text-muted-foreground">
              School: {school} · Code:{' '}
              <b className="font-mono text-primary">
                {code}
              </b>
            </p>
          </div>

          {teacher && (
            <Button
              type="button"
              onClick={() => {
                setCourseName('');
                setCourseError('');
                setCourseModal(true);
              }}
            >
              <PlusCircle className="mr-2 size-4" />
              Create New Course
            </Button>
          )}
        </div>

        {/* COURSES */}

        <div className="space-y-3">
          {courses.length === 0 && teacher && (
            <Card>
              <CardContent className="py-10 text-center">
                <BookOpen className="mx-auto mb-3 size-10 text-muted-foreground" />
                <p className="text-muted-foreground">No courses yet.</p>
              </CardContent>
            </Card>
          )}

          {courses.map(course => {
            if (!course.id) return null;

            const id = course.id;
            const courseMaterials =
              materials[id] || [];
            const courseAssignments =
              assignments[id] || [];
            const courseTests = tests[id] || [];

            return (
              <Card
                key={id}
                className="overflow-hidden"
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <button
                    type="button"
                    className="flex items-center gap-2 font-semibold"
                    onClick={() =>
                      setOpen(previous => ({
                        ...previous,
                        [id]: !previous[id],
                      }))
                    }
                  >
                    {open[id] ? (
                      <ChevronUp />
                    ) : (
                      <ChevronDown />
                    )}

                    <BookOpen className="size-4 text-primary" />

                    {course.course_name}
                  </button>

                  {teacher && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedCourse(course);
                          setAddType('material');
                          setMessage('');
                          setAddModal(true);
                        }}
                      >
                        <PlusCircle className="mr-1 size-4" />
                        Add
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          deleteItem(
                            'class_courses',
                            id
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  )}
                </CardHeader>

                {open[id] && (
                  <CardContent className="space-y-8 border-t pt-5">
                    {/* MATERIALS */}

                    <section>
                      <h3 className="mb-3 font-semibold">
                        📚 Materials
                      </h3>

                      {courseMaterials.length ? (
                        courseMaterials.map(
                          material => (
                            <div
                              key={material.id}
                              className="mb-2 flex items-center gap-3 rounded-lg border p-3"
                            >
                              <a
                                href={material.link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-w-0 flex-1 items-center gap-2"
                              >
                                <LinkIcon className="size-4 text-primary" />

                                <span className="truncate">
                                  {material.name}
                                </span>

                                <ExternalLink className="ml-auto size-4" />
                              </a>

                              {teacher && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    deleteItem(
                                      'course_materials',
                                      material.id!
                                    )
                                  }
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          )
                        )
                      ) : (
                        <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                          No materials yet.
                        </p>
                      )}
                    </section>

                    {/* ASSIGNMENTS */}

                    <section>
                      <h3 className="mb-1 font-semibold">
                        📝 Assignments
                      </h3>

                      <p className="mb-3 text-xs text-muted-foreground">
                        {teacher
                          ? 'Click an assignment to view submissions and grades.'
                          : 'Click an assignment to submit or undo your submission.'}
                      </p>

                      {courseAssignments.length ? (
                        courseAssignments.map(
                          assignment => {
                            const submission =
                              studentSubmission(
                                assignment.id!
                              );

                            const list =
                              submissions[
                                assignment.id!
                              ] || [];

                            return (
                              <div
                                key={assignment.id}
                                className="mb-2 overflow-hidden rounded-lg border"
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-start gap-3 p-4 text-left"
                                  onClick={() =>
                                    teacher
                                      ? setOpenA(
                                          previous => ({
                                            ...previous,
                                            [assignment.id!]:
                                              !previous[
                                                assignment.id!
                                              ],
                                          })
                                        )
                                      : submission
                                      ? undo(
                                          assignment
                                        )
                                      : openSubmit(
                                          assignment
                                        )
                                  }
                                >
                                  <ClipboardList className="size-5 text-primary" />

                                  <div className="flex-1">
                                    <b>
                                      {assignment.name}
                                    </b>

                                    <p className="text-sm text-muted-foreground">
                                      {
                                        assignment.description
                                      }
                                    </p>

                                    {assignment.due_date && (
                                      <p className="mt-1 text-xs">
                                        Due:{' '}
                                        {displayDate(
                                          assignment.due_date
                                        )}
                                      </p>
                                    )}

                                    {!teacher &&
                                      submission && (
                                        <p className="mt-2 text-xs text-primary">
                                          <RotateCcw className="mr-1 inline size-3" />
                                          Submitted — click to undo
                                        </p>
                                      )}

                                    {!teacher &&
                                      !submission && (
                                        <p className="mt-2 text-xs text-primary">
                                          Click to submit →
                                        </p>
                                      )}
                                  </div>

                                  {teacher &&
                                    (openA[
                                      assignment.id!
                                    ] ? (
                                      <ChevronUp />
                                    ) : (
                                      <ChevronDown />
                                    ))}
                                </button>

                                {teacher &&
                                  openA[
                                    assignment.id!
                                  ] && (
                                    <div className="border-t p-4">
                                      {list.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          No submissions yet.
                                        </p>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm">
                                            <tbody>
                                              {list.map(
                                                submission => (
                                                  <tr
                                                    key={
                                                      submission.id
                                                    }
                                                    className="border-b"
                                                  >
                                                    <td className="p-2">
                                                      {
                                                        submission.nickname
                                                      }
                                                    </td>

                                                    <td className="p-2">
                                                      {
                                                        submission.class
                                                      }
                                                    </td>

                                                    <td className="p-2">
                                                      <a
                                                        className="text-primary"
                                                        href={
                                                          submission.link
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                      >
                                                        Open
                                                      </a>
                                                    </td>

                                                    <td className="p-2">
                                                      <div className="flex justify-end gap-2">
                                                        <Input
                                                          className="w-20"
                                                          type="number"
                                                          min="0"
                                                          max="100"
                                                          value={
                                                            gradeInputs[
                                                              submission
                                                                .id!
                                                            ] ??
                                                            String(
                                                              submission.grade ??
                                                                ''
                                                            )
                                                          }
                                                          onChange={e =>
                                                            setGradeInputs(
                                                              previous => ({
                                                                ...previous,
                                                                [submission
                                                                  .id!]:
                                                                  e
                                                                    .target
                                                                    .value,
                                                              })
                                                            )
                                                          }
                                                        />

                                                        <Button
                                                          type="button"
                                                          size="sm"
                                                          onClick={() =>
                                                            saveGrade(
                                                              submission
                                                            )
                                                          }
                                                        >
                                                          <Save className="size-3" />
                                                        </Button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                {teacher && (
                                  <div className="flex justify-end border-t p-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteItem(
                                          'course_assignments',
                                          assignment.id!
                                        )
                                      }
                                    >
                                      <Trash2 className="mr-1 size-3" />
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )
                      ) : (
                        <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                          No assignments yet.
                        </p>
                      )}
                    </section>

                    {/* TESTS */}

                    <section>
                      <div className="mb-3 flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold">
                            🧪 Tests
                          </h3>

                          <p className="text-xs text-muted-foreground">
                            {teacher
                              ? 'Drafts and published tests for this course.'
                              : 'Published tests for this course.'}
                          </p>
                        </div>

                        {teacher && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              createTest(course)
                            }
                            disabled={busy}
                          >
                            <PlusCircle className="mr-1 size-4" />
                            Test Maker
                          </Button>
                        )}
                      </div>

                      {courseTests.length ? (
                        courseTests.map(test => {
                          const qs =
                            questions[test.id] || [];

                          const points =
                            formatPoints(qs.length);

                          return (
                            <div
                              key={test.id}
                              className="mb-2 overflow-hidden rounded-lg border"
                            >
                              <div className="flex items-start gap-3 p-4">
                                <div className="flex-1">
                                  <b>{test.title}</b>

                                  {test.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {test.description}
                                    </p>
                                  )}

                                  {test.due_date && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Due:{' '}
                                      {displayDate(
                                        test.due_date
                                      )}
                                    </p>
                                  )}

                                  <p className="text-xs text-muted-foreground">
                                    {qs.length}{' '}
                                    question
                                    {qs.length === 1
                                      ? ''
                                      : 's'}{' '}
                                    ·{' '}
                                    {test.published
                                      ? 'Published'
                                      : 'Draft'}
                                    {qs.length
                                      ? ` · ${points} points/question`
                                      : ''}
                                  </p>

                                  {!teacher &&
                                    test.published && (
                                      <Link
                                        href={`/dashboard/student/tests/${test.id}`}
                                      >
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="mt-3"
                                        >
                                          Take Test
                                        </Button>
                                      </Link>
                                    )}
                                </div>

                                {teacher && (
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        toggleTest(test)
                                      }
                                      title={
                                        test.published
                                          ? 'Unpublish'
                                          : 'Publish'
                                      }
                                    >
                                      {test.published ? (
                                        <EyeOff className="size-4" />
                                      ) : (
                                        <Eye className="size-4" />
                                      )}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        openBuilder(test)
                                      }
                                    >
                                      <Pencil className="mr-1 size-4" />
                                      Edit
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteTest(test)
                                      }
                                    >
                                      <Trash2 size={14} />
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setOpenT(
                                          previous => ({
                                            ...previous,
                                            [test.id]:
                                              !previous[
                                                test.id
                                              ],
                                          })
                                        )
                                      }
                                    >
                                      {openT[test.id] ? (
                                        <ChevronUp />
                                      ) : (
                                        <ChevronDown />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {teacher &&
                                openT[test.id] && (
                                  <div className="space-y-2 border-t p-4">
                                    {qs.length === 0 && (
                                      <p className="text-sm text-muted-foreground">
                                        No questions yet. Open Test Maker to add them.
                                      </p>
                                    )}

                                    {qs.map(
                                      (
                                        question,
                                        index
                                      ) => (
                                        <div
                                          key={
                                            question.id
                                          }
                                          className="rounded border p-3"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="font-medium">
                                                {index +
                                                  1}
                                                .{' '}
                                                {
                                                  question.question
                                                }
                                              </p>

                                              <p className="mt-1 text-xs text-muted-foreground">
                                                A:{' '}
                                                {
                                                  question.option_a
                                                }{' '}
                                                · B:{' '}
                                                {
                                                  question.option_b
                                                }{' '}
                                                · C:{' '}
                                                {
                                                  question.option_c
                                                }{' '}
                                                · D:{' '}
                                                {
                                                  question.option_d
                                                }
                                              </p>

                                              <p className="mt-1 text-xs">
                                                Correct:{' '}
                                                <b>
                                                  {
                                                    question.correct_answer
                                                  }
                                                </b>{' '}
                                                ·{' '}
                                                {formatPoints(
                                                  qs.length
                                                )}{' '}
                                                pts
                                              </p>
                                            </div>

                                            <div className="flex shrink-0 gap-1">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  openEditQuestion(
                                                    question
                                                  )
                                                }
                                              >
                                                <Pencil className="size-3" />
                                              </Button>

                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  deleteQuestion(
                                                    question
                                                  )
                                                }
                                              >
                                                <Trash2 className="size-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        openBuilder(test)
                                      }
                                    >
                                      <Pencil className="mr-1 size-4" />
                                      Open Test Maker
                                    </Button>
                                  </div>
                                )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                          {teacher
                            ? 'No tests yet. Click Test Maker to create one.'
                            : 'No published tests yet.'}
                        </p>
                      )}
                    </section>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      {/* =====================================================
          CREATE COURSE MODAL
          ===================================================== */}

      {courseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                Create New Course
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={createCourse}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="course-name"
                    className="text-sm font-medium"
                  >
                    Course name
                  </label>

                  <Input
                    id="course-name"
                    value={courseName}
                    onChange={e =>
                      setCourseName(e.target.value)
                    }
                    placeholder="e.g. Mathematics"
                    autoFocus
                    disabled={busy}
                  />
                </div>

                {courseError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-medium">
                      Could not create course
                    </p>

                    <p className="mt-1 break-words">
                      {courseError}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/2"
                    disabled={busy}
                    onClick={() => {
                      setCourseModal(false);
                      setCourseError('');
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    className="w-1/2"
                    disabled={
                      busy ||
                      !courseName.trim()
                    }
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================
          ADD MATERIAL / ASSIGNMENT MODAL
          ===================================================== */}

      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                Add to {selectedCourse?.course_name}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={addItem}
                className="space-y-3"
              >
                <select
                  className="h-10 w-full rounded border bg-background px-2"
                  value={addType}
                  onChange={e =>
                    setAddType(
                      e.target.value as AddType
                    )
                  }
                >
                  <option value="material">
                    Material
                  </option>
                  <option value="assignment">
                    Assignment
                  </option>
                </select>

                {addType === 'material' && (
                  <>
                    <Input
                      placeholder="Material name"
                      value={materialName}
                      onChange={e =>
                        setMaterialName(
                          e.target.value
                        )
                      }
                      required
                    />

                    <Input
                      type="url"
                      placeholder="https://..."
                      value={materialLink}
                      onChange={e => {
                        setMaterialLink(e.target.value);
                        setLinkCheckStatus('idle');
                        setLinkCheckReason('');
                      }}
                      required
                    />

                    {materialLink.trim() && validUrl(materialLink) && (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={linkCheckStatus === 'checking'}
                          onClick={() => checkMaterialLink(materialLink)}
                        >
                          {linkCheckStatus === 'checking' ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Checking with Gemini...
                            </>
                          ) : (
                            <>
                              <LinkIcon className="mr-2 size-4" />
                              Check Link Safety
                            </>
                          )}
                        </Button>

                        {linkCheckReason && (
                          <div
                            className={`rounded-md border p-2 text-sm ${
                              linkCheckStatus === 'safe'
                                ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                                : linkCheckStatus === 'unsafe' || linkCheckStatus === 'error'
                                  ? 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400'
                                  : 'border-muted bg-muted/50'
                            }`}
                          >
                            {linkCheckReason}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {addType === 'assignment' && (
                  <>
                    <Input
                      placeholder="Assignment name"
                      value={assignmentName}
                      onChange={e =>
                        setAssignmentName(
                          e.target.value
                        )
                      }
                      required
                    />

                    <textarea
                      className="w-full rounded border bg-background p-2"
                      rows={4}
                      placeholder="Description"
                      value={
                        assignmentDescription
                      }
                      onChange={e =>
                        setAssignmentDescription(
                          e.target.value
                        )
                      }
                      required
                    />

                    <Input
                      placeholder="DD/MM/YYYY"
                      value={assignmentDueDate}
                      onChange={e =>
                        setAssignmentDueDate(
                          e.target.value
                        )
                      }
                      required
                    />
                  </>
                )}

                {message && (
                  <p className="text-sm text-destructive">
                    {message}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/2"
                    onClick={() =>
                      setAddModal(false)
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    className="w-1/2"
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================
          TEST BUILDER
          ===================================================== */}

      {testBuilder && builderTest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-6 w-full max-w-4xl">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    Test Maker
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Build the entire test here. Publishing is done from the Tests section.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTestBuilder(false);
                    setMessage('');
                  }}
                >
                  <X />
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Test title
                    </label>

                    <Input
                      value={testTitle}
                      onChange={e =>
                        setTestTitle(
                          e.target.value
                        )
                      }
                      placeholder="Test title"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Due date
                    </label>

                    <Input
                      value={testDueDate}
                      onChange={e =>
                        setTestDueDate(
                          e.target.value
                        )
                      }
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    className="w-full rounded border bg-background p-2"
                    rows={3}
                    value={testDescription}
                    onChange={e =>
                      setTestDescription(
                        e.target.value
                      )
                    }
                    placeholder="Describe the test"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                  <div>
                    <b>
                      {questions[
                        builderTest.id
                      ]?.length || 0}{' '}
                      questions
                    </b>

                    <p className="text-xs text-muted-foreground">
                      100 points total ·{' '}
                      {questions[
                        builderTest.id
                      ]?.length
                        ? `${formatPoints(
                            questions[
                              builderTest.id
                            ].length
                          )} points per question`
                        : 'add questions to calculate points'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={
                      saveTestDetails
                    }
                    disabled={busy}
                  >
                    <Save className="mr-2 size-4" />
                    Save Test Details
                  </Button>
                </div>

                {message && (
                  <p className="text-sm text-destructive">
                    {message}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Questions
                    </h3>

                    <Button
                      type="button"
                      onClick={
                        openNewQuestion
                      }
                      disabled={busy}
                    >
                      <PlusCircle className="mr-2 size-4" />
                      Add Question
                    </Button>
                  </div>

                  {(questions[
                    builderTest.id
                  ] || []).length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      No questions yet. Add your first question.
                    </div>
                  )}

                  {(questions[
                    builderTest.id
                  ] || []).map(
                    (
                      question,
                      index,
                      array
                    ) => (
                      <div
                        key={question.id}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {index + 1}.{' '}
                              {
                                question.question
                              }
                            </p>

                            <div className="mt-2 grid gap-1 text-sm md:grid-cols-2">
                              <span>
                                A.{' '}
                                {
                                  question.option_a
                                }
                              </span>

                              <span>
                                B.{' '}
                                {
                                  question.option_b
                                }
                              </span>

                              <span>
                                C.{' '}
                                {
                                  question.option_c
                                }
                              </span>

                              <span>
                                D.{' '}
                                {
                                  question.option_d
                                }
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-muted-foreground">
                              Correct answer:{' '}
                              <b>
                                {
                                  question.correct_answer
                                }
                              </b>{' '}
                              ·{' '}
                              {formatPoints(
                                array.length
                              )}{' '}
                              points
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openEditQuestion(
                                  question
                                )
                              }
                            >
                              <Pencil className="mr-1 size-3" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteQuestion(
                                  question
                                )
                              }
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTestBuilder(false);
                      setMessage('');
                    }}
                  >
                    Done — Return to Tests
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =====================================================
          QUESTION MODAL
          ===================================================== */}

      {questionModal && builderTest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {editingQuestion
                  ? 'Edit Question'
                  : 'Add Question'}
              </CardTitle>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setQuestionModal(false)
                }
              >
                <X />
              </Button>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={saveQuestion}
                className="space-y-3"
              >
                <div>
                  <label className="text-sm font-medium">
                    Question type
                  </label>
                  <select
                    className="mt-1 h-10 w-full appearance-auto rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
                    value={questionType}
                    onChange={e =>
                      setQuestionType(
                        e.target.value as
                          | 'multiple-choice'
                          | 'true-false'
                      )
                    }
                  >
                    <option value="multiple-choice">
                      Multiple Choice
                    </option>
                    <option value="true-false">
                      True / False
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Question text
                  </label>

                  <textarea
                    className="mt-1 w-full rounded border bg-background p-2"
                    rows={3}
                    value={questionText}
                    onChange={e =>
                      setQuestionText(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">
                      {questionType === 'true_false' ? 'True' : questionType === 'fill_blank' || questionType === 'matching' ? 'Item 1' : 'A'}
                    </label>

                    <Input
                      value={optionA}
                      onChange={e =>
                        setOptionA(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      {questionType === 'true_false' ? 'False' : questionType === 'fill_blank' || questionType === 'matching' ? 'Item 2' : 'B'}
                    </label>

                    <Input
                      value={optionB}
                      onChange={e =>
                        setOptionB(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      C
                    </label>

                    <Input
                      value={optionC}
                      onChange={e =>
                        setOptionC(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      D
                    </label>

                    <Input
                      value={optionD}
                      onChange={e =>
                        setOptionD(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Correct answer
                  </label>

                  <select
                    className="mt-1 h-10 w-full rounded border bg-background px-2"
                    value={correctAnswer}
                    onChange={e =>
                      setCorrectAnswer(
                        e.target.value as
                          | 'A'
                          | 'B'
                          | 'C'
                          | 'D'
                      )
                    }
                  >
                    <option value="A">
                      A
                    </option>
                    <option value="B">
                      B
                    </option>
                    <option value="C">
                      C
                    </option>
                    <option value="D">
                      D
                    </option>
                  </select>
                </div>

                <div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">
                  No points are entered manually. This test is always worth 100 points total, and the system automatically recalculates every question to 100 ÷ total questions.
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/2"
                    onClick={() =>
                      setQuestionModal(false)
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    className="w-1/2"
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : editingQuestion ? (
                      'Save Changes'
                    ) : (
                      'Add Question'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================
          SUBMISSION MODAL
          ===================================================== */}

      {submissionModal &&
        selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>
                  Submit Assignment
                </CardTitle>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={submitAssignment}
                  className="space-y-3"
                >
                  <Input
                    value={name}
                    disabled
                  />

                  <Input
                    placeholder="Class e.g. 8A"
                    value={submissionClass}
                    onChange={e =>
                      setSubmissionClass(
                        e.target.value
                      )
                    }
                    required
                  />

                  <Input
                    type="url"
                    placeholder="Submission link"
                    value={submissionLink}
                    onChange={e =>
                      setSubmissionLink(
                        e.target.value
                      )
                    }
                    required
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-1/2"
                      onClick={() =>
                        setSubmissionModal(false)
                      }
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      className="w-1/2"
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
    </>
  );
}
