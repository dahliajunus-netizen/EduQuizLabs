'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, ShieldCheck, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CommunityMessage = {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  country: string;
  message: string;
  created_at: string;
};

const POLL_MS = 750;

export function CommunityChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/community/messages?limit=100', {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(String(body?.error || 'Failed to load chat.'));
      setMessages(Array.isArray(body) ? body : []);
      setError('');
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load chat.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(true), POLL_MS);
    return () => window.clearInterval(interval);
  }, [open, loadMessages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages.length]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || sending) return;

    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/community/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(body?.error || 'Failed to send message.'));
      setDraft('');
      if (body?.id) {
        setMessages((current) => current.some((item) => item.id === body.id) ? current : [...current, body]);
      }
      void loadMessages(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/20" onClick={() => setOpen(false)}>
          <section
            className="absolute bottom-4 right-4 flex h-[min(680px,calc(100vh-2rem))] w-[min(430px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            aria-label="Global community chat"
          >
            <header className="flex items-center justify-between border-b bg-card px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-primary" />
                  <h2 className="font-black">Global Community</h2>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Everyone on EduQuizLabs can join
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close chat">
                <X className="size-4" />
              </Button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <MessageCircle className="mx-auto size-9 text-muted-foreground/40" />
                    <p className="mt-3 font-bold">No messages yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Start the global conversation.</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="rounded-2xl border bg-card p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-black">{message.full_name}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                        {message.role}
                      </span>
                      <span className="max-w-[120px] truncate text-[10px] font-semibold text-muted-foreground" title={message.country}>
                        {message.country || 'Unknown'}
                      </span>
                      <time className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <p className="mt-1.5 break-words text-sm leading-relaxed">{message.message}</p>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t bg-card p-3">
              {error && <p className="mb-2 text-xs font-medium text-destructive">{error}</p>}
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message…"
                  maxLength={500}
                  disabled={sending}
                  autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send message">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </form>
              <p className="mt-1.5 text-[10px] text-muted-foreground">Messages are automatically filtered for inappropriate language.</p>
            </div>
          </section>
        </div>
      )}

      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[60] h-12 rounded-full px-5 shadow-lg"
        aria-label="Open global community chat"
      >
        <MessageCircle className="mr-2 size-4" />
        Community
      </Button>
    </>
  );
}
