'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Trash2 } from 'lucide-react';

export type MaterialItem = { id?: string; name: string; link: string };

type Props = { materials: MaterialItem[]; teacher: boolean; onDelete: (id: string) => void };

export default function MaterialSection({ materials, teacher, onDelete }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold tracking-tight"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="size-4" /></span>Materials</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{materials.length ? `${materials.length} resource${materials.length === 1 ? '' : 's'} available` : 'Resources for this course will appear here.'}</p>
        </div>
      </div>
      {materials.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {materials.map(material => (
            <div key={material.id} className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"><FileText className="size-5" /></div>
              <a href={material.link} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{material.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">Open resource <ExternalLink className="size-3" /></span>
              </a>
              {teacher && material.id && <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => onDelete(material.id!)} aria-label={`Delete ${material.name}`}><Trash2 className="size-4" /></Button>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center"><FileText className="mx-auto size-7 text-muted-foreground/60" /><p className="mt-2 text-sm font-medium">No materials yet</p><p className="mt-1 text-xs text-muted-foreground">Add course resources to make them available here.</p></div>
      )}
    </section>
  );
}
