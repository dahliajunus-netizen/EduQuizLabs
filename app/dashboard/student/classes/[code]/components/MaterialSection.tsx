'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, Link as LinkIcon, Trash2 } from 'lucide-react';

export type MaterialItem = { id?: string; name: string; link: string };

type Props = { materials: MaterialItem[]; teacher: boolean; onDelete: (id: string) => void };

export default function MaterialSection({ materials, teacher, onDelete }: Props) {
  return <section><h3 className="mb-3 font-semibold">📚 Materials</h3>{materials.length ? materials.map(material => <div key={material.id} className="mb-2 flex items-center gap-3 rounded-lg border p-3"><a href={material.link} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2"><LinkIcon className="size-4 text-primary" /><span className="truncate">{material.name}</span><ExternalLink className="ml-auto size-4" /></a>{teacher && material.id && <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(material.id!)}><Trash2 size={14} /></Button>}</div>) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No materials yet.</p>}</section>;
}
