'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, X } from 'lucide-react';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
let participantOwner: symbol | null = null;

function getHeaders() {
  let token = '';
  try { token = localStorage.getItem('supabase_access_token') || ''; } catch {}
  return { apikey: key, Authorization: `Bearer ${token || key}` };
}

type Participant = { student_id: string; full_name: string | null; avatar_url?: string | null };

type UserProfile = { id: string; full_name: string | null; avatar_url: string | null };

export default function Participants() {
  const params = useParams();
  const classCode = String(Array.isArray(params.code) ? params.code[0] : params.code || '');
  const [isTeacher, setIsTeacher] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('current_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      const role = String(user.role ?? user.user?.role ?? '').trim().toLowerCase();
      setIsTeacher(role === 'teacher');
    } catch {}
  }, []);

  useEffect(() => {
    if (!isTeacher) return;
    const owner = Symbol('participants');
    if (participantOwner === null) {
      participantOwner = owner;
      setIsPrimary(true);
    }
    return () => {
      if (participantOwner === owner) participantOwner = null;
    };
  }, [isTeacher]);

  async function load() {
    if (!classCode || !isTeacher) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${url}/rest/v1/rpc/get_class_participants`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_class_code: classCode }),
        cache: 'no-store',
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Request failed (${response.status})`);
      const rows = text ? JSON.parse(text) : [];
      const base = Array.isArray(rows) ? rows : [];

      // The participants RPC supplies the student IDs/names. Fetch the matching
      // public profile fields separately so teachers can see each student's avatar.
      const ids = base.map((p: any) => String(p.student_id || '')).filter(Boolean);
      let profiles: UserProfile[] = [];
      if (ids.length) {
        const inFilter = `(${ids.map((id: string) => encodeURIComponent(id)).join(',')})`;
        const profileResponse = await fetch(
          `${url}/rest/v1/users?id=in.${inFilter}&select=id,full_name,avatar_url`,
          { headers: getHeaders(), cache: 'no-store' },
        );
        if (profileResponse.ok) {
          const profileText = await profileResponse.text();
          const parsed = profileText ? JSON.parse(profileText) : [];
          if (Array.isArray(parsed)) profiles = parsed;
        }
      }

      const profileMap = new Map(profiles.map(profile => [String(profile.id), profile]));
      setParticipants(base.map((participant: any) => {
        const profile = profileMap.get(String(participant.student_id));
        return {
          student_id: String(participant.student_id),
          full_name: profile?.full_name ?? participant.full_name ?? null,
          avatar_url: profile?.avatar_url ?? participant.avatar_url ?? null,
        };
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load participants.');
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }

  if (!isTeacher || !isPrimary) return null;

  function openParticipants() {
    setOpen(true);
    void load();
  }

  return <>
    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={openParticipants}>
      <Users className="mr-2 size-4" />Participants
    </Button>

    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[80vh] w-full max-w-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="size-5" />Participants</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Students who have joined this class.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close participants"><X className="size-4" /></Button>
        </CardHeader>
        <CardContent className="max-h-[60vh] overflow-y-auto p-4">
          {loading && <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading participants...</div>}
          {!loading && error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          {!loading && !error && participants.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No students have joined this class yet.</div>}
          {!loading && !error && participants.length > 0 && <div className="space-y-2">
            {participants.map((participant, index) => {
              const displayName = participant.full_name?.trim() || 'Unnamed student';
              const initial = displayName.charAt(0).toUpperCase();
              return <div key={participant.student_id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                <div className="size-11 shrink-0 overflow-hidden rounded-full border bg-primary/10">
                  {participant.avatar_url ? <img src={participant.avatar_url} alt={`${displayName} profile picture`} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-base font-black text-primary">{initial}</div>}
                </div>
                <span className="min-w-0 truncate font-medium">{displayName}</span>
              </div>;
            })}
          </div>}
        </CardContent>
      </Card>
    </div>}
  </>;
}
