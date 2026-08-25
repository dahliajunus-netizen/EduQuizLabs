'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BookOpen, ChevronDown, ChevronUp, PlusCircle, Trash2, LogOut, Loader2, Sparkles } from 'lucide-react';

export type CourseItem = { id?: string; course_name: string; class_code: string };

type Props = { course: CourseItem; isOpen: boolean; teacher: boolean; onToggle:()=>void; onAdd:()=>void; onDelete:()=>void; children: React.ReactNode };

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers={apikey:key,Authorization:`Bearer ${key}`};

export default function CourseSection({ course, isOpen, teacher, onToggle, onAdd, onDelete, children }: Props) {
  const [leaving,setLeaving]=useState(false);

  async function leaveClass(){
    if(leaving)return;
    const confirmed=window.confirm(`Are you sure you want to leave ${course.class_code}? You will lose access to this class.`);
    if(!confirmed)return;
    try{
      let studentId='';
      const raw=localStorage.getItem('current_user');
      if(raw){
        const u=JSON.parse(raw);
        studentId=String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? u.user?.student_id ?? u.user?.id ?? '');
      }
      if(!studentId)throw new Error('Could not identify your student account. Please sign in again.');
      setLeaving(true);
      const response=await fetch(`${url}/rest/v1/student_classes?code=eq.${encodeURIComponent(course.class_code)}&student_id=eq.${encodeURIComponent(studentId)}`,{method:'DELETE',headers});
      if(!response.ok)throw new Error((await response.text())||'Failed to leave class.');
      window.location.href='/dashboard/student';
    }catch(error){
      setLeaving(false);
      window.alert(error instanceof Error?error.message:'Failed to leave class.');
    }
  }

  return (
    <Card className={`overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-200 ${isOpen?'border-primary/20 shadow-md':'hover:-translate-y-0.5 hover:shadow-md'}`}>
      <CardHeader className="p-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <button type="button" className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary" onClick={onToggle} aria-expanded={isOpen}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {isOpen?<ChevronUp className="size-5"/>:<ChevronDown className="size-5"/>}
            </span>
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <BookOpen className="size-5"/>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold sm:text-lg">{course.course_name}</span>
                <span className="mt-0.5 block text-xs font-medium text-muted-foreground">Class {course.class_code}</span>
              </span>
            </span>
          </button>

          {teacher ? (
            <div className="flex items-center gap-2 pl-14 sm:pl-0">
              <Button type="button" size="sm" onClick={onAdd} className="rounded-xl shadow-sm">
                <PlusCircle className="mr-1.5 size-4"/>Add
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="size-9 rounded-xl text-muted-foreground hover:text-destructive" aria-label={`Delete ${course.course_name}`}>
                <Trash2 className="size-4"/>
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={leaveClass} disabled={leaving} className="rounded-xl sm:shrink-0">
              {leaving?<Loader2 className="mr-1.5 size-4 animate-spin"/>:<LogOut className="mr-1.5 size-4"/>}
              {leaving?'Leaving…':'Leave Class'}
            </Button>
          )}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-7 border-t bg-muted/[0.12] p-4 pt-5 sm:p-6 sm:pt-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary"/>
            Course workspace
          </div>
          {children}
        </CardContent>
      )}
    </Card>
  );
}
