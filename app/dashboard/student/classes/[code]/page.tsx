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
  FileText,
  Link as LinkIcon,
  Loader2,
  PlusCircle,
  Trash2,
  X,
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

export default function ClassDetailsPage() {
  const params = useParams();
  const code = Array.isArray(params.code)
    ? params.code[0]
    : (params.code as string);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isTeacher, setIsTeacher] = useState(false);

  // Create course modal
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Open/closed courses
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>(
    {}
  );

  // Add material modal
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [creatingMaterial, setCreatingMaterial] = useState(false);

  /*
   * ------------------------------------------------------------
   * Detect current user's role
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      let detectedRole = '';

      // First check the simple role key
      const directRole = localStorage.getItem('user_role');

      if (directRole) {
        detectedRole = directRole.toLowerCase();
      }

      // Then check current_user
      const currentUserRaw = localStorage.getItem('current_user');

      if (currentUserRaw) {
        try {
          const currentUser = JSON.parse(currentUserRaw);

          const role =
            currentUser?.role ||
            currentUser?.user?.role ||
            currentUser?.user?.user_metadata?.role ||
            currentUser?.user_metadata?.role;

          if (role) {
            detectedRole = String(role).toLowerCase();
          }
        } catch {
          // Ignore invalid current_user JSON
        }
      }

      // Also inspect Supabase auth-related localStorage entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (!key) continue;

        if (
          key.includes('supabase') ||
          key.includes('auth') ||
          key === 'current_user'
        ) {
          const raw = localStorage.getItem(key);

          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);

            const role =
              parsed?.role ||
              parsed?.user?.role ||
              parsed?.user?.user_metadata?.role ||
              parsed?.user_metadata?.role;

            if (role) {
              detectedRole = String(role).toLowerCase();
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }

      setIsTeacher(detectedRole === 'teacher');
    } catch (err) {
      console.error('Could not determine user role:', err);
      setIsTeacher(false);
    }
  }, []);

  /*
   * ------------------------------------------------------------
   * Fetch class, courses, and materials
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (!code || !supabaseUrl || !supabaseAnonKey) {
      setLoading(false);
      return;
    }

    async function fetchClassData() {
      setLoading(true);
      setError(null);

      try {
        const headers = {
          apikey: supabaseAnonKey!,
          Authorization: `Bearer ${supabaseAnonKey}`,
        };

        /*
         * Fetch class
         */
        const classResponse = await fetch(
          `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
            code
          )}&select=*`,
          {
            headers,
          }
        );

        if (!classResponse.ok) {
          throw new Error('Unable to load class.');
        }

        const classList: ClassData[] = await classResponse.json();

        if (classList.length === 0) {
          setError('Class not found.');
          setClassData(null);
          setCourses([]);
          setMaterials({});
          return;
        }

        setClassData(classList[0]);

        /*
         * Fetch courses
         */
        const coursesResponse = await fetch(
          `${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(
            code
          )}&select=*&order=id.asc`,
          {
            headers,
          }
        );

        if (!coursesResponse.ok) {
          throw new Error('Unable to load courses.');
        }

        const courseList: Course[] = await coursesResponse.json();

        setCourses(courseList);

        /*
         * Fetch materials for each course
         */
        const materialMap: Record<string, Material[]> = {};

        await Promise.all(
          courseList.map(async (course) => {
            if (!course.id) return;

            try {
              const materialResponse = await fetch(
                `${supabaseUrl}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(
                  course.id
                )}&select=*&order=id.asc`,
                {
                  headers,
                }
              );

              if (materialResponse.ok) {
                const data: Material[] = await materialResponse.json();
                materialMap[course.id] = data;
              } else {
                materialMap[course.id] = [];
              }
            } catch {
              materialMap[course.id] = [];
            }
          })
        );

        setMaterials(materialMap);
      } catch (err) {
        console.error('Error loading class:', err);
        setError('Something went wrong while loading this class.');
      } finally {
        setLoading(false);
      }
    }

    fetchClassData();
  }, [code, supabaseUrl, supabaseAnonKey]);

  /*
   * ------------------------------------------------------------
   * Create course
   * ------------------------------------------------------------
   */
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTeacher) return;
    if (!courseName.trim()) return;
    if (!supabaseUrl || !supabaseAnonKey) return;

    setCreatingCourse(true);

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/class_courses`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            course_name: courseName.trim(),
            class_code: code,
          }),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText || 'Failed to create course.');
      }

      const createdCourses: Course[] = JSON.parse(responseText);

      if (createdCourses.length > 0) {
        setCourses((previous) => [
          ...previous,
          createdCourses[0],
        ]);
      }

      setCourseName('');
      setIsCourseModalOpen(false);
    } catch (err) {
      console.error('Error creating course:', err);
      alert('Failed to create course.');
    } finally {
      setCreatingCourse(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Delete course
   * ------------------------------------------------------------
   */
  const handleDeleteCourse = async (courseId: string) => {
    if (!isTeacher) return;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this course?'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/class_courses?id=eq.${encodeURIComponent(
          courseId
        )}`,
        {
          method: 'DELETE',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete course.');
      }

      setCourses((previous) =>
        previous.filter((course) => course.id !== courseId)
      );

      setMaterials((previous) => {
        const updated = { ...previous };
        delete updated[courseId];
        return updated;
      });
    } catch (err) {
      console.error('Error deleting course:', err);
      alert('Failed to delete course.');
    }
  };

  /*
   * ------------------------------------------------------------
   * Toggle course
   * ------------------------------------------------------------
   */
  const toggleCourse = (courseId: string) => {
    setOpenCourses((previous) => ({
      ...previous,
      [courseId]: !previous[courseId],
    }));
  };

  /*
   * ------------------------------------------------------------
   * Open material modal
   * ------------------------------------------------------------
   */
  const openMaterialModal = (course: Course) => {
    if (!isTeacher || !course.id) return;

    setSelectedCourse(course);
    setMaterialName('');
    setMaterialLink('');
    setIsMaterialModalOpen(true);
  };

  /*
   * ------------------------------------------------------------
   * Close material modal
   * ------------------------------------------------------------
   */
  const closeMaterialModal = () => {
    if (creatingMaterial) return;

    setIsMaterialModalOpen(false);
    setSelectedCourse(null);
    setMaterialName('');
    setMaterialLink('');
  };

  /*
   * ------------------------------------------------------------
   * Create material
   * ------------------------------------------------------------
   */
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTeacher) return;
    if (!selectedCourse?.id) return;
    if (!materialName.trim() || !materialLink.trim()) return;
    if (!supabaseUrl || !supabaseAnonKey) return;

    setCreatingMaterial(true);

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/course_materials`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            course_id: selectedCourse.id,
            name: materialName.trim(),
            link: materialLink.trim(),
          }),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          responseText || 'Failed to create material.'
        );
      }

      const createdMaterials: Material[] = JSON.parse(responseText);

      if (createdMaterials.length === 0) {
        throw new Error('No material was returned.');
      }

      const createdMaterial = createdMaterials[0];

      setMaterials((previous) => ({
        ...previous,
        [selectedCourse.id!]: [
          ...(previous[selectedCourse.id!] || []),
          createdMaterial,
        ],
      }));

      // Automatically open the course
      setOpenCourses((previous) => ({
        ...previous,
        [selectedCourse.id!]: true,
      }));

      closeMaterialModal();
    } catch (err) {
      console.error('Error creating material:', err);
      alert('Failed to create material.');
    } finally {
      setCreatingMaterial(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Loading state
   * ------------------------------------------------------------
   */
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

  /*
   * ------------------------------------------------------------
   * Error state
   * ------------------------------------------------------------
   */
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
            <Button variant="ghost" className="gap-2 mb-6">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Button>
          </Link>

          <Card className="bg-card">
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 size-10 text-muted-foreground" />

              <h1 className="text-xl font-semibold text-foreground">
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

  /*
   * ------------------------------------------------------------
   * Main page
   * ------------------------------------------------------------
   */
  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={dashboardUrl}>
              <Button
                variant="ghost"
                className="gap-2 mb-3 -ml-3"
              >
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Button>
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {classData.class_name}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>
                School: {classData.school_name}
              </span>

              <span className="hidden sm:inline">•</span>

              <span>
                Code:{' '}
                <span className="font-mono font-semibold text-primary">
                  {classData.code}
                </span>
              </span>
            </div>
          </div>

          {/* Teacher only */}
          {isTeacher && (
            <Button
              onClick={() => setIsCourseModalOpen(true)}
              className="gap-2"
            >
              <PlusCircle size={18} />
              Create New Course
            </Button>
          )}
        </div>

        {/* Courses */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Courses
            </h2>

            <span className="text-sm text-muted-foreground">
              {courses.length}{' '}
              {courses.length === 1 ? 'course' : 'courses'}
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
                    onClick={() => setIsCourseModalOpen(true)}
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
              {courses.map((course, index) => {
                const courseId =
                  course.id || `course-${index}`;

                const isOpen = !!openCourses[courseId];

                const courseMaterials = course.id
                  ? materials[course.id] || []
                  : [];

                return (
                  <Card
                    key={courseId}
                    className="bg-card overflow-hidden transition hover:border-primary/40"
                  >
                    {/* Course header */}
                    <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCourse(courseId)}
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
                            {course.course_name}
                          </span>
                        </CardTitle>
                      </div>

                      {isTeacher && course.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteCourse(course.id!)
                          }
                          className="size-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                          aria-label="Delete course"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </CardHeader>

                    {/* Course content */}
                    {isOpen && (
                      <CardContent className="space-y-5 border-t border-border pt-5">
                        <p className="text-sm text-muted-foreground">
                          Materials and learning resources for{' '}
                          <span className="font-semibold text-foreground">
                            {course.course_name}
                          </span>
                          .
                        </p>

                        {/* Materials */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-foreground">
                              Materials
                            </h3>

                            {isTeacher && course.id && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  openMaterialModal(course)
                                }
                                className="gap-2"
                              >
                                <PlusCircle size={15} />
                                Add Material
                              </Button>
                            )}
                          </div>

                          {courseMaterials.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-5">
                              <p className="text-sm text-muted-foreground">
                                {isTeacher
                                  ? 'No materials have been added. Click "Add Material" to add one.'
                                  : 'No materials have been added to this course yet.'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {courseMaterials.map(
                                (material, materialIndex) => (
                                  <a
                                    key={
                                      material.id ||
                                      `${courseId}-material-${materialIndex}`
                                    }
                                    href={material.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary/50 hover:bg-primary/5"
                                  >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                      <LinkIcon className="size-4 text-primary" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium text-foreground">
                                        {material.name}
                                      </p>

                                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {material.link}
                                      </p>
                                    </div>

                                    <span className="shrink-0 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                                      Open
                                    </span>
                                  </a>
                                )
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
                  Add a course to {classData.class_name}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                disabled={creatingCourse}
                className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateCourse}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Course Name
                </label>

                <Input
                  type="text"
                  placeholder="e.g. Mathematics - Module 1"
                  value={courseName}
                  onChange={(e) =>
                    setCourseName(e.target.value)
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
                    setIsCourseModalOpen(false)
                  }
                  disabled={creatingCourse}
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
          ADD MATERIAL MODAL
          ========================================================= */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Add Material
                </h3>

                {selectedCourse && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adding to{' '}
                    <span className="font-medium text-foreground">
                      {selectedCourse.course_name}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeMaterialModal}
                disabled={creatingMaterial}
                className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateMaterial}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Material Name
                </label>

                <Input
                  type="text"
                  placeholder="e.g. Chapter 1 Notes"
                  value={materialName}
                  onChange={(e) =>
                    setMaterialName(e.target.value)
                  }
                  required
                  autoFocus
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
                  value={materialLink}
                  onChange={(e) =>
                    setMaterialLink(e.target.value)
                  }
                  required
                  className="h-11 bg-background"
                />

                <p className="text-xs text-muted-foreground">
                  Paste the URL students should use to access
                  this material.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeMaterialModal}
                  disabled={creatingMaterial}
                  className="h-11 w-1/2"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    creatingMaterial ||
                    !materialName.trim() ||
                    !materialLink.trim()
                  }
                  className="h-11 w-1/2"
                >
                  {creatingMaterial ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Add Material'
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
