'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BookOpen, ChevronDown, ChevronUp, PlusCircle, Trash2 } from 'lucide-react';

export type CourseItem = { id?: string; course_name: string; class_code: string };

type Props = { course: CourseItem; isOpen: boolean; teacher: boolean; onToggle:()=>void; onAdd:()=>void; onDelete:()=>void; children: React.ReactNode };

export default function CourseSection({ course, isOpen, teacher, onToggle, onAdd, onDelete, children }: Props) {
  return <Card className="overflow-hidden"><CardHeader className="flex flex-row items-center justify-between"><button type="button" className="flex items-center gap-2 font-semibold" onClick={onToggle}>{isOpen?<ChevronUp/>:<ChevronDown/>}<BookOpen className="size-4 text-primary"/>{course.course_name}</button>{teacher&&<div className="flex gap-2"><Button type="button" size="sm" onClick={onAdd}><PlusCircle className="mr-1 size-4"/>Add</Button><Button type="button" variant="ghost" size="sm" onClick={onDelete}><Trash2 size={15}/></Button></div>}</CardHeader>{isOpen&&<CardContent className="space-y-8 border-t pt-5">{children}</CardContent>}</Card>;
}
