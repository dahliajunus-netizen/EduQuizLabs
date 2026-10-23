import { Crown } from 'lucide-react';

/**
 * Final standings for a live quiz: a podium for the top three and a list for
 * everyone else. Players must already be sorted best first.
 */

type PodiumPlayer = { id: string; nickname: string; correct_answers: number; total_response_time_ms: number };

// Second on the left, first in the middle, third on the right. The steps rise
// one after another, third first, like a prize ceremony.
const STEPS = [
  { place: 1, order: 'order-2', step: 'h-36 sm:h-48 bg-yellow-400 text-yellow-950', ring: 'ring-yellow-400', delay: 'delay-700' },
  { place: 2, order: 'order-1', step: 'h-28 sm:h-36 bg-slate-300 text-slate-900', ring: 'ring-slate-300', delay: 'delay-400' },
  { place: 3, order: 'order-3', step: 'h-20 sm:h-28 bg-amber-600 text-white', ring: 'ring-amber-600', delay: 'delay-100' },
];

function fmt(ms: number) {
  return ms > 0 ? `${(ms / 1000).toFixed(2)}s` : '—';
}

export function FinalPodium({ players, meId, className = '' }: { players: PodiumPlayer[]; meId?: string; className?: string }) {
  if (!players.length) return <p className={`text-center text-sm text-muted-foreground ${className}`}>No players took part.</p>;
  const rest = players.slice(3);

  return (
    <div className={className}>
      <ol aria-label="Podium" className="flex items-end justify-center gap-2 sm:gap-4">
        {STEPS.map(s => {
          const p = players[s.place - 1];
          if (!p) return null;
          const me = p.id === meId;
          return (
            <li key={s.place} className={`flex min-w-0 max-w-44 flex-1 basis-0 flex-col items-center ${s.order} animate-in fade-in slide-in-from-bottom-10 duration-700 fill-mode-both ${s.delay}`}>
              {s.place === 1 && <Crown aria-hidden="true" className="mb-1 size-7 fill-yellow-400 text-yellow-500 sm:size-9" />}
              <span className={`flex size-12 items-center justify-center rounded-full bg-card text-lg font-black shadow-md ring-4 sm:size-16 sm:text-2xl ${s.ring}`}>
                {p.nickname.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <span className="mt-2 w-full truncate text-center text-sm font-black sm:text-lg">
                {p.nickname}{me && <span className="ml-1 text-xs font-bold text-primary">(you)</span>}
              </span>
              <span className="mb-2 text-center text-[11px] font-semibold text-muted-foreground sm:text-xs">
                {p.correct_answers} correct · {fmt(p.total_response_time_ms)}
              </span>
              <span className={`flex w-full items-start justify-center rounded-t-2xl pt-3 text-4xl font-black shadow-lg sm:text-6xl ${s.step} ${me ? 'outline-4 outline-offset-2 outline-primary' : ''}`}>
                {s.place}
              </span>
            </li>
          );
        })}
      </ol>
      {rest.length > 0 && (
        <ol start={4} aria-label="Other players" className="mt-6 space-y-2 animate-in fade-in duration-500 delay-1000 fill-mode-both">
          {rest.map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${p.id === meId ? 'border-primary bg-primary/10' : 'bg-card'}`}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black">{i + 4}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{p.nickname}{p.id === meId && <span className="ml-1 text-xs font-bold text-primary">(you)</span>}</span>
              <span className="shrink-0 text-sm font-black">{p.correct_answers} correct</span>
              <span className="w-14 shrink-0 text-right text-xs font-semibold text-muted-foreground">{fmt(p.total_response_time_ms)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
