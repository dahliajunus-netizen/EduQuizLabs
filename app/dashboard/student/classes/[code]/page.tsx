'use client';

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
    : (params.code as string);

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

  const [studentFullName, setStudentFullName] =
    useState('');

  const [copiedCode, setCopiedCode] =
    useState(false);

  // COURSE
  const [isCourseModalOpen, setIsCourseModalOpen] =
    useState(false);

  const [courseName, setCourseName] =
    useState('');

  const [creatingCourse, setCreatingCourse] =
    useState(false);

  const [openCourses, setOpenCourses] =
    useState<Record<string, boolean>>({});

  // ADD MATERIAL / ASSIGNMENT
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

  // LINK CHECK
  const [checkingLink, setCheckingLink] =
    useState(false);

  const [linkCheckError, setLinkCheckError] =
    useState<string | null>(null);

  // STUDENT SUBMISSION
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

  // TEACHER
  const [openAssignments, setOpenAssignments] =
    useState<Record<string, boolean>>({});

  const [gradeInputs, setGradeInputs] =
    useState<Record<string, string>>({});

  const [savingGrades, setSavingGrades] =
    useState<Record<string, boolean>>({});

  // ============================================================
  // HELPERS
  // ============================================================

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
    });

    if (!response.ok) {
      throw new Error(
        await response.text() || 'Request failed.'
      );
    }

    return response.json();
  };

  const deleteFrom = async (url: string) => {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders,
    });

    if (!response.ok) {
      throw new Error(
        await response.text() || 'Delete failed.'
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
  // DATE HELPERS
  // ============================================================

  // Returns today's date in DD/MM/YYYY format.
  const getTodayDateInput = () => {
    const now = new Date();

    const day = String(
      now.getDate()
    ).padStart(2, '0');

    const month = String(
      now.getMonth() + 1
    ).padStart(2, '0');

    const year = now.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Converts a DD/MM/YYYY date into a Date object.
  // Returns null if the date is invalid.
  const parseDDMMYYYY = (
    value: string
  ) => {
    const match = value.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (!match) {
      return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    // Prevent invalid dates such as:
    // 31/02/2026
    // 32/01/2026
    // 00/12/2026
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  };

  // Converts DD/MM/YYYY to the YYYY-MM-DD format
  // expected by a PostgreSQL/Supabase date column.
  const formatDateForDatabase = (
    value: string
  ) => {
    const date = parseDDMMYYYY(value);

    if (!date) {
      return null;
    }

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // Makes sure the due date is today or later.
  const isDueDateValid = (
    value: string
  ) => {
    const date = parseDDMMYYYY(value);

    if (!date) {
      return false;
    }

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date >= today;
  };

  // Formats a database date (YYYY-MM-DD)
  // into DD/MM/YYYY for display.
  const formatDateForDisplay = (
    value?: string | null
  ) => {
    if (!value) {
      return 'No due date';
    }

    const parts =
      value.split('-');

    if (parts.length === 3) {
      const [
        year,
        month,
        day,
      ] = parts;

      return `${day}/${month}/${year}`;
    }

    return value;
  };

  // Automatically formats typed digits as DD/MM/YYYY.
  const handleDueDateChange = (
    value: string
  ) => {
    let digits =
      value.replace(/\D/g, '');

    if (digits.length > 8) {
      digits =
        digits.slice(0, 8);
    }

    let formatted = digits;

    if (digits.length >= 5) {
      formatted =
        digits.slice(0, 2) +
        '/' +
        digits.slice(2, 4) +
        '/' +
        digits.slice(4);
    } else if (
      digits.length >= 3
    ) {
      formatted =
        digits.slice(0, 2) +
        '/' +
        digits.slice(2);
    }

    setAssignmentDueDate(
      formatted
    );

    setLinkCheckError(null);
  };

  // ============================================================
  // COPY JOIN CODE
  // ============================================================

  const handleCopyCode = async () => {
    if (!isTeacher || !classData?.code) {
      return;
    }

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
        'Failed to copy join code:',
        err
      );
    }
  };

  // ============================================================
  // DETECT ROLE + STUDENT NAME
  // ============================================================

  useEffect(() => {
    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    try {
      let detectedRole = '';
      let detectedFullName = '';

      const extractUser = (
        parsed: any
      ) => {
        if (!parsed) {
          return;
        }

        const role =
          parsed?.role ||
          parsed?.user?.role ||
          parsed?.user?.user_metadata?.role ||
          parsed?.user_metadata?.role;

        if (role) {
          detectedRole =
            String(role).toLowerCase();
        }

        if (!detectedFullName) {
          detectedFullName =
            parsed?.fullName ||
            parsed?.full_name ||
            parsed?.name ||
            parsed?.user?.fullName ||
            parsed?.user?.full_name ||
            parsed?.user?.name ||
            parsed?.user?.user_metadata?.fullName ||
            parsed?.user?.user_metadata?.full_name ||
            parsed?.user?.user_metadata?.name ||
            parsed?.user_metadata?.fullName ||
            parsed?.user_metadata?.full_name ||
            parsed?.user_metadata?.name ||
            '';
        }
      };

      const directRole =
        localStorage.getItem(
          'user_role'
        );

      if (directRole) {
        detectedRole =
          directRole.toLowerCase();
      }

      const currentUserRaw =
        localStorage.getItem(
          'current_user'
        );

      if (currentUserRaw) {
        try {
          extractUser(
            JSON.parse(
              currentUserRaw
            )
          );
        } catch {
          // Ignore invalid JSON.
        }
      }

      for (
        let i = 0;
        i < localStorage.length;
        i++
      ) {
        const key =
          localStorage.key(i);

        if (!key) {
          continue;
        }

        if (
          key.includes('supabase') ||
          key.includes('auth') ||
          key === 'current_user'
        ) {
          const raw =
            localStorage.getItem(
              key
            );

          if (!raw) {
            continue;
          }

          try {
            extractUser(
              JSON.parse(raw)
            );
          } catch {
            // Ignore invalid JSON.
          }
        }
      }

      setIsTeacher(
        detectedRole === 'teacher'
      );

      setStudentFullName(
        String(
          detectedFullName || ''
        ).trim()
      );
    } catch (err) {
      console.error(
        'Could not determine user:',
        err
      );

      setIsTeacher(false);
    }
  }, []);

  // ============================================================
  // FETCH CLASS
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

    async function fetchClassData() {
      setLoading(true);
      setError(null);

      try {
        const classList =
          await getJson<ClassData[]>(
            `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
              code
            )}&select=*`
          );

        if (
          classList.length === 0
        ) {
          setError(
            'Class not found.'
          );

          setClassData(null);
          setCourses([]);
          setMaterials({});
          setAssignments({});
          setSubmissions({});

          return;
        }

        setClassData(
          classList[0]
        );

        const courseList =
          await getJson<Course[]>(
            `${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(
              code
            )}&select=*&order=id.asc`
          );

        setCourses(courseList);

        const materialMap:
          Record<
            string,
            Material[]
          > = {};

        const assignmentMap:
          Record<
            string,
            Assignment[]
          > = {};

        await Promise.all(
          courseList.map(
            async (course) => {
              if (!course.id) {
                return;
              }

              try {
                materialMap[
                  course.id
                ] =
                  await getJson<Material[]>(
                    `${supabaseUrl}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(
                      course.id
                    )}&select=*&order=id.asc`
                  );
              } catch {
                materialMap[
                  course.id
                ] = [];
              }

              try {
                assignmentMap[
                  course.id
                ] =
                  await getJson<Assignment[]>(
                    `${supabaseUrl}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(
                      course.id
                    )}&select=*&order=created_at.asc`
                  );
              } catch {
                assignmentMap[
                  course.id
                ] = [];
              }
            }
          )
        );

        setMaterials(
          materialMap
        );

        setAssignments(
          assignmentMap
        );

        const allAssignments =
          Object.values(
            assignmentMap
          ).flat();

        const submissionMap:
          Record<
            string,
            Submission[]
          > = {};

        await Promise.all(
          allAssignments.map(
            async (
              assignment
            ) => {
              if (!assignment.id) {
                return;
              }

              try {
                submissionMap[
                  assignment.id
                ] =
                  await getJson<Submission[]>(
                    `${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(
                      assignment.id
                    )}&select=*&order=created_at.asc`
                  );
              } catch {
                submissionMap[
                  assignment.id
                ] = [];
              }
            }
          )
        );

        setSubmissions(
          submissionMap
        );
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

    fetchClassData();
  }, [
    code,
    supabaseUrl,
    supabaseAnonKey,
  ]);

  // ============================================================
  // CREATE COURSE
  // ============================================================

  const handleCreateCourse = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !isTeacher ||
      !courseName.trim() ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

    setCreatingCourse(true);

    try {
      const response =
        await fetch(
          `${supabaseUrl}/rest/v1/class_courses`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({
              course_name:
                courseName.trim(),
              class_code:
                code,
            }),
          }
        );

      const text =
        await response.text();

      if (!response.ok) {
        throw new Error(
          text ||
            'Failed to create course.'
        );
      }

      const created =
        (
          JSON.parse(
            text
          ) as Course[]
        )[0];

      if (!created) {
        throw new Error(
          'No course was returned.'
        );
      }

      setCourses(
        (previous) => [
          ...previous,
          created,
        ]
      );

      if (created.id) {
        setMaterials(
          (previous) => ({
            ...previous,
            [created.id!]: [],
          })
        );

        setAssignments(
          (previous) => ({
            ...previous,
            [created.id!]: [],
          })
        );
      }

      setCourseName('');
      setIsCourseModalOpen(false);
    } catch (err) {
      console.error(
        'Error creating course:',
        err
      );

      alert(
        'Failed to create course.'
      );
    } finally {
      setCreatingCourse(false);
    }
  };

  // ============================================================
  // DELETE COURSE
  // ============================================================

  const handleDeleteCourse = async (
    courseId: string
  ) => {
    if (
      !isTeacher ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

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

      setCourses(
        (previous) =>
          previous.filter(
            (course) =>
              course.id !==
              courseId
          )
      );

      setMaterials(
        (previous) => {
          const updated = {
            ...previous,
          };

          delete updated[
            courseId
          ];

          return updated;
        }
      );

      setAssignments(
        (previous) => {
          const updated = {
            ...previous,
          };

          delete updated[
            courseId
          ];

          return updated;
        }
      );
    } catch (err) {
      console.error(
        'Error deleting course:',
        err
      );

      alert(
        'Failed to delete course.'
      );
    }
  };

  // ============================================================
  // DELETE MATERIAL
  // ============================================================

  const handleDeleteMaterial = async (
    materialId: string,
    courseId: string
  ) => {
    if (
      !isTeacher ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

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

      setMaterials(
        (previous) => ({
          ...previous,
          [courseId]: (
            previous[
              courseId
            ] || []
          ).filter(
            (material) =>
              material.id !==
              materialId
          ),
        })
      );
    } catch (err) {
      console.error(
        'Error deleting material:',
        err
      );

      alert(
        'Failed to delete material.'
      );
    }
  };

  // ============================================================
  // DELETE ASSIGNMENT
  // ============================================================

  const handleDeleteAssignment = async (
    assignmentId: string,
    courseId: string
  ) => {
    if (
      !isTeacher ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to delete this assignment? All submissions for it may also be removed depending on your Supabase foreign-key settings.'
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

      setAssignments(
        (previous) => ({
          ...previous,
          [courseId]: (
            previous[
              courseId
            ] || []
          ).filter(
            (assignment) =>
              assignment.id !==
              assignmentId
          ),
        })
      );

      setSubmissions(
        (previous) => {
          const updated = {
            ...previous,
          };

          delete updated[
            assignmentId
          ];

          return updated;
        }
      );
    } catch (err) {
      console.error(
        'Error deleting assignment:',
        err
      );

      alert(
        'Failed to delete assignment.'
      );
    }
  };

  // ============================================================
  // TOGGLE COURSE
  // ============================================================

  const toggleCourse = (
    courseId: string
  ) => {
    setOpenCourses(
      (previous) => ({
        ...previous,
        [courseId]:
          !previous[courseId],
      })
    );
  };

  // ============================================================
  // ADD MODAL
  // ============================================================

  const openAddModal = (
    course: Course
  ) => {
    if (
      !isTeacher ||
      !course.id
    ) {
      return;
    }

    setSelectedCourse(course);
    setAddType('material');

    setMaterialName('');
    setMaterialLink('');
    setAssignmentName('');
    setAssignmentDescription('');

    // Start assignment due date at today.
    setAssignmentDueDate(
      getTodayDateInput()
    );

    setLinkCheckError(null);
    setCheckingLink(false);
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
  // LINK SAFETY CHECK
  // ============================================================

  const checkMaterialLink = async (
    link: string
  ): Promise<LinkCheckResult> => {
    try {
      const response =
        await fetch(
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

      let data: any = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.reason ||
            data?.error ||
            'Unable to check this link.'
        );
      }

      return {
        safe:
          data?.safe === true,
        reason:
          data?.reason ||
          undefined,
      };
    } catch (err) {
      console.error(
        'Link safety check failed:',
        err
      );

      throw new Error(
        err instanceof Error
          ? err.message
          : 'We could not check this link right now. Please try again.'
      );
    }
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
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

    const courseId =
      selectedCourse.id;

    if (
      addType === 'material' &&
      (
        !materialName.trim() ||
        !materialLink.trim()
      )
    ) {
      return;
    }

    if (
      addType === 'assignment' &&
      (
        !assignmentName.trim() ||
        !assignmentDescription.trim() ||
        !assignmentDueDate.trim()
      )
    ) {
      return;
    }

    // ----------------------------------------------------------
    // VALIDATE ASSIGNMENT DUE DATE
    // ----------------------------------------------------------

    if (
      addType === 'assignment'
    ) {
      if (
        !parseDDMMYYYY(
          assignmentDueDate
        )
      ) {
        setLinkCheckError(
          'Please enter a valid due date in DD/MM/YYYY format.'
        );

        return;
      }

      if (
        !isDueDateValid(
          assignmentDueDate
        )
      ) {
        setLinkCheckError(
          'The due date cannot be earlier than today.'
        );

        return;
      }
    }

    setCreatingItem(true);
    setLinkCheckError(null);

    try {
      // ========================================================
      // MATERIAL
      // ========================================================

      if (
        addType === 'material'
      ) {
        setCheckingLink(true);

        if (
          !isValidHttpUrl(
            materialLink
          )
        ) {
          throw new Error(
            'Please enter a valid HTTP or HTTPS URL.'
          );
        }

        const cleanLink =
          new URL(
            materialLink.trim()
          ).toString();

        const checkResult =
          await checkMaterialLink(
            cleanLink
          );

        if (
          !checkResult.safe
        ) {
          throw new Error(
            checkResult.reason ||
              'This link does not appear appropriate for an educational platform.'
          );
        }

        setCheckingLink(false);

        const response =
          await fetch(
            `${supabaseUrl}/rest/v1/course_materials`,
            {
              method: 'POST',
              headers: jsonHeaders,
              body: JSON.stringify({
                course_id:
                  courseId,
                name:
                  materialName.trim(),
                link:
                  cleanLink,
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
          (
            JSON.parse(
              text
            ) as Material[]
          )[0];

        if (!created) {
          throw new Error(
            'No material was returned.'
          );
        }

        setMaterials(
          (previous) => ({
            ...previous,
            [courseId]: [
              ...(
                previous[
                  courseId
                ] || []
              ),
              created,
            ],
          })
        );

        setOpenCourses(
          (previous) => ({
            ...previous,
            [courseId]:
              true,
          })
        );

        setCreatingItem(false);
        closeAddModal(true);

        return;
      }

      // ========================================================
      // ASSIGNMENT
      // ========================================================

      const databaseDueDate =
        formatDateForDatabase(
          assignmentDueDate
        );

      if (!databaseDueDate) {
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
              course_id:
                courseId,

              name:
                assignmentName.trim(),

              description:
                assignmentDescription.trim(),

              due_date:
                databaseDueDate,
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
        (
          JSON.parse(
            text
          ) as Assignment[]
        )[0];

      if (!created) {
        throw new Error(
          'No assignment was returned.'
        );
      }

      setAssignments(
        (previous) => ({
          ...previous,
          [courseId]: [
            ...(
              previous[
                courseId
              ] || []
            ),
            created,
          ],
        })
      );

      if (created.id) {
        setSubmissions(
          (previous) => ({
            ...previous,
            [created.id!]: [],
          })
        );
      }

      setOpenCourses(
        (previous) => ({
          ...previous,
          [courseId]:
            true,
        })
      );

      setCreatingItem(false);
      closeAddModal(true);
    } catch (err) {
      console.error(
        'Error creating item:',
        err
      );

      setCheckingLink(false);

      setLinkCheckError(
        err instanceof Error
          ? err.message
          : 'Failed to add item.'
      );
    } finally {
      setCreatingItem(false);
    }
  };

  // ============================================================
  // GET CURRENT STUDENT SUBMISSION
  // ============================================================

  const getStudentSubmission = (
    assignmentId: string
  ) => {
    if (
      !studentFullName.trim()
    ) {
      return undefined;
    }

    return (
      submissions[
        assignmentId
      ] || []
    ).find(
      (submission) =>
        submission.nickname
          .trim()
          .toLowerCase() ===
        studentFullName
          .trim()
          .toLowerCase()
    );
  };

  // ============================================================
  // OPEN STUDENT SUBMISSION
  // ============================================================

  const openSubmissionModal = (
    assignment: Assignment
  ) => {
    if (
      isTeacher ||
      !assignment.id
    ) {
      return;
    }

    if (
      !studentFullName.trim()
    ) {
      alert(
        'Your account full name could not be found. Please sign in again.'
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
    setCheckingLink(false);
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
      !studentFullName.trim() ||
      !submissionClass.trim() ||
      !submissionLink.trim() ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

    const assignmentId =
      selectedAssignment.id;

    // First check local state.
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

      // --------------------------------------------------------
      // SECOND DUPLICATE CHECK
      // --------------------------------------------------------

      const existing =
        await getJson<Submission[]>(
          `${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(
            assignmentId
          )}&nickname=eq.${encodeURIComponent(
            studentFullName.trim()
          )}&select=*`
        );

      if (
        existing.length > 0
      ) {
        setSubmissions(
          (previous) => ({
            ...previous,
            [assignmentId]: [
              ...(
                previous[
                  assignmentId
                ] || []
              ),
              ...existing.filter(
                (remote) =>
                  !(
                    previous[
                      assignmentId
                    ] || []
                  ).some(
                    (local) =>
                      local.id ===
                      remote.id
                  )
              ),
            ],
          })
        );

        throw new Error(
          'You have already submitted this assignment.'
        );
      }

      const checkResult =
        await checkMaterialLink(
          cleanLink
        );

      setCheckingLink(false);

      if (
        !checkResult.safe
      ) {
        throw new Error(
          checkResult.reason ||
            'This link does not appear appropriate for an educational platform.'
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

              // Always account name.
              nickname:
                studentFullName.trim(),

              // Manually entered class.
              class:
                submissionClass
                  .trim()
                  .toUpperCase(),

              link:
                cleanLink,

              grade:
                null,
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
        (
          JSON.parse(
            text
          ) as Submission[]
        )[0];

      if (!created) {
        throw new Error(
          'No submission was returned.'
        );
      }

      setSubmissions(
        (previous) => ({
          ...previous,
          [assignmentId]: [
            ...(
              previous[
                assignmentId
              ] || []
            ),
            created,
          ],
        })
      );

      setSubmittingAssignment(
        false
      );

      closeSubmissionModal(
        true
      );

      alert(
        'Assignment submitted successfully!'
      );
    } catch (err) {
      console.error(
        'Error submitting assignment:',
        err
      );

      setCheckingLink(false);

      setLinkCheckError(
        err instanceof Error
          ? err.message
          : 'Failed to submit assignment.'
      );
    } finally {
      setSubmittingAssignment(
        false
      );
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
      !studentFullName.trim() ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

    const existing =
      getStudentSubmission(
        assignment.id
      );

    if (!existing?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        'Undo your submission? Your teacher will no longer see it, and you will be able to submit again.'
      );

    if (!confirmed) {
      return;
    }

    setUndoingSubmission(
      true
    );

    try {
      await deleteFrom(
        `${supabaseUrl}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(
          existing.id
        )}`
      );

      setSubmissions(
        (previous) => ({
          ...previous,
          [assignment.id!]: (
            previous[
              assignment.id!
            ] || []
          ).filter(
            (submission) =>
              submission.id !==
              existing.id
          ),
        })
      );

      alert(
        'Submission undone. You can submit the assignment again.'
      );
    } catch (err) {
      console.error(
        'Error undoing submission:',
        err
      );

      alert(
        'Failed to undo submission.'
      );
    } finally {
      setUndoingSubmission(
        false
      );
    }
  };

  // ============================================================
  // TOGGLE ASSIGNMENT
  // ============================================================

  const toggleAssignment = async (
    assignmentId: string
  ) => {
    setOpenAssignments(
      (previous) => ({
        ...previous,
        [assignmentId]:
          !previous[
            assignmentId
          ],
      })
    );

    if (
      isTeacher &&
      !submissions[
        assignmentId
      ] &&
      supabaseUrl &&
      supabaseAnonKey
    ) {
      try {
        const data =
          await getJson<Submission[]>(
            `${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(
              assignmentId
            )}&select=*&order=created_at.asc`
          );

        setSubmissions(
          (previous) => ({
            ...previous,
            [assignmentId]:
              data,
          })
        );
      } catch (err) {
        console.error(
          'Error loading submissions:',
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
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return;
    }

    const rawGrade =
      gradeInputs[
        submission.id
      ] ??
      String(
        submission.grade ??
          ''
      );

    const grade =
      Number(rawGrade);

    if (
      rawGrade === '' ||
      !Number.isInteger(
        grade
      ) ||
      grade < 0 ||
      grade > 100
    ) {
      alert(
        'Grade must be a whole number between 0 and 100.'
      );

      return;
    }

    setSavingGrades(
      (previous) => ({
        ...previous,
        [submission.id!]:
          true,
      })
    );

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

      const updated =
        JSON.parse(
          text
        ) as Submission[];

      const updatedGrade =
        updated[0]?.grade ??
        grade;

      setSubmissions(
        (previous) => ({
          ...previous,
          [submission.assignment_id]:
            (
              previous[
                submission.assignment_id
              ] || []
            ).map(
              (item) =>
                item.id ===
                submission.id
                  ? {
                      ...item,
                      grade:
                        updatedGrade,
                    }
                  : item
            ),
        })
      );

      setGradeInputs(
        (previous) => ({
          ...previous,
          [submission.id!]:
            String(
              updatedGrade
            ),
        })
      );
    } catch (err) {
      console.error(
        'Error saving grade:',
        err
      );

      alert(
        'Failed to save grade.'
      );
    } finally {
      setSavingGrades(
        (previous) => ({
          ...previous,
          [submission.id!]:
            false,
        })
      );
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

  if (
    error ||
    !classData
  ) {
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

          <Card className="bg-card">
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 size-10 text-muted-foreground" />

              <h1 className="text-xl font-semibold text-foreground">
                {error ||
                  'Class not found'}
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

  const dashboardUrl =
    isTeacher
      ? '/dashboard/teacher'
      : '/dashboard/student';

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto space-y-8 px-6 py-8">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={
                dashboardUrl
              }
            >
              <Button
                variant="ghost"
                className="-ml-3 mb-3 gap-2"
              >
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Button>
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {
                classData.class_name
              }
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>
                School:{' '}
                {
                  classData.school_name
                }
              </span>

              <span className="hidden sm:inline">
                •
              </span>

              <span className="flex items-center gap-1.5">
                Code:{' '}

                <span className="font-mono font-semibold text-primary">
                  {
                    classData.code
                  }
                </span>

                {isTeacher && (
                  <button
                    type="button"
                    onClick={
                      handleCopyCode
                    }
                    title={
                      copiedCode
                        ? 'Copied!'
                        : 'Copy join code'
                    }
                    aria-label={
                      copiedCode
                        ? 'Copied join code'
                        : 'Copy join code'
                    }
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
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
                setIsCourseModalOpen(
                  true
                )
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
            <h2 className="text-xl font-semibold text-foreground">
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
            <Card className="bg-card">
              <CardContent className="py-10 text-center">
                <BookOpen className="mx-auto mb-4 size-10 text-muted-foreground" />

                <h3 className="font-semibold text-foreground">
                  No courses yet
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {isTeacher
                    ? 'Create your first course to start adding learning materials.'
                    : 'Your teacher has not created any courses yet.'}
                </p>

                {isTeacher && (
                  <Button
                    onClick={() =>
                      setIsCourseModalOpen(
                        true
                      )
                    }
                    className="mt-5 gap-2"
                  >
                    <PlusCircle size={16} />
                    Create Course
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {courses.map(
                (
                  course,
                  index
                ) => {
                  const courseId =
                    course.id ||
                    `course-${index}`;

                  const isOpen =
                    !!openCourses[
                      courseId
                    ];

                  const courseMaterials =
                    course.id
                      ? materials[
                          course.id
                        ] || []
                      : [];

                  const courseAssignments =
                    course.id
                      ? assignments[
                          course.id
                        ] || []
                      : [];

                  return (
                    <Card
                      key={courseId}
                      className="overflow-hidden bg-card transition hover:border-primary/40"
                    >
                      {/* COURSE HEADER */}

                      <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleCourse(
                                courseId
                              )
                            }
                            className="size-8 shrink-0 p-0 text-primary hover:bg-primary/10"
                            aria-label={
                              isOpen
                                ? 'Collapse course'
                                : 'Expand course'
                            }
                          >
                            {isOpen ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </Button>

                          <CardTitle className="flex min-w-0 items-center gap-2 text-base font-medium">
                            <BookOpen className="size-4 shrink-0 text-primary" />

                            <span className="truncate">
                              {
                                course.course_name
                              }
                            </span>
                          </CardTitle>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {isTeacher &&
                            course.id && (
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
                                <PlusCircle
                                  size={
                                    15
                                  }
                                />
                                Add
                              </Button>
                            )}

                          {isTeacher &&
                            course.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteCourse(
                                    course.id!
                                  )
                                }
                                className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                                aria-label="Delete course"
                              >
                                <Trash2 size={15} />
                              </Button>
                            )}
                        </div>
                      </CardHeader>

                      {/* COURSE CONTENT */}

                      {isOpen && (
                        <CardContent className="space-y-8 border-t border-border pt-5">

                          {/* MATERIALS */}

                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                Materials
                              </h3>

                              <p className="text-xs text-muted-foreground">
                                Learning resources
                                for this course.
                              </p>
                            </div>

                            {courseMaterials.length ===
                            0 ? (
                              <div className="rounded-lg border border-dashed border-border p-5">
                                <p className="text-sm text-muted-foreground">
                                  {isTeacher
                                    ? 'No materials have been added yet. Click "Add" at the top of the course.'
                                    : 'No materials have been added to this course yet.'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {courseMaterials.map(
                                  (
                                    material,
                                    materialIndex
                                  ) => (
                                    <div
                                      key={
                                        material.id ||
                                        `${courseId}-material-${materialIndex}`
                                      }
                                      className="group flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary/50 hover:bg-primary/5"
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
                                          <p className="truncate font-medium text-foreground">
                                            {
                                              material.name
                                            }
                                          </p>

                                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
                                                course.id!
                                              )
                                            }
                                            className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                                            aria-label="Delete material"
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
                              <h3 className="font-semibold text-foreground">
                                Assignments
                              </h3>

                              <p className="text-xs text-muted-foreground">
                                {isTeacher
                                  ? 'Click an assignment to view submissions and grades.'
                                  : 'Click an assignment to submit your work.'}
                              </p>
                            </div>

                            {courseAssignments.length ===
                            0 ? (
                              <div className="rounded-lg border border-dashed border-border p-5">
                                <p className="text-sm text-muted-foreground">
                                  {isTeacher
                                    ? 'No assignments have been created yet. Click "Add" and choose Assignment.'
                                    : 'No assignments have been created for this course yet.'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {courseAssignments.map(
                                  (
                                    assignment
                                  ) => {
                                    const assignmentId =
                                      assignment.id!;

                                    const isAssignmentOpen =
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
                                        className="overflow-hidden rounded-lg border border-border bg-background"
                                      >

                                        {/* ASSIGNMENT BUTTON */}

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
                                          className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-primary/5 disabled:cursor-wait"
                                        >
                                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                            <ClipboardList className="size-5 text-primary" />
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                              <p className="font-semibold text-foreground">
                                                {
                                                  assignment.name
                                                }
                                              </p>

                                              {isTeacher &&
                                                (
                                                  isAssignmentOpen ? (
                                                    <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                                                  ) : (
                                                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                                                  )
                                                )}
                                            </div>

                                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                              {
                                                assignment.description
                                              }
                                            </p>

                                            {/* DUE DATE */}

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
                                                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-primary">
                                                  <span className="flex items-center gap-1">
                                                    <RotateCcw className="size-3.5" />
                                                    Submitted
                                                  </span>

                                                  <span className="text-muted-foreground">
                                                    •
                                                  </span>

                                                  <span>
                                                    Click to undo submission
                                                  </span>
                                                </div>
                                              )}

                                            {!isTeacher &&
                                              !studentSubmission && (
                                                <p className="mt-2 text-xs font-medium text-primary">
                                                  Click to submit →
                                                </p>
                                              )}
                                          </div>
                                        </button>

                                        {/* TEACHER SUBMISSIONS */}

                                        {isTeacher &&
                                          isAssignmentOpen && (
                                            <div className="border-t border-border p-4">
                                              {assignmentSubmissions.length ===
                                              0 ? (
                                                <div className="rounded-lg border border-dashed border-border p-5 text-center">
                                                  <ClipboardList className="mx-auto mb-2 size-7 text-muted-foreground" />

                                                  <p className="text-sm text-muted-foreground">
                                                    No students have submitted this assignment yet.
                                                  </p>
                                                </div>
                                              ) : (
                                                <div className="overflow-x-auto rounded-lg border border-border">
                                                  <table className="w-full min-w-[700px] text-sm">
                                                    <thead>
                                                      <tr className="border-b border-border bg-muted/40">
                                                        <th className="px-4 py-3 text-left font-semibold text-foreground">
                                                          Name
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-foreground">
                                                          Class
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-foreground">
                                                          Submission
                                                        </th>

                                                        <th className="px-4 py-3 text-right font-semibold text-foreground">
                                                          Grade
                                                        </th>
                                                      </tr>
                                                    </thead>

                                                    <tbody>
                                                      {[
                                                        ...assignmentSubmissions,
                                                      ]
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
                                                                sensitivity:
                                                                  'base',
                                                              }
                                                            ) ||
                                                            a.nickname.localeCompare(
                                                              b.nickname,
                                                              undefined,
                                                              {
                                                                sensitivity:
                                                                  'base',
                                                              }
                                                            )
                                                        )
                                                        .map(
                                                          (
                                                            submission
                                                          ) => {
                                                            const currentGrade =
                                                              gradeInputs[
                                                                submission.id!
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
                                                                className="border-b border-border last:border-0"
                                                              >
                                                                <td className="px-4 py-3 font-medium text-foreground">
                                                                  {
                                                                    submission.nickname
                                                                  }
                                                                </td>

                                                                <td className="px-4 py-3 font-medium uppercase text-muted-foreground">
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
                                                                              previous
                                                                            ) => ({
                                                                              ...previous,
                                                                              [submission.id!]:
                                                                                '',
                                                                            })
                                                                          );

                                                                          return;
                                                                        }

                                                                        let numeric =
                                                                          Number(
                                                                            value
                                                                          );

                                                                        if (
                                                                          !Number.isFinite(
                                                                            numeric
                                                                          )
                                                                        ) {
                                                                          return;
                                                                        }

                                                                        // HARD LIMIT:
                                                                        // Never allow >100.
                                                                        if (
                                                                          numeric >
                                                                          100
                                                                        ) {
                                                                          numeric =
                                                                            100;
                                                                        }

                                                                        if (
                                                                          numeric <
                                                                          0
                                                                        ) {
                                                                          numeric =
                                                                            0;
                                                                        }

                                                                        value =
                                                                          String(
                                                                            Math.trunc(
                                                                              numeric
                                                                            )
                                                                          );

                                                                        setGradeInputs(
                                                                          (
                                                                            previous
                                                                          ) => ({
                                                                            ...previous,
                                                                            [submission.id!]:
                                                                              value,
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
                                                                      onPaste={(
                                                                        e
                                                                      ) => {
                                                                        const pasted =
                                                                          e.clipboardData.getData(
                                                                            'text'
                                                                          );

                                                                        const numeric =
                                                                          Number(
                                                                            pasted
                                                                          );

                                                                        if (
                                                                          !Number.isInteger(
                                                                            numeric
                                                                          ) ||
                                                                          numeric <
                                                                            0 ||
                                                                          numeric >
                                                                            100
                                                                        ) {
                                                                          e.preventDefault();
                                                                        }
                                                                      }}
                                                                      placeholder="—"
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
                                                                          submission.id!
                                                                        ]
                                                                      }
                                                                      className="gap-1.5"
                                                                    >
                                                                      {savingGrades[
                                                                        submission.id!
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

                                        {/* DELETE ASSIGNMENT */}

                                        {isTeacher && (
                                          <div className="flex justify-end border-t border-border px-4 py-2">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleDeleteAssignment(
                                                  assignmentId,
                                                  course.id!
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
                }
              )}
            </div>
          )}
        </section>
      </main>

      {/* =========================================================
          CREATE COURSE MODAL
          ========================================================= */}

      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Create New Course
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Add a course to{' '}
                  {
                    classData.class_name
                  }.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsCourseModalOpen(
                    false
                  )
                }
                disabled={
                  creatingCourse
                }
                className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
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
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Course Name
                </label>

                <Input
                  type="text"
                  placeholder="e.g. Mathematics - Module 1"
                  value={
                    courseName
                  }
                  onChange={(e) =>
                    setCourseName(
                      e.target.value
                    )
                  }
                  required
                  autoFocus
                  className="h-11 bg-background"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                  className="h-11 w-1/2"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    creatingCourse ||
                    !courseName.trim()
                  }
                  className="h-11 w-1/2"
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

      {/* =========================================================
          ADD MATERIAL / ASSIGNMENT MODAL
          ========================================================= */}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
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
                onClick={
                  closeAddModal
                }
                disabled={
                  creatingItem
                }
                className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
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
              {/* TYPE */}

              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Select type
                </label>

                <select
                  value={
                    addType
                  }
                  onChange={(e) => {
                    setAddType(
                      e.target
                        .value as AddType
                    );

                    setLinkCheckError(
                      null
                    );

                    // Give assignment a default
                    // due date when switching
                    // to Assignment.
                    if (
                      e.target
                        .value ===
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
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="material">
                    Material
                  </option>

                  <option value="assignment">
                    Assignment
                  </option>
                </select>
              </div>

              {/* MATERIAL */}

              {addType ===
                'material' && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Material Name
                    </label>

                    <Input
                      type="text"
                      placeholder="e.g. Chapter 1 Notes"
                      value={
                        materialName
                      }
                      onChange={(e) => {
                        setMaterialName(
                          e.target
                            .value
                        );

                        setLinkCheckError(
                          null
                        );
                      }}
                      required
                      autoFocus
                      disabled={
                        creatingItem
                      }
                      className="h-11 bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Material Link
                    </label>

                    <Input
                      type="url"
                      placeholder="https://example.com/material"
                      value={
                        materialLink
                      }
                      onChange={(e) => {
                        setMaterialLink(
                          e.target
                            .value
                        );

                        setLinkCheckError(
                          null
                        );
                      }}
                      required
                      disabled={
                        creatingItem
                      }
                      className="h-11 bg-background"
                    />

                    <p className="text-xs text-muted-foreground">
                      The link will be
                      automatically checked
                      before it is published.
                    </p>
                  </div>
                </>
              )}

              {/* ASSIGNMENT */}

              {addType ===
                'assignment' && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Assignment Name
                    </label>

                    <Input
                      type="text"
                      placeholder="e.g. Create a science poster"
                      value={
                        assignmentName
                      }
                      onChange={(e) =>
                        setAssignmentName(
                          e.target
                            .value
                        )
                      }
                      required
                      autoFocus
                      disabled={
                        creatingItem
                      }
                      className="h-11 bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Description
                    </label>

                    <textarea
                      value={
                        assignmentDescription
                      }
                      onChange={(e) =>
                        setAssignmentDescription(
                          e.target
                            .value
                        )
                      }
                      placeholder="Explain what students need to do..."
                      required
                      disabled={
                        creatingItem
                      }
                      rows={5}
                      className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* DUE DATE */}

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Due Date
                    </label>

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
                      disabled={
                        creatingItem
                      }
                      className="h-11 bg-background"
                    />

                    <p className="text-xs text-muted-foreground">
                      Enter the due date in
                      DD/MM/YYYY format.
                      The due date must be
                      today or later.
                    </p>

                    {assignmentDueDate.length ===
                      10 &&
                      !isDueDateValid(
                        assignmentDueDate
                      ) && (
                        <p className="text-xs font-medium text-destructive">
                          The due date must be
                          today or a future
                          date.
                        </p>
                      )}
                  </div>
                </>
              )}

              {/* ERROR */}

              {linkCheckError && (
                <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />

                  <div>
                    <p className="font-medium text-destructive">
                      {addType ===
                      'assignment'
                        ? 'Assignment not allowed'
                        : 'Link not allowed'}
                    </p>

                    <p className="mt-1 text-sm text-destructive/80">
                      {
                        linkCheckError
                      }
                    </p>

                    <p className="mt-2 text-xs text-destructive/70">
                      The item was not added
                      to the course.
                    </p>
                  </div>
                </div>
              )}

              {/* CHECKING */}

              {checkingLink && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <Loader2 className="size-5 animate-spin text-primary" />

                  <div>
                    <p className="font-medium text-foreground">
                      Checking link...
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Making sure this
                      material is appropriate
                      for students.
                    </p>
                  </div>
                </div>
              )}

              {/* SAFETY */}

              {addType ===
                'material' &&
                !checkingLink &&
                !linkCheckError && (
                  <div className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

                    <div>
                      <p className="font-medium text-foreground">
                        Link safety check
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Links are checked
                        before being
                        published to
                        students.
                      </p>
                    </div>
                  </div>
                )}

              {/* BUTTONS */}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    closeAddModal
                  }
                  disabled={
                    creatingItem
                  }
                  className="h-11 w-1/2"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    creatingItem ||
                    checkingLink ||

                    (
                      addType ===
                        'material' &&
                      (
                        !materialName.trim() ||
                        !materialLink.trim()
                      )
                    ) ||

                    (
                      addType ===
                        'assignment' &&
                      (
                        !assignmentName.trim() ||
                        !assignmentDescription.trim() ||
                        !assignmentDueDate.trim() ||
                        !isDueDateValid(
                          assignmentDueDate
                        )
                      )
                    )
                  }
                  className="h-11 w-1/2"
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

      {/* =========================================================
          STUDENT SUBMISSION MODAL
          ========================================================= */}

      {isSubmissionModalOpen &&
        selectedAssignment && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">

              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Submit Assignment
                  </h3>

                  <p className="mt-1 text-sm font-medium text-foreground">
                    {
                      selectedAssignment.name
                    }
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                    {
                      selectedAssignment.description
                    }
                  </p>

                  {selectedAssignment.due_date && (
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      Due:{' '}
                      <span className="text-foreground">
                        {formatDateForDisplay(
                          selectedAssignment.due_date
                        )}
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    closeSubmissionModal
                  }
                  disabled={
                    submittingAssignment
                  }
                  className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
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

                {/* FULL NAME */}

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Full Name
                  </label>

                  <Input
                    type="text"
                    value={
                      studentFullName
                    }
                    readOnly
                    disabled
                    className="h-11 bg-muted"
                  />

                  <p className="text-xs text-muted-foreground">
                    Your name is taken from
                    your account and cannot
                    be changed.
                  </p>
                </div>

                {/* CLASS */}

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Class
                  </label>

                  <Input
                    type="text"
                    placeholder="e.g. 8A"
                    value={
                      submissionClass
                    }
                    onChange={(e) =>
                      setSubmissionClass(
                        e.target.value
                          .toUpperCase()
                      )
                    }
                    required
                    disabled={
                      submittingAssignment
                    }
                    className="h-11 bg-background uppercase"
                  />

                  <p className="text-xs text-muted-foreground">
                    Enter your class, such as
                    8A, 8B, or 8F.
                  </p>
                </div>

                {/* LINK */}

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">
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
                        e.target
                          .value
                      );

                      setLinkCheckError(
                        null
                      );
                    }}
                    required
                    disabled={
                      submittingAssignment
                    }
                    className="h-11 bg-background"
                  />

                  <p className="text-xs text-muted-foreground">
                    Paste a link to your
                    video, poster, document,
                    or other work.
                  </p>
                </div>

                {/* ERROR */}

                {linkCheckError && (
                  <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />

                    <div>
                      <p className="font-medium text-destructive">
                        Submission not allowed
                      </p>

                      <p className="mt-1 text-sm text-destructive/80">
                        {
                          linkCheckError
                        }
                      </p>

                      <p className="mt-2 text-xs text-destructive/70">
                        Your assignment was
                        not submitted.
                      </p>
                    </div>
                  </div>
                )}

                {/* CHECKING */}

                {checkingLink && (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <Loader2 className="size-5 animate-spin text-primary" />

                    <div>
                      <p className="font-medium text-foreground">
                        Checking link...
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Checking the
                        submission before
                        sending it to your
                        teacher.
                      </p>
                    </div>
                  </div>
                )}

                {/* BUTTONS */}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      closeSubmissionModal
                    }
                    disabled={
                      submittingAssignment
                    }
                    className="h-11 w-1/2"
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
                      !studentFullName.trim()
                    }
                    className="h-11 w-1/2"
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
