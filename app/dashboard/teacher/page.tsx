'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, FileText, CheckSquare, PlusCircle, BookOpen, Trash2, X, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client directly to avoid missing utility file paths
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeacherDashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<Array<{ id?: string; class_name: string; school_name: string; code: string; teacher_id?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch logged-in user and their specific classes
  useEffect(() => {
    async function initTeacherData() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('Error getting user or not logged in', authError);
          setLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        // Fetch only classes created by this specific teacher ID
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teacher_classes?teacher_id=eq.${user.id}&select=*`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          setTeacherClasses(data);
        }
      } catch (err) {
        console.error('Error fetching teacher classes', err);
      } finally {
        setLoading(false);
      }
    }

    initTeacherData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !schoolName.trim() || !currentUserId) return;

    setSubmitting(true);
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    const newClassData = {
      class_name: className.trim(),
      school_name: schoolName.trim(),
      code: randomCode,
      teacher_id: currentUserId, // Tag class with the creator's ID
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teacher_classes`,
        {
          method: 'POST',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(newClassData)
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        console.error("Supabase Error Response:", responseText);
        throw new Error('Failed to create class');
      }

      const createdClass = JSON.parse(responseText);
      setTeacherClasses([...teacherClasses, createdClass[0]]);
      setClassName('');
      setSchoolName('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating class', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teacher_classes?code=eq.${code}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          }
        }
      );

      if (response.ok) {
        setTeacherClasses(teacherClasses.filter((c) => c.code !== code));
      }
    } catch (err) {
      console.error('Error deleting class', err);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Manage your classes, generate join codes, and review student progress.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <PlusCircle size={18} /> Create New Class
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Created Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{teacherClasses.length} Active</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Submissions</CardTitle>
              <FileText className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">14 to Grade</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sections</CardTitle>
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">4 Sections</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">96.2%</div>
            </CardContent>
          </Card>
        </div>

        {/* List of Created Classes */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Your Classes & Join Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : teacherClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes created yet. Click "Create New Class" above to start!</p>
              ) : (
                teacherClasses.map((item, index) => (
                  <Link key={index} href={`/dashboard/student/classes/${item.code}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20 hover:bg-accent/40 transition cursor-pointer mb-2">
                      <div>
                        <h4 className="font-medium text-foreground">{item.class_name}</h4>
                        <p className="text-xs text-muted-foreground">School: {item.school_name}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Join Code</span>
                          <span className="font-mono text-sm font-bold text-primary">{item.code}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => handleDeleteClass(item.code, e)}
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

      {/* Class Maker Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Create New Class</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">Class Name</label>
                <Input
                  type="text"
                  placeholder="e.g., Advanced Mathematics"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                  className="bg-background h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">School Name</label>
                <Input
                  type="text"
                  placeholder="e.g., Lincoln High School"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
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
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Generate Code'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
