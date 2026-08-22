'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useLanguage } from '@/components/language-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  BookOpen,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';

type TeacherClass = {
  id?: string;
  class_name: string;
  school_name: string;
  code: string;
  teacher_id?: string;
};

export default function TeacherDashboardPage() {
  const { t } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Use a dedicated fallback UUID if localStorage is empty
  const FALLBACK_TEACHER_ID =
    '32b60aea-9c8f-4100-9999-999999999999';

  const [currentUserId, setCurrentUserId] =
    useState<string>(FALLBACK_TEACHER_ID);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    async function initTeacherData() {
      try {
        let activeId = FALLBACK_TEACHER_ID;

        if (typeof window !== 'undefined') {
          const rawActive =
            localStorage.getItem('current_user');

          if (rawActive) {
            try {
              const parsed = JSON.parse(rawActive);

              if (parsed?.id) {
                activeId = parsed.id;
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }

        setCurrentUserId(activeId);

        // Fetch classes strictly belonging to this teacher's ID
        const response = await fetch(
          `${supabaseUrl}/rest/v1/teacher_classes?teacher_id=eq.${activeId}&select=*`,
          {
            headers: {
              apikey: supabaseAnonKey!,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setTeacherClasses(data);
        }
      } catch (err) {
        console.error(
          'Error fetching teacher classes',
          err
        );
      } finally {
        setLoading(false);
      }
    }

    initTeacherData();
  }, [supabaseUrl, supabaseAnonKey]);

  const handleCreateClass = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !className.trim() ||
      !schoolName.trim()
    ) {
      return;
    }

    setSubmitting(true);

    const randomCode = Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase();

    const newClassData = {
      class_name: className.trim(),
      school_name: schoolName.trim(),
      code: randomCode,
      teacher_id: currentUserId,
    };

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/teacher_classes`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey!,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(newClassData),
        }
      );

      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(
          `Failed to create class: ${responseBody}`
        );
      }

      const createdClass = JSON.parse(responseBody);

      setTeacherClasses([
        ...teacherClasses,
        createdClass[0],
      ]);

      setClassName('');
      setSchoolName('');
      setIsModalOpen(false);
    } catch (err) {
      console.error(
        'Error creating class',
        err
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (
    code: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${code}`,
        {
          method: 'DELETE',
          headers: {
            apikey: supabaseAnonKey!,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      if (response.ok) {
        setTeacherClasses(
          teacherClasses.filter(
            (c) => c.code !== code
          )
        );
      }
    } catch (err) {
      console.error(
        'Error deleting class',
        err
      );
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      <main className="container mx-auto px-6 py-8 space-y-8">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t('teacherDashboard')}
            </h1>

            <p className="text-muted-foreground">
              {t('teacherDashboardDescription')}
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2"
          >
            <PlusCircle size={18} />
            {t('createNewClass')}
          </Button>
        </div>

        {/* List of Created Classes */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('yourClassesJoinCodes')}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">

              {/* Loading */}
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>

              ) : teacherClasses.length === 0 ? (

                /* Empty State */
                <p className="text-sm text-muted-foreground">
                  {t('noClassesCreated')}
                </p>

              ) : (

                /* Classes */
                teacherClasses.map((item, index) => (
                  <Link
                    key={item.id || index}
                    href={`/dashboard/student/classes/${item.code}`}
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/25 hover:bg-accent/40 transition cursor-pointer mb-2">

                      {/* Class Information */}
                      <div>
                        <h4 className="font-medium text-foreground">
                          {item.class_name}
                        </h4>

                        <p className="text-xs text-muted-foreground">
                          {t('school')}: {item.school_name}
                        </p>
                      </div>

                      {/* Join Code + Delete */}
                      <div className="flex items-center gap-6">

                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">
                            {t('joinCode')}
                          </span>

                          <span className="font-mono text-sm font-bold text-primary">
                            {item.code}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) =>
                            handleDeleteClass(
                              item.code,
                              e
                            )
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>

                      </div>
                    </div>
                  </Link>
                ))
              )}

            </div>
          </CardContent>
        </Card>
      </main>

      {/* =========================================================
          CREATE CLASS MODAL
          ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between">

              <h3 className="text-lg font-bold text-foreground">
                {t('createNewClass')}
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsModalOpen(false)
                }
                className="text-muted-foreground hover:text-foreground"
                aria-label={t('cancel')}
              >
                <X size={20} />
              </button>

            </div>

            {/* Form */}
            <form
              onSubmit={handleCreateClass}
              className="space-y-4"
            >

              {/* Class Name */}
              <div className="space-y-2">

                <label className="text-xs font-medium text-muted-foreground block">
                  {t('className')}
                </label>

                <Input
                  type="text"
                  placeholder={t(
                    'classNamePlaceholder'
                  )}
                  value={className}
                  onChange={(e) =>
                    setClassName(
                      e.target.value
                    )
                  }
                  required
                  className="bg-background h-11"
                />

              </div>

              {/* School Name */}
              <div className="space-y-2">

                <label className="text-xs font-medium text-muted-foreground block">
                  {t('schoolName')}
                </label>

                <Input
                  type="text"
                  placeholder={t(
                    'schoolNamePlaceholder'
                  )}
                  value={schoolName}
                  onChange={(e) =>
                    setSchoolName(
                      e.target.value
                    )
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
                  onClick={() =>
                    setIsModalOpen(false)
                  }
                  className="w-1/2 h-11"
                >
                  {t('cancel')}
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 h-11"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t('generateCode')
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
