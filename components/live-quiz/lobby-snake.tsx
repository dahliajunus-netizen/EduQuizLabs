'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Play, RotateCcw } from 'lucide-react';

/**
 * A small apple-eating snake game for players waiting in the live quiz lobby.
 * It unmounts as soon as the teacher starts the quiz, which ends the game.
 */

const SIZE = 15;
const START_MS = 150;
const MIN_MS = 70;
const SPEEDUP_MS = 4;
const BEST_KEY = 'eduquiz_lobby_snake_best';

type Point = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
type Game = { snake: Point[]; dir: Dir; queue: Dir[]; apple: Point | null; score: number };
type Status = 'ready' | 'playing' | 'over';

const STEP: Record<Dir, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

function randomApple(snake: Point[]): Point | null {
  const taken = new Set(snake.map(p => p.y * SIZE + p.x));
  const free: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i += 1) if (!taken.has(i)) free.push(i);
  if (!free.length) return null;
  const cell = free[Math.floor(Math.random() * free.length)];
  return { x: cell % SIZE, y: Math.floor(cell / SIZE) };
}

function newGame(): Game {
  const mid = Math.floor(SIZE / 2);
  const snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  return { snake, dir: 'right', queue: [], apple: randomApple(snake), score: 0 };
}

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

export function LobbySnake({ className = '' }: { className?: string }) {
  // The loop mutates `game`; each tick copies it into `view` for rendering.
  const game = useRef<Game | null>(null);
  const touchStart = useRef<Point | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>('ready');
  const [view, setView] = useState<Game>(newGame);
  const [status, setStatus] = useState<Status>('ready');
  const [best, setBest] = useState(readBest);
  const [bestAtStart, setBestAtStart] = useState(0);

  const saveBest = useCallback((score: number) => {
    setBest(prev => Math.max(prev, score));
    try { if (score > readBest()) localStorage.setItem(BEST_KEY, String(score)); } catch {}
  }, []);

  const changeStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const start = useCallback(() => {
    const g = newGame();
    game.current = g;
    setView(g);
    setBestAtStart(best);
    changeStatus('playing');
    boardRef.current?.focus({ preventScroll: true });
  }, [changeStatus, best]);

  // Queue turns so two quick key presses between ticks both count, but never reverse into yourself.
  const turn = useCallback((dir: Dir) => {
    const g = game.current;
    if (!g) return;
    const last = g.queue[g.queue.length - 1] ?? g.dir;
    if (dir === last || dir === OPPOSITE[last] || g.queue.length >= 3) return;
    g.queue.push(dir);
  }, []);

  const steer = useCallback((dir: Dir) => {
    if (statusRef.current !== 'playing') start();
    turn(dir);
  }, [start, turn]);

  useEffect(() => {
    if (status !== 'playing') return;
    let timer = 0;
    const step = () => {
      const g = game.current;
      if (!g) return;
      g.dir = g.queue.shift() ?? g.dir;
      const head = g.snake[0];
      const next = { x: head.x + STEP[g.dir].x, y: head.y + STEP[g.dir].y };
      const ate = Boolean(g.apple) && next.x === g.apple?.x && next.y === g.apple?.y;
      const body = ate ? g.snake : g.snake.slice(0, -1);
      const hitWall = next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE;
      if (hitWall || body.some(p => p.x === next.x && p.y === next.y)) {
        saveBest(g.score);
        changeStatus('over');
        return;
      }
      g.snake = [next, ...body];
      if (ate) {
        g.score += 1;
        g.apple = randomApple(g.snake);
        if (!g.apple) {
          saveBest(g.score);
          changeStatus('over');
          setView({ ...g });
          return;
        }
      }
      setView({ ...g });
      timer = window.setTimeout(step, Math.max(MIN_MS, START_MS - g.score * SPEEDUP_MS));
    };
    timer = window.setTimeout(step, START_MS);
    return () => window.clearTimeout(timer);
  }, [status, saveBest, changeStatus]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = KEYS[event.key];
      if (dir) {
        event.preventDefault();
        steer(dir);
      } else if ((event.key === ' ' || event.key === 'Enter') && statusRef.current !== 'playing' && document.activeElement === boardRef.current) {
        event.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steer, start]);

  // Keep a best score reached right before the teacher starts the quiz.
  useEffect(() => () => saveBest(game.current?.score ?? 0), [saveBest]);

  function onTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(event: React.TouchEvent) {
    const from = touchStart.current;
    touchStart.current = null;
    if (!from) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
      if (statusRef.current !== 'playing') start();
      return;
    }
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }

  const g = view;
  const segments = new Map(g.snake.map((p, i) => [p.y * SIZE + p.x, i]));
  const appleCell = g.apple ? g.apple.y * SIZE + g.apple.x : -1;

  return (
    <section className={`rounded-3xl border bg-card/80 p-4 shadow-lg backdrop-blur sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-left">
          <h2 className="text-sm font-black">Snake while you wait</h2>
          <p className="text-xs text-muted-foreground"><span className="pointer-coarse:hidden">Arrow keys or WASD</span><span className="hidden pointer-coarse:inline">Swipe on the board</span> to steer</p>
        </div>
        <div className="flex shrink-0 gap-2 text-xs font-black tabular-nums">
          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-600 dark:text-red-400">🍎 {g.score}</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Best {Math.max(best, g.score)}</span>
        </div>
      </div>
      <div
        ref={boardRef}
        role="application"
        aria-label="Snake game. Use the arrow keys to steer."
        tabIndex={0}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative mx-auto mt-4 aspect-square w-full max-w-[min(100%,340px)] touch-none select-none overflow-hidden rounded-2xl border bg-muted/40 p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="grid size-full gap-px" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
          {Array.from({ length: SIZE * SIZE }, (_, cell) => {
            const segment = segments.get(cell);
            const isApple = cell === appleCell;
            const shade = (Math.floor(cell / SIZE) + cell) % 2 ? 'bg-muted/50' : 'bg-transparent';
            return (
              <span
                key={cell}
                className={`rounded-[3px] ${segment === 0 ? 'bg-primary shadow-sm' : segment !== undefined ? 'bg-primary/65' : isApple ? 'scale-90 rounded-full bg-red-500 shadow-sm' : shade}`}
              />
            );
          })}
        </div>
        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-4 text-center backdrop-blur-[2px]">
            {status === 'over' ? (
              <>
                <p className="text-xs font-black uppercase tracking-[.25em] text-muted-foreground">Game over</p>
                <p className="text-3xl font-black">{g.score} {g.score === 1 ? 'apple' : 'apples'}</p>
                {g.score > bestAtStart && <p className="text-xs font-bold text-primary">New best!</p>}
              </>
            ) : (
              <p className="max-w-[14rem] text-sm font-semibold text-muted-foreground">Eat the apples, don&apos;t hit the walls or your tail.</p>
            )}
            <button
              type="button"
              onClick={start}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-md transition hover:brightness-110 active:scale-[.98]"
            >
              {status === 'over' ? <RotateCcw className="size-4" /> : <Play className="size-4 fill-current" />}
              {status === 'over' ? 'Play again' : 'Play'}
            </button>
          </div>
        )}
      </div>
      <div className="mx-auto mt-3 hidden w-40 grid-cols-3 gap-1.5 pointer-coarse:grid" aria-hidden="true">
        <span />
        <DPad dir="up" onPress={steer} />
        <span />
        <DPad dir="left" onPress={steer} />
        <DPad dir="down" onPress={steer} />
        <DPad dir="right" onPress={steer} />
      </div>
    </section>
  );
}

const ICONS = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight };

function DPad({ dir, onPress }: { dir: Dir; onPress: (dir: Dir) => void }) {
  const Icon = ICONS[dir];
  return (
    <button
      type="button"
      tabIndex={-1}
      onPointerDown={event => { event.preventDefault(); onPress(dir); }}
      className="flex aspect-square items-center justify-center rounded-xl bg-muted text-foreground shadow-sm active:scale-95 active:bg-primary active:text-primary-foreground"
    >
      <Icon className="size-5" />
    </button>
  );
}
