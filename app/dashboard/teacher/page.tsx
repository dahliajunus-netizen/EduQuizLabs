'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useLanguage } from '@/components/language-provider';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
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
  teacher_id: string;
};

type CurrentUser = {
  id?: string | number;
  fullName?: string;
  email?: string;
  role?: string;
};

export default function TeacherDashboardPage() {
  const { t } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /*
   * ============================================================
   * GET CURRENT USER
   * ============================================================
   */

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getCurrentUser = () => {
      try {
        const rawUser = localStorage.getItem('current_user');

        console.log(
          '[Teacher Dashboard] current_user:',
          rawUser
        );

        if (!rawUser) {
          console.error(
            '[Teacher Dashboard] No current_user found.'
          );

          setCurrentUserId(null);
          setLoading(false);
          return;
        }

        const parsedUser: CurrentUser =
          JSON.parse(rawUser);

        console.log(
          '[Teacher Dashboard] Parsed user:',
          parsedUser
        );

        if (
          parsedUser &&
          parsedUser.id !== undefined &&
          parsedUser.id !== null &&
          String(parsedUser.id).trim() !== ''
        ) {
          const id = String(parsedUser.id);

          setCurrentUserId(id);

          console.log(
            '[Teacher Dashboard] Current teacher ID:',
            id
          );
        } else {
          console.error(
            '[Teacher Dashboard] current_user exists but has no ID.'
          );

          setCurrentUserId(null);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          '[Teacher Dashboard] Failed to parse current_user:',
          error
        );

        setCurrentUserId(null);
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  /*
   * ============================================================
   * FETCH CLASSES
   * ============================================================
   */

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        '[Teacher Dashboard] Supabase environment variables missing.'
      );

      setLoading(false);
      return;
    }

    async function fetchTeacherClasses() {
      setLoading(true);

      try {
        const url =
          `${supabaseUrl}/rest/v1/teacher_classes` +
          `?teacher_id=eq.${encodeURIComponent(currentUserId)}` +
          `&select=*`;

        console.log(
          '[Teacher Dashboard] Fetching classes for teacher:',
          currentUserId
        );

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(
            `Supabase returned ${response.status}: ${responseText}`
          );
        }

        const data: TeacherClass[] =
          JSON.parse(responseText);

        /*
         * Extra ownership check.
         */
        const ownClasses = data.filter(
          (item) =>
            String(item.teacher_id) ===
            String(currentUserId)
        );

        console.log(
          '[Teacher Dashboard] Classes belonging to current teacher:',
          ownClasses
        );

        setTeacherClasses(ownClasses);
      } catch (error) {
        console.error(
          '[Teacher Dashboard] Error fetching classes:',
          error
        );

        setTeacherClasses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherClasses();
  }, [
    currentUserId,
    supabaseUrl,
    supabaseAnonKey,
  ]);

  /*
   * ============================================================
   * CREATE CLASS
   * ============================================================
   */

  const handleCreateClass = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!currentUserId) {
      console.error(
        'Cannot create class: no teacher ID.'
      );
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        'Supabase environment variables are missing.'
      );
      return;
    }

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
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(newClassData),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Failed to create class: ${responseText}`
        );
      }

      const createdClasses: TeacherClass[] =
        JSON.parse(responseText);

      const createdClass = createdClasses?.[0];

      if (!createdClass) {
        throw new Error(
          'No class was returned by Supabase.'
        );
      }

      /*
       * Only put the class into the dashboard if
       * it actually belongs to this teacher.
       */
      if (
        String(createdClass.teacher_id) ===
        String(currentUserId)
      ) {
        setTeacherClasses((previous) => [
          ...previous,
          createdClass,
        ]);
      }

      setClassName('');
      setSchoolName('');
      setIsModalOpen(false);
    } catch (error) {
      console.error(
        '[Teacher Dashboard] Error creating class:',
        error
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * DELETE CLASS
   * ============================================================
   */

  const handleDeleteClass = async (
    code: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return;
    }

    setDeletingCode(code);

    try {
      /*
       * BOTH code AND teacher_id are checked.
       */
      const url =
        `${supabaseUrl}/rest/v1/teacher_classes` +
        `?code=eq.${encodeURIComponent(code)}` +
        `&teacher_id=eq.${encodeURIComponent(currentUserId)}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Prefer: 'return=minimal',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Failed to delete class: ${responseText}`
        );
      }

      setTeacherClasses((previous) =>
        previous.filter(
          (item) =>
            !(
              item.code === code &&
              String(item.teacher_id) ===
                String(currentUserId)
            )
        )
      );
    } catch (error) {
      console.error(
        '[Teacher Dashboard] Error deleting class:',
        error
      );
    } finally {
      setDeletingCode(null);
    }
  };

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      <main className="container mx-auto px-6 py-8 space-y-8">

        {/* Header */}
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
            disabled={!currentUserId}
            className="gap-2"
          >
            <PlusCircle size={18} />
            {t('createNewClass')}
          </Button>
        </div>

        {/* Classes */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('yourClassesJoinCodes')}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">

              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : !currentUserId ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Unable to identify the current teacher.
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Please sign out and sign in again.
                  </p>
                </div>
              ) : teacherClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('noClassesCreated')}
                </p>
              ) : (
                teacherClasses.map(
                  (item, index) => (
                    <Link
                      key={
                        item.id ||
                        `${item.code}-${index}`
                      }
                      href={`/dashboard/teacher/classes/${item.code}`}
                    >
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/25 hover:bg-accent/40 transition cursor-pointer mb-2">

                        {/* Class Information */}
                        <div>
                          <h4 className="font-medium text-foreground">
                            {item.class_name}
                          </h4>

                          <p className="text-xs text-muted-foreground">
                            {t('school')}:{' '}
                            {item.school_name}
                          </p>
                        </div>

                        {/* Code + Delete */}
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
                            disabled={
                              deletingCode ===
                              item.code
                            }
                            onClick={(e) =>
                              handleDeleteClass(
                                item.code,
                                e
                              )
                            }
                            className="text-muted-foreground hover:text-destructive"
                          >
                            {deletingCode ===
                            item.code ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </Button>

                        </div>
                      </div>
                    </Link>
                  )
                )
              )}

            </div>
          </CardContent>
        </Card>
      </main>

      {/* =====================================================
          CREATE CLASS MODAL
          ===================================================== */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-6">

            {/* Header */}
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

              {/* School */}
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
                  disabled={
                    submitting ||
                    !currentUserId
                  }
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
