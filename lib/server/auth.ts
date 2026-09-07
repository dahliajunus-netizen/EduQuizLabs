import { NextRequest } from 'next/server';
import { authenticatedUser, supabaseDb } from '@/lib/server/supabase';

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

export async function requireAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await authenticatedUser(request);
  if (!user?.id) return null;
  return { id: String(user.id), email: user.email ? String(user.email) : undefined };
}

export async function requireTeacher(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await requireAuthenticatedUser(request);
  if (!user) return null;

  const rows = await supabaseDb(
    `users?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`,
  );
  const profile = Array.isArray(rows) ? rows[0] : null;
  return profile?.role === 'teacher' ? user : null;
}

export async function requireStudent(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await requireAuthenticatedUser(request);
  if (!user) return null;

  const rows = await supabaseDb(
    `users?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`,
  );
  const profile = Array.isArray(rows) ? rows[0] : null;
  return profile?.role === 'student' ? user : null;
}

export async function requireTeacherClassOwnership(userId: string, classCode: string): Promise<boolean> {
  const rows = await supabaseDb(
    `teacher_classes?code=eq.${encodeURIComponent(classCode)}&teacher_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
  );
  return Array.isArray(rows) && Boolean(rows[0]);
}
