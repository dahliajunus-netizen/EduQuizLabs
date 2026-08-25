'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Trash2, ArrowUpRight } from 'lucide-react';

export type MaterialItem = { id?: string; name: string; link: string };

type Props = { materials: MaterialItem[]; teacher: boolean; onDelete: (id: string) => void };

export default function MaterialSection({ materials, teacher, onDelete }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-4.5" /></span>Materials</h3>
          <p className="mt-1 text-xs text-muted-foreground">{materials.length ? `${materials.length} resource${materials.length === 1 ? '' : 's'} available for this course` : 'Resources for this course will appear here.'}</p>
        </div>
        {materials.length > 0 && <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{materials.length}</span>}
      </div>
      {materials.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map(material => (
            <div key={material.id} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
              <a href={material.link} target="_blank" rel="noreferrer" className="block p-4 pr-12">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105"><FileText className="size-5" /></div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-foreground">{material.name}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">Open resource <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
                  </div>
                </div>
              </a>
              {teacher && material.id && <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 size-8 rounded-lg text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100" onClick={() => onDelete(material.id!)} aria-label={`Delete ${material.name}`}><Trash2 className="size-4" /></Button>}
              <div className="h-1 w-full bg-primary/10"><div className="h-full w-1/3 bg-primary/50 transition-all group-hover:w-full" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><FileText className="size-6" /></div><p className="mt-3 text-sm font-bold">No materials yet</p><p className="mt-1 text-xs text-muted-foreground">Add course resources to make them available here.</p></div>
      )}
    </section>
  );
}
