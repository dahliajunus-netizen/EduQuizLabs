'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  FileText,
  Link as LinkIcon,
  Loader2,
  PlusCircle,
  Trash2,
  X,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Save,
  RotateCcw,
} from 'lucide-react';

type ClassData = {
  id?: string;
  class_name: string;
  school_name: string;
  code: string;
  teacher_id?: string;
};

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
  created_at?: string;
};

type Submission = {
  id?: string;
  assignment_id: string;
  student_id?: string | null;
  nickname: string;
  class: string;
  link: string;
  grade?: number | null;
  created_at?: string;
};

type LinkCheckResult = {
  safe: boolean;
  reason?: string;
};

type AddType = 'material' | 'assignment';

export default function ClassDetailsPage() {
  const params = useParams();

  const code = Array.isArray(params.code)
    ? params.code[0]
    : String(params.code || '');

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [classData, setClassData] =
    useState<ClassData | null>(null);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [materials, setMaterials] =
    useState<Record<string, Material[]>>({});

  const [assignments, setAssignments] =
    useState<Record<string, Assignment[]>>({});

  const [submissions, setSubmissions] =
    useState<Record<string, Submission[]>>({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [isTeacher, setIsTeacher] =
    useState(false);

  const [studentId, setStudentId] =
    useState('');

  const [studentFullName, setStudentFullName] =
    useState('');

  const [copiedCode, setCopiedCode] =
    useState(false);

  // Course
  const [isCourseModalOpen, setIsCourseModalOpen] =
    useState(false);

  const [courseName, setCourseName] =
    useState('');

  const [creatingCourse, setCreatingCourse] =
    useState(false);

  const [openCourses, setOpenCourses] =
    useState<Record<string, boolean>>({});

  // Add material / assignment
  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [selectedCourse, setSelectedCourse] =
    useState<Course | null>(null);

  const [addType, setAddType] =
    useState<AddType>('material');

  const [materialName, setMaterialName] =
    useState('');

  const [materialLink, setMaterialLink] =
    useState('');

  const [assignmentName, setAssignmentName] =
    useState('');

  const [assignmentDescription, setAssignmentDescription] =
    useState('');

  const [assignmentDueDate, setAssignmentDueDate] =
    useState('');

  const [creatingItem, setCreatingItem] =
    useState(false);

  // Link checking
  const [checkingLink, setCheckingLink] =
    useState(false);

  const [linkCheckError, setLinkCheckError] =
    useState<string | null>(null);

  // Student submission
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] =
    useState(false);

  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [submissionClass, setSubmissionClass] =
    useState('');

  const [submissionLink, setSubmissionLink] =
    useState('');

  const [submittingAssignment, setSubmittingAssignment] =
    useState(false);

  const [undoingSubmission, setUndoingSubmission] =
    useState(false);

  // Teacher grading
  const [openAssignments, setOpenAssignments] =
    useState<Record<string, boolean>>({});

  const [gradeInputs, setGradeInputs] =
    useState<Record<string, string>>({});

  const [savingGrades, setSavingGrades] =
    useState<Record<string, boolean>>({});

  const authHeaders = {
    apikey: supabaseAnonKey || '',
    Authorization: `Bearer ${supabaseAnonKey || ''}`,
  };

  const jsonHeaders = {
    ...authHeaders,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const getJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, {
      headers: authHeaders,
      cache: 'no-store',
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || 'Request failed.');
    }

    return text ? JSON.parse(text) : ([] as T);
  };

  const deleteFrom = async (url: string) => {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders,
    });

    if (!response.ok) {
      throw new Error(
        (await response.text()) || 'Delete failed.'
      );
    }
  };

  const isValidHttpUrl = (value: string) => {
    try {
      const url = new URL(value.trim());
      return (
        url.protocol === 'http:' ||
        url.protocol === 'https:'
      );
    } catch {
      return false;
    }
  };

  // ============================================================
  // USER
  // ============================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      let role = '';
      let name = '';
      let id = '';

      const readUser = (parsed: any) => {
        if (!parsed) return;

        role =
          role ||
          parsed?.role ||
          parsed?.user?.role ||
          parsed?.user?.user_metadata?.role ||
          '';

        name =
          name ||
          parsed?.fullName ||
          parsed?.full_name ||
          parsed?.name ||
          parsed?.user?.fullName ||
          parsed?.user?.full_name ||
          parsed?.user?.name ||
          parsed?.user?.user_metadata?.fullName ||
          parsed?.user?.user_metadata?.full_name ||
          '';

        id =
          id ||
          parsed?.id ||
          parsed?.user_id ||
          parsed?.uid ||
          parsed?.user?.id ||
          '';
      };

      const directRole =
        localStorage.getItem('user_role');

      if (directRole) {
        role = directRole;
      }

      const currentUser =
        localStorage.getItem('current_user');

      if (currentUser) {
        try {
          readUser(JSON.parse(currentUser));
        } catch {}
      }

      // Look through possible auth storage too.
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (!key) continue;

        if (
          key.includes('supabase') ||
          key.includes('auth')
        ) {
          const raw = localStorage.getItem(key);

          if (!raw) continue;

          try {
            readUser(JSON.parse(raw));
          } catch {}
        }
      }

      setIsTeacher(
        String(role).toLowerCase() === 'teacher'
      );

      setStudentFullName(
        String(name || '').trim()
      );

      setStudentId(
        String(id || '').trim()
      );
    } catch (err) {
      console.error('Could not read user:', err);
    }
  }, []);

  // ============================================================
  // DATE HELPERS
  // ============================================================

  const getTodayDateInput = () => {
    const now = new Date();

    return `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}`;
  };

  const parseDDMMYYYY = (value: string) => {
    const match = value.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  };

  const formatDateForDatabase = (value: string) => {
    const date = parseDDMMYYYY(value);

    if (!date) return null;

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  };

  const isDueDateValid = (value: string) => {
    const date = parseDDMMYYYY(value);

    if (!date) return false;

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date >= today;
  };

  const formatDateForDisplay = (
    value?: string | null
  ) => {
    if (!value) return 'No due date';

    const parts = value.split('-');

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return value;
  };

  const handleDueDateChange = (value: string) => {
    let digits = value.replace(/\D/g, '');

    if (digits.length > 8) {
      digits = digits.slice(0, 8);
    }

    let formatted = digits;

    if (digits.length >= 5) {
      formatted =
        `${digits.slice(0, 2)}/` +
        `${digits.slice(2, 4)}/` +
        digits.slice(4);
    } else if (digits.length >= 3) {
      formatted =
        `${digits.slice(0, 2)}/` +
        digits.slice(2);
    }

    setAssignmentDueDate(formatted);
    setLinkCheckError(null);
  };

  // ============================================================
  // LOAD CLASS
  // ============================================================

  useEffect(() => {
    if (
      !code ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      setLoading(false);
      return;
    }

    async function loadClass() {
      setLoading(true);
      setError(null);

      try {
        const classList =
          await getJson<ClassData[]>(
            `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
              code
            )}&select=*`
          );

        if (!classList.length) {
          setError('Class not found.');
          return;
        }

        const currentClass = classList[0];

        setClassData(currentClass);

        const courseList =
          await getJson<Course[]>(
            `${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(
              code
            )}&select=*&order=id.asc`
          );

        setCourses(courseList);

        const materialMap: Record<
          string,
          Material[]
        > = {};

        const assignmentMap: Record<
          string,
          Assignment[]
        > = {};

        await Promise.all(
          courseList.map(async (course) => {
            if (!course.id) return;

            try {
              materialMap[course.id] =
                await getJson<Material[]>(
                  `${supabaseUrl}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(
                    course.id
                  )}&select=*&order=id.asc`
                );
            } catch {
              materialMap[course.id] = [];
            }

            try {
              assignmentMap[course.id] =
                await getJson<Assignment[]>(
                  `${supabaseUrl}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(
                    course.id
                  )}&select=*&order=created_at.asc`
                );
            } catch {
              assignmentMap[course.id] = [];
            }
          })
        );

        setMaterials(materialMap);
        setAssignments(assignmentMap);

        const allAssignments =
          Object.values(assignmentMap).flat();

        const submissionMap: Record<
          string,
          Submission[]
        > = {};

        await Promise.all(
          allAssignments.map(async (assignment) => {
            if (!assignment.id) return;

            try {
              if (isTeacher) {
                // Teacher sees everyone.
                submissionMap[assignment.id] =
                  await getJson<Submission[]>(
                    `${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(
                      assignment.id
                    )}&select=*&order=created_at.asc`
                  );
              } else if (studentId) {
                // Student ONLY sees their own submission.
                submissionMap[assignment.id] =
                  await getJson<Submission[]>(
                    `${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(
                      assignment.id
                    )}&student_id=eq.${encodeURIComponent(
                      studentId
                    )}&select=*&order=created_at.asc`
                  );
              } else {
                submissionMap[assignment.id] = [];
              }
            } catch (err) {
              console.error(
                'Submission fetch error:',
                err
              );

              submissionMap[assignment.id] = [];
            }
          })
        );

        setSubmissions(submissionMap);
      } catch (err) {
        console.error(
          'Error loading class:',
          err
        );

        setError(
          'Something went wrong while loading this class.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadClass();
  }, [
    code,
    supabaseUrl,
    supabaseAnonKey,
    isTeacher,
    studentId,
  ]);

  // ============================================================
  // COPY CODE
  // ============================================================

  const handleCopyCode = async () => {
    if (!classData?.code) return;

    try {
      await navigator.clipboard.writeText(
        classData.code
      );

      setCopiedCode(true);

      setTimeout(
        () => setCopiedCode(false),
        2000
      );
    } catch (err) {
      console.error(
        'Failed to copy:',
        err
      );
    }
  };

  // ============================================================
  // COURSE
  // ============================================================

  const handleCreateCourse = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !isTeacher ||
      !courseName.trim() ||
      !supabaseUrl
    ) {
      return;
    }

    setCreatingCourse(true);

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/class_courses`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            course_name:
              courseName.trim(),
            class_code: code,
          }),
        }
      );

      const text =
        await response.text();

      if (!response.ok) {
        throw new Error(
          text || 'Failed to create course.'
        );
      }

      const created =
        (JSON.parse(text) as Course[])[0];

      if (!created) {
        throw new Error(
          'No course returned.'
        );
      }

      setCourses((prev) => [
        ...prev,
        created,
      ]);

      if (created.id) {
        setMaterials((prev) => ({
          ...prev,
          [created.id!]: [],
        }));

        setAssignments((prev) => ({
          ...prev,
          [created.id!]: [],
        }));
      }

      setCourseName('');
      setIsCourseModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create course.');
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleDeleteCourse = async (
    courseId: string
  ) => {
    if (!isTeacher) return;

    if (
      !window.confirm(
        'Are you sure you want to delete this course?'
      )
    ) {
      return;
    }

    try {
      await deleteFrom(
        `${supabaseUrl}/rest/v1/class_courses?id=eq.${encodeURIComponent(
          courseId
        )}`
      );

      setCourses((prev) =>
        prev.filter(
          (course) =>
            course.id !== courseId
        )
      );

      setMaterials((prev) => {
        const next = { ...prev };
        delete next[courseId];
        return next;
      });

      setAssignments((prev) => {
        const next = { ...prev };
        delete next[courseId];
        return next;
      });
    } catch (err) {
      console.error(err);
      alert('Failed to delete course.');
    }
  };

  // ============================================================
  // MATERIAL
  // ============================================================

  const handleDeleteMaterial = async (
    materialId: string,
    courseId: string
  ) => {
    if (!isTeacher) return;

    if (
      !window.confirm(
        'Are you sure you want to delete this material?'
      )
    ) {
      return;
    }

    try {
      await deleteFrom(
        `${supabaseUrl}/rest/v1/course_materials?id=eq.${encodeURIComponent(
          materialId
        )}`
      );

      setMaterials((prev) => ({
        ...prev,
        [courseId]: (
          prev[courseId] || []
        ).filter(
          (item) =>
            item.id !== materialId
        ),
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to delete material.');
    }
  };

  // ============================================================
  // LINK SAFETY
  // ============================================================

  const checkMaterialLink = async (
    link: string
  ): Promise<LinkCheckResult> => {
    try {
      const response = await fetch(
        '/api/moderate-link',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            url: link,
          }),
        }
      );

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.reason ||
            data?.error ||
            'Unable to check this link.'
        );
      }

      return {
        safe: data?.safe === true,
        reason: data?.reason,
      };
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : 'Unable to check this link.'
      );
    }
  };

  // ============================================================
  // ADD MODAL
  // ============================================================

  const openAddModal = (
    course: Course
  ) => {
    if (!course.id) return;

    setSelectedCourse(course);
    setAddType('material');
    setMaterialName('');
    setMaterialLink('');
    setAssignmentName('');
    setAssignmentDescription('');
    setAssignmentDueDate(
      getTodayDateInput()
    );
    setLinkCheckError(null);
    setIsAddModalOpen(true);
  };

  const closeAddModal = (
    force = false
  ) => {
    if (
      creatingItem &&
      !force
    ) {
      return;
    }

    setIsAddModalOpen(false);
    setSelectedCourse(null);
    setMaterialName('');
    setMaterialLink('');
    setAssignmentName('');
    setAssignmentDescription('');
    setAssignmentDueDate('');
    setLinkCheckError(null);
    setCheckingLink(false);
  };

  // ============================================================
  // CREATE MATERIAL / ASSIGNMENT
  // ============================================================

  const handleCreateItem = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !isTeacher ||
      !selectedCourse?.id ||
      !supabaseUrl
    ) {
      return;
    }

    const courseId =
      selectedCourse.id;

    setCreatingItem(true);
    setLinkCheckError(null);

    try {
      if (addType === 'material') {
        if (
          !materialName.trim() ||
          !materialLink.trim()
        ) {
          return;
        }

        if (
          !isValidHttpUrl(
            materialLink
          )
        ) {
          throw new Error(
            'Please enter a valid HTTP or HTTPS URL.'
          );
        }

        setCheckingLink(true);

        const cleanLink =
          new URL(
            materialLink.trim()
          ).toString();

        const result =
          await checkMaterialLink(
            cleanLink
          );

        setCheckingLink(false);

        if (!result.safe) {
          throw new Error(
            result.reason ||
              'This link is not allowed.'
          );
        }

        const response =
          await fetch(
            `${supabaseUrl}/rest/v1/course_materials`,
            {
              method: 'POST',
              headers: jsonHeaders,
              body: JSON.stringify({
                course_id: courseId,
                name:
                  materialName.trim(),
                link: cleanLink,
              }),
            }
          );

        const text =
          await response.text();

        if (!response.ok) {
          throw new Error(
            text ||
              'Failed to create material.'
          );
        }

        const created =
          (JSON.parse(text) as Material[])[0];

        if (!created) {
          throw new Error(
            'No material returned.'
          );
        }

        setMaterials((prev) => ({
          ...prev,
          [courseId]: [
            ...(prev[courseId] || []),
            created,
          ],
        }));

        setOpenCourses((prev) => ({
          ...prev,
          [courseId]: true,
        }));

        closeAddModal(true);
        return;
      }

      if (
        !assignmentName.trim() ||
        !assignmentDescription.trim() ||
        !assignmentDueDate.trim()
      ) {
        return;
      }

      if (
        !isDueDateValid(
          assignmentDueDate
        )
      ) {
        throw new Error(
          'The due date must be today or a future date.'
        );
      }

      const dueDate =
        formatDateForDatabase(
          assignmentDueDate
        );

      if (!dueDate) {
        throw new Error(
          'Invalid due date.'
        );
      }

      const response =
        await fetch(
          `${supabaseUrl}/rest/v1/course_assignments`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              course_id: courseId,
              name:
                assignmentName.trim(),
              description:
                assignmentDescription.trim(),
              due_date: dueDate,
            }),
          }
        );

      const text =
        await response.text();

      if (!response.ok) {
        throw new Error(
          text ||
            'Failed to create assignment.'
        );
      }

      const created =
        (JSON.parse(text) as Assignment[])[0];

      if (!created) {
        throw new Error(
          'No assignment returned.'
        );
      }

      setAssignments((prev) => ({
        ...prev,
        [courseId]: [
          ...(prev[courseId] || []),
          created,
        ],
      }));

      if (created.id) {
        setSubmissions((prev) => ({
          ...prev,
          [created.id!]: [],
        }));
      }

      setOpenCourses((prev) => ({
        ...prev,
        [courseId]: true,
      }));

      closeAddModal(true);
    } catch (err) {
      console.error(err);

      setLinkCheckError(
        err instanceof Error
          ? err.message
          : 'Failed to add item.'
      );
    } finally {
      setCreatingItem(false);
      setCheckingLink(false);
    }
  };

  // ============================================================
  // DELETE ASSIGNMENT
  // ============================================================

  const handleDeleteAssignment = async (
    assignmentId: string,
    courseId: string
  ) => {
    if (!isTeacher) return;

    if (
      !window.confirm(
        'Are you sure you want to delete this assignment?'
      )
    ) {
      return;
    }

    try {
      await deleteFrom(
        `${supabaseUrl}/rest/v1/course_assignments?id=eq.${encodeURIComponent(
          assignmentId
        )}`
      );

      setAssignments((prev) => ({
        ...prev,
        [courseId]: (
          prev[courseId] || []
        ).filter(
          (assignment) =>
            assignment.id !==
            assignmentId
        ),
      }));

      setSubmissions((prev) => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
    } catch (err) {
      console.error(err);
      alert(
        'Failed to delete assignment.'
      );
    }
  };

  // ============================================================
  // STUDENT SUBMISSION
  // ============================================================

  const getStudentSubmission = (
    assignmentId: string
  ) => {
    if (!studentId) {
      return undefined;
    }

    return (
      submissions[assignmentId] || []
    ).find(
      (submission) =>
        submission.student_id ===
        studentId
    );
  };

  const openSubmissionModal = (
    assignment: Assignment
  ) => {
    if (
      isTeacher ||
      !assignment.id
    ) {
      return;
    }

    if (!studentId) {
      alert(
        'Your account ID could not be found. Please sign in again.'
      );
      return;
    }

    if (
      getStudentSubmission(
        assignment.id
      )
    ) {
      return;
    }

    setSelectedAssignment(
      assignment
    );

    setSubmissionClass('');
    setSubmissionLink('');
    setLinkCheckError(null);
    setIsSubmissionModalOpen(true);
  };

  const closeSubmissionModal = (
    force = false
  ) => {
    if (
      submittingAssignment &&
      !force
    ) {
      return;
    }

    setIsSubmissionModalOpen(false);
    setSelectedAssignment(null);
    setSubmissionClass('');
    setSubmissionLink('');
    setLinkCheckError(null);
    setCheckingLink(false);
  };

  // ============================================================
  // SUBMIT ASSIGNMENT
  // ============================================================

  const handleSubmitAssignment = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      isTeacher ||
      !selectedAssignment?.id ||
      !studentId ||
      !studentFullName.trim() ||
      !submissionClass.trim() ||
      !submissionLink.trim() ||
      !supabaseUrl
    ) {
      return;
    }

    const assignmentId =
      selectedAssignment.id;

    if (
      getStudentSubmission(
        assignmentId
      )
    ) {
      alert(
        'You have already submitted this assignment.'
      );

      closeSubmissionModal();
      return;
    }

    setSubmittingAssignment(true);
    setCheckingLink(true);
    setLinkCheckError(null);

    try {
      if (
        !isValidHttpUrl(
          submissionLink
        )
      ) {
        throw new Error(
          'Please enter a valid HTTP or HTTPS URL.'
        );
      }

      const cleanLink =
        new URL(
          submissionLink.trim()
        ).toString();

      // IMPORTANT:
      // Identify the student using their UUID.
      const existing =
        await getJson<Submission[]>(
          `${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(
            assignmentId
          )}&student_id=eq.${encodeURIComponent(
            studentId
          )}&select=*`
        );

      if (existing.length > 0) {
        setSubmissions((prev) => ({
          ...prev,
          [assignmentId]: existing,
        }));

        throw new Error(
          'You have already submitted this assignment.'
        );
      }

      const checkResult =
        await checkMaterialLink(
          cleanLink
        );

      setCheckingLink(false);

      if (!checkResult.safe) {
        throw new Error(
          checkResult.reason ||
            'This link is not allowed.'
        );
      }

      const response =
        await fetch(
          `${supabaseUrl}/rest/v1/assignment_submissions`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              assignment_id:
                assignmentId,

              // THIS is the important fix.
              student_id:
                studentId,

              nickname:
                studentFullName.trim(),

              class:
                submissionClass
                  .trim()
                  .toUpperCase(),

              link: cleanLink,

              grade: null,
            }),
          }
        );

      const text =
        await response.text();

      if (!response.ok) {
        throw new Error(
          text ||
            'Failed to submit assignment.'
        );
      }

      const created =
        (JSON.parse(text) as Submission[])[0];

      if (!created) {
        throw new Error(
          'No submission returned.'
        );
      }

      setSubmissions((prev) => ({
        ...prev,
        [assignmentId]: [
          ...(prev[assignmentId] || []),
          created,
        ],
      }));

      closeSubmissionModal(true);

      alert(
        'Assignment submitted successfully!'
      );
    } catch (err) {
      console.error(err);

      setLinkCheckError(
        err instanceof Error
          ? err.message
          : 'Failed to submit assignment.'
      );
    } finally {
      setCheckingLink(false);
      setSubmittingAssignment(false);
    }
  };

  // ============================================================
  // UNDO SUBMISSION
  // ============================================================

  const handleUndoSubmission = async (
    assignment: Assignment
  ) => {
    if (
      isTeacher ||
      !assignment.id ||
      !studentId
    ) {
      return;
    }

    const existing =
      getStudentSubmission(
        assignment.id
      );

    if (!existing?.id) return;

    if (
      !window.confirm(
        'Undo your submission? Your teacher will no longer see it, and you will be able to submit again.'
      )
    ) {
      return;
    }

    setUndoingSubmission(true);

    try {
      await deleteFrom(
        `${supabaseUrl}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(
          existing.id
        )}&student_id=eq.${encodeURIComponent(
          studentId
        )}`
      );

      setSubmissions((prev) => ({
        ...prev,
        [assignment.id!]: (
          prev[assignment.id!] || []
        ).filter(
          (submission) =>
            submission.id !==
            existing.id
        ),
      }));

      alert(
        'Submission undone. You can submit the assignment again.'
      );
    } catch (err) {
      console.error(err);
      alert(
        'Failed to undo submission.'
      );
    } finally {
      setUndoingSubmission(false);
    }
  };

  // ============================================================
  // TEACHER SUBMISSIONS
  // ============================================================

  const toggleAssignment = async (
    assignmentId: string
  ) => {
    const opening =
      !openAssignments[assignmentId];

    setOpenAssignments((prev) => ({
      ...prev,
      [assignmentId]: opening,
    }));

    if (
      opening &&
      isTeacher &&
      supabaseUrl
    ) {
      try {
        const data =
          await getJson<Submission[]>(
            `${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(
              assignmentId
            )}&select=*&order=created_at.asc`
          );

        setSubmissions((prev) => ({
          ...prev,
          [assignmentId]: data,
        }));
      } catch (err) {
        console.error(
          'Failed to load submissions:',
          err
        );
      }
    }
  };

  // ============================================================
  // SAVE GRADE
  // ============================================================

  const handleSaveGrade = async (
    submission: Submission
  ) => {
    if (
      !isTeacher ||
      !submission.id ||
      !supabaseUrl
    ) {
      return;
    }

    const raw =
      gradeInputs[submission.id] ??
      String(
        submission.grade ?? ''
      );

    if (raw === '') {
      alert(
        'Please enter a grade.'
      );
      return;
    }

    const grade = Number(raw);

    if (
      !Number.isInteger(grade) ||
      grade < 0 ||
      grade > 100
    ) {
      alert(
        'Grade must be a whole number between 0 and 100.'
      );
      return;
    }

    setSavingGrades((prev) => ({
      ...prev,
      [submission.id!]: true,
    }));

    try {
      const response =
        await fetch(
          `${supabaseUrl}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(
            submission.id
          )}`,
          {
            method: 'PATCH',
            headers: jsonHeaders,
            body: JSON.stringify({
              grade,
            }),
          }
        );

      const text =
        await response.text();

      if (!response.ok) {
        throw new Error(
          text ||
            'Failed to save grade.'
        );
      }

      let updatedGrade = grade;

      try {
        const updated =
          JSON.parse(text) as Submission[];

        if (
          updated[0]?.grade !==
          undefined
        ) {
          updatedGrade =
            Number(
              updated[0].grade
            );
        }
      } catch {}

      setSubmissions((prev) => ({
        ...prev,
        [submission.assignment_id]:
          (
            prev[
              submission.assignment_id
            ] || []
          ).map((item) =>
            item.id === submission.id
              ? {
                  ...item,
                  grade:
                    updatedGrade,
                }
              : item
          ),
      }));

      setGradeInputs((prev) => ({
        ...prev,
        [submission.id!]:
          String(updatedGrade),
      }));
    } catch (err) {
      console.error(
        'Error saving grade:',
        err
      );

      alert(
        'Failed to save grade.'
      );
    } finally {
      setSavingGrades((prev) => ({
        ...prev,
        [submission.id!]: false,
      }));
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-6 py-8">
          <Link
            href={
              isTeacher
                ? '/dashboard/teacher'
                : '/dashboard/student'
            }
          >
            <Button
              variant="ghost"
              className="mb-6 gap-2"
            >
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Button>
          </Link>

          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 size-10 text-muted-foreground" />

              <h1 className="text-xl font-semibold">
                {error || 'Class not found'}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                The class code{' '}
                <span className="font-mono font-semibold">
                  {code}
                </span>{' '}
                could not be found.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const dashboardUrl = isTeacher
    ? '/dashboard/teacher'
    : '/dashboard/student';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto space-y-8 px-6 py-8">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={dashboardUrl}>
              <Button
                variant="ghost"
                className="-ml-3 mb-3 gap-2"
              >
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Button>
            </Link>

            <h1 className="text-3xl font-bold">
              {classData.class_name}
            </h1>

            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>
                School: {classData.school_name}
              </span>

              <span>
                Code:{' '}
                <span className="font-mono font-semibold text-primary">
                  {classData.code}
                </span>

                {isTeacher && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="ml-2 inline-flex items-center"
                    title="Copy class code"
                  >
                    {copiedCode ? (
                      <span className="text-xs font-bold text-primary">
                        ✓
                      </span>
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                )}
              </span>
            </div>
          </div>

          {isTeacher && (
            <Button
              onClick={() =>
                setIsCourseModalOpen(true)
              }
              className="gap-2"
            >
              <PlusCircle size={18} />
              Create New Course
            </Button>
          )}
        </div>

        {/* COURSES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Courses
            </h2>

            <span className="text-sm text-muted-foreground">
              {courses.length}{' '}
              {courses.length === 1
                ? 'course'
                : 'courses'}
            </span>
          </div>

          {courses.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <BookOpen className="mx-auto mb-4 size-10 text-muted-foreground" />

                <h3 className="font-semibold">
                  No courses yet
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {isTeacher
                    ? 'Create your first course.'
                    : 'Your teacher has not created any courses yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => {
                if (!course.id) return null;

                const courseId =
                  course.id;

                const isOpen =
                  !!openCourses[courseId];

                const courseMaterials =
                  materials[courseId] || [];

                const courseAssignments =
                  assignments[courseId] || [];

                return (
                  <Card
                    key={courseId}
                    className="overflow-hidden"
                  >
                    {/* COURSE HEADER */}
                    <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setOpenCourses(
                              (prev) => ({
                                ...prev,
                                [courseId]:
                                  !prev[
                                    courseId
                                  ],
                              })
                            )
                          }
                          className="size-8 p-0 text-primary"
                        >
                          {isOpen ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </Button>

                        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                          <BookOpen className="size-4 text-primary" />

                          <span className="truncate">
                            {course.course_name}
                          </span>
                        </CardTitle>
                      </div>

                      {isTeacher && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              openAddModal(
                                course
                              )
                            }
                            className="gap-2"
                          >
                            <PlusCircle size={15} />
                            Add
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteCourse(
                                courseId
                              )
                            }
                            className="size-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      )}
                    </CardHeader>

                    {/* COURSE CONTENT */}
                    {isOpen && (
                      <CardContent className="space-y-8 border-t border-border pt-5">

                        {/* MATERIALS */}
                        <div className="space-y-3">
                          <h3 className="font-semibold">
                            Materials
                          </h3>

                          {courseMaterials.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                              No materials yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {courseMaterials.map(
                                (material) => (
                                  <div
                                    key={
                                      material.id
                                    }
                                    className="flex items-center gap-3 rounded-lg border bg-background p-3"
                                  >
                                    <a
                                      href={
                                        material.link
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex min-w-0 flex-1 items-center gap-3"
                                    >
                                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <LinkIcon className="size-4 text-primary" />
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                          {
                                            material.name
                                          }
                                        </p>

                                        <p className="truncate text-xs text-muted-foreground">
                                          {
                                            material.link
                                          }
                                        </p>
                                      </div>

                                      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                                    </a>

                                    {isTeacher &&
                                      material.id && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleDeleteMaterial(
                                              material.id!,
                                              courseId
                                            )
                                          }
                                          className="size-8 p-0 text-muted-foreground hover:text-destructive"
                                        >
                                          <Trash2 size={15} />
                                        </Button>
                                      )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {/* ASSIGNMENTS */}
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold">
                              Assignments
                            </h3>

                            <p className="text-xs text-muted-foreground">
                              {isTeacher
                                ? 'Click an assignment to view submissions and grades.'
                                : 'Click an assignment to submit your work.'}
                            </p>
                          </div>

                          {courseAssignments.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                              No assignments yet.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {courseAssignments.map(
                                (assignment) => {
                                  if (!assignment.id) {
                                    return null;
                                  }

                                  const assignmentId =
                                    assignment.id;

                                  const open =
                                    !!openAssignments[
                                      assignmentId
                                    ];

                                  const assignmentSubmissions =
                                    submissions[
                                      assignmentId
                                    ] || [];

                                  const studentSubmission =
                                    !isTeacher
                                      ? getStudentSubmission(
                                          assignmentId
                                        )
                                      : undefined;

                                  return (
                                    <div
                                      key={
                                        assignmentId
                                      }
                                      className="overflow-hidden rounded-lg border bg-background"
                                    >
                                      {/* ASSIGNMENT */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (
                                            isTeacher
                                          ) {
                                            toggleAssignment(
                                              assignmentId
                                            );
                                          } else if (
                                            studentSubmission
                                          ) {
                                            handleUndoSubmission(
                                              assignment
                                            );
                                          } else {
                                            openSubmissionModal(
                                              assignment
                                            );
                                          }
                                        }}
                                        disabled={
                                          undoingSubmission
                                        }
                                        className="flex w-full items-start gap-3 p-4 text-left hover:bg-primary/5 disabled:cursor-wait"
                                      >
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                          <ClipboardList className="size-5 text-primary" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-3">
                                            <p className="font-semibold">
                                              {
                                                assignment.name
                                              }
                                            </p>

                                            {isTeacher &&
                                              (open ? (
                                                <ChevronUp className="size-4" />
                                              ) : (
                                                <ChevronDown className="size-4" />
                                              ))}
                                          </div>

                                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                            {
                                              assignment.description
                                            }
                                          </p>

                                          {assignment.due_date && (
                                            <p className="mt-2 text-xs font-medium text-muted-foreground">
                                              Due:{' '}
                                              <span className="text-foreground">
                                                {formatDateForDisplay(
                                                  assignment.due_date
                                                )}
                                              </span>
                                            </p>
                                          )}

                                          {isTeacher && (
                                            <p className="mt-2 text-xs text-primary">
                                              {
                                                assignmentSubmissions.length
                                              }{' '}
                                              {assignmentSubmissions.length ===
                                              1
                                                ? 'submission'
                                                : 'submissions'}
                                            </p>
                                          )}

                                          {!isTeacher &&
                                            studentSubmission && (
                                              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                                                <RotateCcw className="size-3.5" />
                                                Submitted — click to undo
                                              </p>
                                            )}

                                          {!isTeacher &&
                                            !studentSubmission && (
                                              <p className="mt-2 text-xs font-medium text-primary">
                                                Click to submit →
                                              </p>
                                            )}
                                        </div>
                                      </button>

                                      {/* TEACHER TABLE */}
                                      {isTeacher &&
                                        open && (
                                          <div className="border-t p-4">
                                            {assignmentSubmissions.length ===
                                            0 ? (
                                              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                                                No students have submitted this assignment yet.
                                              </p>
                                            ) : (
                                              <div className="overflow-x-auto rounded-lg border">
                                                <table className="w-full min-w-[700px] text-sm">
                                                  <thead>
                                                    <tr className="border-b bg-muted/40">
                                                      <th className="px-4 py-3 text-left">
                                                        Name
                                                      </th>

                                                      <th className="px-4 py-3 text-left">
                                                        Class
                                                      </th>

                                                      <th className="px-4 py-3 text-left">
                                                        Submission
                                                      </th>

                                                      <th className="px-4 py-3 text-right">
                                                        Grade
                                                      </th>
                                                    </tr>
                                                  </thead>

                                                  <tbody>
                                                    {assignmentSubmissions
                                                      .slice()
                                                      .sort(
                                                        (
                                                          a,
                                                          b
                                                        ) =>
                                                          a.class.localeCompare(
                                                            b.class,
                                                            undefined,
                                                            {
                                                              numeric:
                                                                true,
                                                            }
                                                          ) ||
                                                          a.nickname.localeCompare(
                                                            b.nickname
                                                          )
                                                      )
                                                      .map(
                                                        (
                                                          submission
                                                        ) => {
                                                          if (
                                                            !submission.id
                                                          ) {
                                                            return null;
                                                          }

                                                          const currentGrade =
                                                            gradeInputs[
                                                              submission.id
                                                            ] ??
                                                            String(
                                                              submission.grade ??
                                                                ''
                                                            );

                                                          return (
                                                            <tr
                                                              key={
                                                                submission.id
                                                              }
                                                              className="border-b last:border-0"
                                                            >
                                                              <td className="px-4 py-3 font-medium">
                                                                {
                                                                  submission.nickname
                                                                }
                                                              </td>

                                                              <td className="px-4 py-3 uppercase text-muted-foreground">
                                                                {
                                                                  submission.class
                                                                }
                                                              </td>

                                                              <td className="px-4 py-3">
                                                                <a
                                                                  href={
                                                                    submission.link
                                                                  }
                                                                  target="_blank"
                                                                  rel="noopener noreferrer"
                                                                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                                                >
                                                                  Open Link
                                                                  <ExternalLink className="size-3.5" />
                                                                </a>
                                                              </td>

                                                              <td className="px-4 py-3">
                                                                <div className="flex items-center justify-end gap-2">
                                                                  <Input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="1"
                                                                    value={
                                                                      currentGrade
                                                                    }
                                                                    onChange={(
                                                                      e
                                                                    ) => {
                                                                      let value =
                                                                        e
                                                                          .target
                                                                          .value;

                                                                      if (
                                                                        value ===
                                                                        ''
                                                                      ) {
                                                                        setGradeInputs(
                                                                          (
                                                                            prev
                                                                          ) => ({
                                                                            ...prev,
                                                                            [submission.id!]:
                                                                              '',
                                                                          })
                                                                        );

                                                                        return;
                                                                      }

                                                                      let number =
                                                                        Number(
                                                                          value
                                                                        );

                                                                      if (
                                                                        !Number.isFinite(
                                                                          number
                                                                        )
                                                                      ) {
                                                                        return;
                                                                      }

                                                                      number =
                                                                        Math.max(
                                                                          0,
                                                                          Math.min(
                                                                            100,
                                                                            Math.trunc(
                                                                              number
                                                                            )
                                                                          )
                                                                        );

                                                                      setGradeInputs(
                                                                        (
                                                                          prev
                                                                        ) => ({
                                                                          ...prev,
                                                                          [submission.id!]:
                                                                            String(
                                                                              number
                                                                            ),
                                                                        })
                                                                      );
                                                                    }}
                                                                    onKeyDown={(
                                                                      e
                                                                    ) => {
                                                                      if (
                                                                        [
                                                                          'e',
                                                                          'E',
                                                                          '+',
                                                                          '-',
                                                                          '.',
                                                                        ].includes(
                                                                          e.key
                                                                        )
                                                                      ) {
                                                                        e.preventDefault();
                                                                      }
                                                                    }}
                                                                    className="h-9 w-20 text-right"
                                                                  />

                                                                  <span className="text-muted-foreground">
                                                                    /100
                                                                  </span>

                                                                  <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                      handleSaveGrade(
                                                                        submission
                                                                      )
                                                                    }
                                                                    disabled={
                                                                      savingGrades[
                                                                        submission.id
                                                                      ]
                                                                    }
                                                                    className="gap-1.5"
                                                                  >
                                                                    {savingGrades[
                                                                      submission.id
                                                                    ] ? (
                                                                      <Loader2 className="size-3.5 animate-spin" />
                                                                    ) : (
                                                                      <Save className="size-3.5" />
                                                                    )}

                                                                    Save
                                                                  </Button>
                                                                </div>
                                                              </td>
                                                            </tr>
                                                          );
                                                        }
                                                      )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                      {/* DELETE */}
                                      {isTeacher && (
                                        <div className="flex justify-end border-t px-4 py-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleDeleteAssignment(
                                                assignmentId,
                                                courseId
                                              )
                                            }
                                            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                                          >
                                            <Trash2 className="size-3.5" />
                                            Delete Assignment
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ==========================================================
          CREATE COURSE MODAL
          ========================================================== */}

      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  Create New Course
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Add a course to{' '}
                  {classData.class_name}.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsCourseModalOpen(false)
                }
                disabled={
                  creatingCourse
                }
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateCourse
              }
              className="space-y-4"
            >
              <Input
                type="text"
                placeholder="Course name"
                value={courseName}
                onChange={(e) =>
                  setCourseName(
                    e.target.value
                  )
                }
                required
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setIsCourseModalOpen(
                      false
                    )
                  }
                  disabled={
                    creatingCourse
                  }
                  className="w-1/2"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    creatingCourse ||
                    !courseName.trim()
                  }
                  className="w-1/2"
                >
                  {creatingCourse ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Create Course'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          ADD MODAL
          ========================================================== */}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  Add
                </h3>

                {selectedCourse && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adding to{' '}
                    <span className="font-medium text-foreground">
                      {
                        selectedCourse.course_name
                      }
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  closeAddModal()
                }
                disabled={
                  creatingItem
                }
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateItem
              }
              className="space-y-5"
            >
              <select
                value={addType}
                onChange={(e) => {
                  setAddType(
                    e.target
                      .value as AddType
                  );

                  setLinkCheckError(
                    null
                  );

                  if (
                    e.target.value ===
                      'assignment' &&
                    !assignmentDueDate
                  ) {
                    setAssignmentDueDate(
                      getTodayDateInput()
                    );
                  }
                }}
                disabled={
                  creatingItem
                }
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="material">
                  Material
                </option>

                <option value="assignment">
                  Assignment
                </option>
              </select>

              {addType ===
                'material' && (
                <>
                  <Input
                    type="text"
                    placeholder="Material name"
                    value={materialName}
                    onChange={(e) => {
                      setMaterialName(
                        e.target.value
                      );
                      setLinkCheckError(
                        null
                      );
                    }}
                    required
                  />

                  <Input
                    type="url"
                    placeholder="https://example.com/material"
                    value={materialLink}
                    onChange={(e) => {
                      setMaterialLink(
                        e.target.value
                      );
                      setLinkCheckError(
                        null
                      );
                    }}
                    required
                  />
                </>
              )}

              {addType ===
                'assignment' && (
                <>
                  <Input
                    type="text"
                    placeholder="Assignment name"
                    value={assignmentName}
                    onChange={(e) =>
                      setAssignmentName(
                        e.target.value
                      )
                    }
                    required
                  />

                  <textarea
                    value={
                      assignmentDescription
                    }
                    onChange={(e) =>
                      setAssignmentDescription(
                        e.target.value
                      )
                    }
                    placeholder="Description"
                    required
                    rows={5}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />

                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    value={
                      assignmentDueDate
                    }
                    onChange={(e) =>
                      handleDueDateChange(
                        e.target.value
                      )
                    }
                    required
                  />

                  <p className="text-xs text-muted-foreground">
                    Enter the due date as DD/MM/YYYY.
                  </p>
                </>
              )}

              {linkCheckError && (
                <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <ShieldAlert className="size-5 shrink-0 text-destructive" />

                  <p className="text-sm text-destructive">
                    {linkCheckError}
                  </p>
                </div>
              )}

              {checkingLink && (
                <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-sm">
                    Checking link...
                  </span>
                </div>
              )}

              {addType ===
                'material' &&
                !checkingLink &&
                !linkCheckError && (
                  <div className="flex gap-3 rounded-lg border p-3">
                    <ShieldCheck className="size-5 text-primary" />

                    <p className="text-xs text-muted-foreground">
                      Links are checked before being published.
                    </p>
                  </div>
                )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    closeAddModal()
                  }
                  disabled={
                    creatingItem
                  }
                  className="w-1/2"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    creatingItem ||
                    checkingLink ||
                    (addType ===
                      'material' &&
                      (!materialName.trim() ||
                        !materialLink.trim())) ||
                    (addType ===
                      'assignment' &&
                      (!assignmentName.trim() ||
                        !assignmentDescription.trim() ||
                        !isDueDateValid(
                          assignmentDueDate
                        )))
                  }
                  className="w-1/2"
                >
                  {checkingLink ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Checking...
                    </>
                  ) : creatingItem ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    `Add ${
                      addType ===
                      'material'
                        ? 'Material'
                        : 'Assignment'
                    }`
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          STUDENT SUBMISSION MODAL
          ========================================================== */}

      {isSubmissionModalOpen &&
        selectedAssignment && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    Submit Assignment
                  </h3>

                  <p className="mt-1 font-medium">
                    {
                      selectedAssignment.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      selectedAssignment.description
                    }
                  </p>

                  {selectedAssignment.due_date && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Due:{' '}
                      <span className="font-medium text-foreground">
                        {formatDateForDisplay(
                          selectedAssignment.due_date
                        )}
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    closeSubmissionModal()
                  }
                  disabled={
                    submittingAssignment
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={
                  handleSubmitAssignment
                }
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Full Name
                  </label>

                  <Input
                    value={
                      studentFullName
                    }
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Class
                  </label>

                  <Input
                    placeholder="e.g. 8A"
                    value={
                      submissionClass
                    }
                    onChange={(e) =>
                      setSubmissionClass(
                        e.target.value.toUpperCase()
                      )
                    }
                    required
                    disabled={
                      submittingAssignment
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Submission Link
                  </label>

                  <Input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={
                      submissionLink
                    }
                    onChange={(e) => {
                      setSubmissionLink(
                        e.target.value
                      );
                      setLinkCheckError(
                        null
                      );
                    }}
                    required
                    disabled={
                      submittingAssignment
                    }
                  />
                </div>

                {linkCheckError && (
                  <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    <ShieldAlert className="size-5 shrink-0 text-destructive" />

                    <p className="text-sm text-destructive">
                      {linkCheckError}
                    </p>
                  </div>
                )}

                {checkingLink && (
                  <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
                    <Loader2 className="size-5 animate-spin text-primary" />

                    <span className="text-sm">
                      Checking link...
                    </span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      closeSubmissionModal()
                    }
                    disabled={
                      submittingAssignment
                    }
                    className="w-1/2"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={
                      submittingAssignment ||
                      checkingLink ||
                      !submissionClass.trim() ||
                      !submissionLink.trim() ||
                      !studentId
                    }
                    className="w-1/2"
                  >
                    {checkingLink ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Checking...
                      </>
                    ) : submittingAssignment ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Submit Work'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
