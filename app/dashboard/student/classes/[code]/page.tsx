'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  FileText,
  Loader2,
  ArrowLeft,
  PlusCircle,
  BookOpen,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const code = params.code as string;

  const [classData, setClassData] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [dashboardUrl, setDashboardUrl] = useState('/dashboard/student');
  const [isTeacher, setIsTeacher] = useState(false);

  // Course creation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Track which course dropdowns are open
  const [openDropdowns, setOpenDropdowns] = useState<
    Record<string, boolean>
  >({});

  // Materials
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});

  // Material creation modal
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [submittingMaterial, setSubmittingMaterial] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /*
   * Determine whether the current user is a teacher
   */
  useEffect(() => {
    try {
      let teacherDetected = false;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (
          key &&
          (key.includes('auth') ||
            key.includes('supabase') ||
            key === 'current_user')
        ) {
          const raw = localStorage.getItem(key);

          if (raw) {
            try {
              const parsed = JSON.parse(raw);

              const role =
                parsed?.user?.user_metadata?.role ||
                parsed?.user?.role ||
                parsed?.role;

              if (
                role === 'teacher' ||
                window.location.pathname.includes('/teacher')
              ) {
                teacherDetected = true;
                break;
              }
            } catch {
              // Ignore invalid localStorage JSON
            }
          }
        }
      }

      if (
        window.location.href.includes('/teacher') ||
        localStorage.getItem('user_role') === 'teacher'
      ) {
        teacherDetected = true;
      }

      setIsTeacher(teacherDetected);
      setDashboardUrl(
        teacherDetected ? '/dashboard/teacher' : '/dashboard/student'
      );
    } catch (e) {
      console.error('Error determining role', e);
    }
  }, []);

  /*
   * Fetch class, courses, and materials
   */
  useEffect(() => {
    async function fetchClassAndCourses() {
      if (!code || !supabaseUrl || !supabaseAnonKey) return;

      try {
        /*
         * Fetch class
         */
        const response = await fetch(
          `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(
            code
          )}&select=*`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data.length > 0) {
            setClassData(data[0]);
          }
        }

        /*
         * Fetch courses
         */
        const coursesRes = await fetch(
          `${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(
            code
          )}&select=*`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (coursesRes.ok) {
          const courseList: Course[] = await coursesRes.json();

          setCourses(courseList);

          /*
           * Fetch materials for every course
           *
           * Materials are expected to be stored in:
           * course_materials
           *
           * with:
           * id
           * course_id
           * name
           * link
           */
          const materialMap: Record<string, Material[]> = {};

          for (const course of courseList) {
            if (!course.id) continue;

            try {
              const materialsRes = await fetch(
                `${supabaseUrl}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(
                  course.id
                )}&select=*&order=id.asc`,
                {
                  headers: {
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${supabaseAnonKey}`,
                  },
                }
              );

              if (materialsRes.ok) {
                const courseMaterials: Material[] =
                  await materialsRes.json();

                materialMap[course.id] = courseMaterials;
              } else {
                materialMap[course.id] = [];
              }
            } catch (materialError) {
              console.error(
                `Error fetching materials for course ${course.id}`,
                materialError
              );

              materialMap[course.id] = [];
            }
          }

          setMaterials(materialMap);
        }
      } catch (err) {
        console.error('Error fetching class details and courses', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClassAndCourses();
  }, [code, supabaseUrl, supabaseAnonKey]);

  /*
   * Create a new course
   */
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!courseName.trim()) return;
    if (!supabaseUrl || !supabaseAnonKey) return;

    setSubmitting(true);

    const newCourseData = {
      course_name: courseName.trim(),
      class_code: code,
    };

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
          body: JSON.stringify(newCourseData),
        }
      );

      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(`Failed to create course: ${responseBody}`);
      }

      const createdCourse = JSON.parse(responseBody);

      if (createdCourse?.[0]) {
        setCourses((prev) => [...prev, createdCourse[0]]);
      }

      setCourseName('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating course', err);
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Delete a course
   */
  const handleDeleteCourse = async (courseId: string) => {
    if (!supabaseUrl || !supabaseAnonKey) return;

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

      if (response.ok) {
        setCourses((prev) =>
          prev.filter((course) => course.id !== courseId)
        );

        setMaterials((prev) => {
          const updated = { ...prev };
          delete updated[courseId];
          return updated;
        });
      }
    } catch (err) {
      console.error('Error deleting course', err);
    }
  };

  /*
   * Toggle course dropdown
   */
  const toggleDropdown = (courseId: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  /*
   * Open material creation modal
   */
  const openMaterialModal = (course: Course) => {
    setSelectedCourse(course);
    setMaterialName('');
    setMaterialLink('');
    setIsMaterialModalOpen(true);
  };

  /*
   * Close material creation modal
   */
  const closeMaterialModal = () => {
    if (submittingMaterial) return;

    setIsMaterialModalOpen(false);
    setSelectedCourse(null);
    setMaterialName('');
    setMaterialLink('');
  };

  /*
   * Create a material
   */
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourse?.id) {
      console.error('Cannot create material: course has no ID.');
      return;
    }

    if (!materialName.trim() || !materialLink.trim()) {
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables are missing.');
      return;
    }

    setSubmittingMaterial(true);

    const newMaterialData = {
      course_id: selectedCourse.id,
      name: materialName.trim(),
      link: materialLink.trim(),
    };

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
          body: JSON.stringify(newMaterialData),
        }
      );

      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(
          `Failed to create material: ${responseBody}`
        );
      }

      const createdMaterialResponse = JSON.parse(responseBody);

      const createdMaterial: Material =
        createdMaterialResponse?.[0];

      if (!createdMaterial) {
        throw new Error('Material was created but no data was returned.');
      }

      /*
       * Add the newly created material to the correct course
       * without needing to refresh the page.
       */
      setMaterials((prev) => ({
        ...prev,
        [selectedCourse.id!]: [
          ...(prev[selectedCourse.id!] || []),
          createdMaterial,
        ],
      }));

      /*
       * Keep the course dropdown open after creating material.
       */
      setOpenDropdowns((prev) => ({
        ...prev,
        [selectedCourse.id!]: true,
      }));

      closeMaterialModal();
    } catch (err) {
      console.error('Error creating material', err);
    } finally {
      setSubmittingMaterial(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href={dashboardUrl}>
              <Button variant="ghost" className="gap-2 mb-2">
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Button>
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {classData
                ? classData.class_name
                : `Class Code: ${code}`}
            </h1>

            <p className="text-muted-foreground">
              School: {classData?.school_name || 'N/A'}
            </p>
          </div>

          {/* Create Course - Teacher Only */}
          {isTeacher && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <PlusCircle size={18} />
              Create new course
            </Button>
          )}
        </div>

        {/* Courses */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Courses
          </h2>

          {courses.length === 0 ? (
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Teacher Announcements & Materials
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Teacher announcements, materials, and quizzes for
                  this class will appear here. No courses created yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => {
                const cId = course.id || course.course_name;
                const isOpen = !!openDropdowns[cId];

                const courseMaterials = course.id
                  ? materials[course.id] || []
                  : [];

                return (
                  <Card
                    key={cId}
                    className="bg-card hover:border-primary/50 transition w-full"
                  >
                    {/* Course Header */}
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        {/* Dropdown Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDropdown(cId)}
                          className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                        >
                          {isOpen ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </Button>

                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <BookOpen className="size-4 text-primary" />
                          {course.course_name}
                        </CardTitle>
                      </div>

                      {/* Delete Course - Teacher Only */}
                      {isTeacher && course.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteCourse(course.id!)
                          }
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </CardHeader>

                    {/* Expanded Course Content */}
                    {isOpen && (
                      <CardContent className="border-t border-border pt-4 text-sm space-y-4">
                        {/* Description */}
                        <p className="text-muted-foreground">
                          Course materials, assignments, and lessons
                          for{' '}
                          <span className="text-foreground font-semibold">
                            {course.course_name}
                          </span>{' '}
                          will appear here.
                        </p>

                        {/* Materials Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">
                              Materials
                            </h3>

                            {/* ADD MATERIAL BUTTON */}
                            {isTeacher && course.id && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  openMaterialModal(course)
                                }
                                className="gap-2"
                              >
                                <PlusCircle size={16} />
                                Add material
                              </Button>
                            )}
                          </div>

                          {/* Materials List */}
                          {courseMaterials.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-4">
                              <p className="text-sm text-muted-foreground">
                                No materials have been added to this
                                course yet.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {courseMaterials.map((material) => (
                                <a
                                  key={
                                    material.id ||
                                    `${material.name}-${material.link}`
                                  }
                                  href={material.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary/50 hover:bg-primary/5"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                    <LinkIcon className="size-4 text-primary" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground truncate">
                                      {material.name}
                                    </p>

                                    <p className="text-xs text-muted-foreground truncate">
                                      {material.link}
                                    </p>
                                  </div>
                                </a>
                              ))}
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
        </div>
      </main>

      {/* =========================================================
          CREATE COURSE MODAL
          ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Create New Course
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateCourse}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">
                  Course Name
                </label>

                <Input
                  type="text"
                  placeholder="e.g., Mathematics - Module 1"
                  value={courseName}
                  onChange={(e) =>
                    setCourseName(e.target.value)
                  }
                  required
                  className="bg-background h-11"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 h-11"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 h-11"
                >
                  {submitting ? (
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Add Material
                </h3>

                {selectedCourse && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Adding to {selectedCourse.course_name}
                  </p>
                )}
              </div>

              <button
                onClick={closeMaterialModal}
                className="text-muted-foreground hover:text-foreground"
                type="button"
                disabled={submittingMaterial}
              >
                <X size={20} />
              </button>
            </div>

            {/* Material Form */}
            <form
              onSubmit={handleCreateMaterial}
              className="space-y-4"
            >
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">
                  Name
                </label>

                <Input
                  type="text"
                  placeholder="e.g., Chapter 1 Notes"
                  value={materialName}
                  onChange={(e) =>
                    setMaterialName(e.target.value)
                  }
                  required
                  className="bg-background h-11"
                />
              </div>

              {/* Link */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">
                  Link
                </label>

                <Input
                  type="url"
                  placeholder="https://example.com/material"
                  value={materialLink}
                  onChange={(e) =>
                    setMaterialLink(e.target.value)
                  }
                  required
                  className="bg-background h-11"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeMaterialModal}
                  disabled={submittingMaterial}
                  className="w-1/2 h-11"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    submittingMaterial ||
                    !materialName.trim() ||
                    !materialLink.trim()
                  }
                  className="w-1/2 h-11"
                >
                  {submittingMaterial ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Create Material'
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
