'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ClassDetailsPage() {
  const params = useParams();
  const code = params.code;

  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard/student');

  useEffect(() => {
    // Determine whether user is a teacher or student based on localStorage or user profile
    try {
      let isTeacher = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('supabase'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const role = parsed?.user?.user_metadata?.role || parsed?.user?.role;
            if (role === 'teacher' || window.location.pathname.includes('/teacher')) {
              isTeacher = true;
              break;
            }
          }
        }
      }
      // Also check if current URL path implies teacher context
      if (window.location.href.includes('/teacher') || localStorage.getItem('user_role') === 'teacher') {
        isTeacher = true;
      }

      setDashboardUrl(isTeacher ? '/dashboard/teacher' : '/dashboard/student');
    } catch (e) {
      console.error('Error determining role', e);
    }

    async function fetchClassDetails() {
      if (!code) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teacher_classes?code=eq.${code}&select=*`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          setClassData(data[0]);
        }
      } catch (err) {
        console.error('Error fetching class details', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClassDetails();
  }, [code]);

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <Link href={dashboardUrl}>
          <Button variant="ghost" className="gap-2 mb-2">
            <ArrowLeft className="size-4" /> Back to Dashboard
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {classData ? classData.class_name : `Class Code: ${code}`}
          </h1>
          <p className="text-muted-foreground">School: {classData?.school_name || 'N/A'}</p>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Teacher Announcements & Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Teacher announcements, materials, and quizzes for this class will appear here.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
