'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BookOpen, ChevronDown, ChevronUp, PlusCircle, Trash2, LogOut, Loader2 } from 'lucide-react';

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

  return <Card className="overflow-hidden"><CardHeader className="flex flex-row items-center justify-between"><button type="button" className="flex items-center gap-2 font-semibold" onClick={onToggle}>{isOpen?<ChevronUp/>:<ChevronDown/>}<BookOpen className="size-4 text-primary"/>{course.course_name}</button>{teacher?<div className="flex gap-2"><Button type="button" size="sm" onClick={onAdd}><PlusCircle className="mr-1 size-4"/>Add</Button><Button type="button" variant="ghost" size="sm" onClick={onDelete}><Trash2 size={15}/></Button></div>:<Button type="button" variant="outline" size="sm" onClick={leaveClass} disabled={leaving} className="shrink-0"><LogOut className="mr-1 size-4"/>{leaving?<Loader2 className="size-4 animate-spin"/>:'Leave Class'}</Button>}</CardHeader>{isOpen&&<CardContent className="space-y-8 border-t pt-5">{children}</CardContent>}</Card>;
}
