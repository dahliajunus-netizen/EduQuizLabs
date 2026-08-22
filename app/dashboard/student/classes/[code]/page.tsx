'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Loader2, ArrowLeft, PlusCircle, BookOpen, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ClassDetailsPage() {
  const params = useParams();
  const code = params.code as string;

  const [classData, setClassData] = useState<any>(null);
  const [courses, setCourses] = useState<Array<{ id?: string; course_name: string; class_code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard/student');
  const [isTeacher, setIsTeacher] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Track which course dropdowns are open
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    try {
      let teacherDetected = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase') || key === 'current_user')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const role = parsed?.user?.user_metadata?.role || parsed?.user?.role || parsed?.role;
            if (role === 'teacher' || window.location.pathname.includes('/teacher')) {
              teacherDetected = true;
              break;
            }
          }
        }
      }
      if (window.location.href.includes('/teacher') || localStorage.getItem('user_role') === 'teacher') {
        teacherDetected = true;
      }

      setIsTeacher(teacherDetected);
      setDashboardUrl(teacherDetected ? '/dashboard/teacher' : '/dashboard/student');
    } catch (e) {
      console.error('Error determining role', e);
    }

    async function fetchClassAndCourses() {
      if (!code) return;
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${code}&select=*`,
          {
            headers: {
              'apikey': supabaseAnonKey!,
              'Authorization': `Bearer ${supabaseAnonKey}`,
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setClassData(data[0]);
          }
        }

        const coursesRes = await fetch(
          `${supabaseUrl}/rest/v1/class_courses?class_code=eq.${code}&select=*`,
          {
            headers: {
              'apikey': supabaseAnonKey!,
              'Authorization': `Bearer ${supabaseAnonKey}`,
            }
          }
        );
        if (coursesRes.ok) {
          const courseList = await coursesRes.json();
          setCourses(courseList);
        }
      } catch (err) {
        console.error('Error fetching class details and courses', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClassAndCourses();
  }, [code, supabaseUrl, supabaseAnonKey]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

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
            'apikey': supabaseAnonKey!,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(newCourseData),
        }
      );

      const responseBody = await response.text();
      if (!response.ok) {
        throw new Error(`Failed to create course: ${responseBody}`);
      }

      const createdCourse = JSON.parse(responseBody);
      setCourses([...courses, createdCourse[0]]);
      setCourseName('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating course', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/class_courses?id=eq.${courseId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseAnonKey!,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      if (response.ok) {
        setCourses(courses.filter((c) => c.id !== courseId));
      }
    } catch (err) {
      console.error('Error deleting course', err);
    }
  };

  const toggleDropdown = (courseId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
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
        <div className="flex items-center justify-between">
          <div>
            <Link href={dashboardUrl}>
              <Button variant="ghost" className="gap-2 mb-2">
                <ArrowLeft className="size-4" /> Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {classData ? classData.class_name : `Class Code: ${code}`}
            </h1>
            <p className="text-muted-foreground">School: {classData?.school_name || 'N/A'}</p>
          </div>

          {isTeacher && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <PlusCircle size={18} /> Create new course
            </Button>
          )}
        </div>

        {/* Full-width Course Rows */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Courses</h2>
          {courses.length === 0 ? (
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Teacher Announcements & Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Teacher announcements, materials, and quizzes for this class will appear here. No courses created yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => {
                const cId = course.id || course.course_name;
                const isOpen = !!openDropdowns[cId];

                return (
                  <Card key={cId} className="bg-card hover:border-primary/50 transition w-full">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        {/* Green Circle Area: Dropdown Toggle Button */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleDropdown(cId)}
                          className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                        >
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </Button>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <BookOpen className="size-4 text-primary" /> {course.course_name}
                        </CardTitle>
                      </div>

                      {isTeacher && course.id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteCourse(course.id!)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </CardHeader>

                    {/* Expandable Dropdown Content */}
                    {isOpen && (
                      <CardContent className="border-t border-border pt-4 text-sm text-muted-foreground space-y-2">
                        <p>Course materials, assignments, and lessons for <span className="text-foreground font-semibold">{course.course_name}</span> will appear here.</p>
                      </CardContent>
                    )}
                  </CardCard>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Create New Course</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">Course Name</label>
                <Input
                  type="text"
                  placeholder="e.g., Mathematics - Module 1"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
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
                <Button type="submit" disabled={submitting} className="w-1/2 h-11">
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Create Course'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
