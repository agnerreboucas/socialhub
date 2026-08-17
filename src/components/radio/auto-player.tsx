import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import {
  buildQueue,
  CATEGORY_META,
  currentClockwheelId,
  renderText,
  store,
  type Clockwheel,
  type MediaItem,
} from "@/lib/radio-data";

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const QUEUE_SIZE = 8;

export function AutoPlayer() {
  const [library] = useState<MediaItem[]>(() => store.getLibrary());
  const [clockwheels] = useState<Clockwheel[]>(() => store.getClockwheels());
  const [schedule] = useState(() => store.getSchedule());

  const currentClock: Clockwheel = useMemo(() => {
    const id = currentClockwheelId(schedule);
    return clockwheels.find((c) => c.id === id) ?? clockwheels[0];
  }, [clockwheels, schedule]);

  const [queue, setQueue] = useState<MediaItem[]>(() =>
    buildQueue(currentClock, library, QUEUE_SIZE),
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nonAudioTimer = useRef<number | null>(null);

  const current = queue[index];
  const next = queue[index + 1];

  const advance = () => {
    setIndex((i) => {
      const ni = i + 1;
      if (ni >= queue.length - 2) {
        // refill queue with next batch
        setQueue((q) => [...q, ...buildQueue(currentClock, library, QUEUE_SIZE)]);
      }
      return ni;
    });
  };

  // Setup playback per item
  useEffect(() => {
    if (!current) return;
    setProgress(0);
    setDuration(current.duration);
    if (nonAudioTimer.current) {
      clearInterval(nonAudioTimer.current);
      nonAudioTimer.current = null;
    }

    if (current.src && audioRef.current) {
      // Real audio (música)
      const a = audioRef.current;
      a.src = current.src;
      a.volume = muted ? 0 : volume;
      if (playing) {
        a.play().catch(() => setPlaying(false));
      }
    } else if (playing) {
      // Simulated playback for spots/vinhetas/etc
      const start = Date.now();
      nonAudioTimer.current = window.setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed >= current.duration) {
          if (nonAudioTimer.current) clearInterval(nonAudioTimer.current);
          nonAudioTimer.current = null;
          advance();
        } else {
          setProgress(elapsed);
        }
      }, 200);
    }

    return () => {
      if (nonAudioTimer.current) {
        clearInterval(nonAudioTimer.current);
        nonAudioTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const toggle = () => {
    const wasPlaying = playing;
    setPlaying(!wasPlaying);
    if (!current) return;

    if (current.src && audioRef.current) {
      const a = audioRef.current;
      if (wasPlaying) a.pause();
      else a.play().catch(() => setPlaying(false));
    } else {
      // toggle simulated timer
      if (wasPlaying) {
        if (nonAudioTimer.current) clearInterval(nonAudioTimer.current);
        nonAudioTimer.current = null;
      } else {
        const start = Date.now() - progress * 1000;
        nonAudioTimer.current = window.setInterval(() => {
          const elapsed = (Date.now() - start) / 1000;
          if (elapsed >= current.duration) {
            if (nonAudioTimer.current) clearInterval(nonAudioTimer.current);
            nonAudioTimer.current = null;
            advance();
          } else {
            setProgress(elapsed);
          }
        }, 200);
      }
    }
  };

  if (!current) return null;

  const meta = CATEGORY_META[current.category];
  const isMusic = current.category === "musica";

  return (
    <div className="surface-card relative overflow-hidden p-6 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-30 blur-3xl"
        style={{ background: meta.color }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-accent live-dot" />
          No ar · {currentClock.name}
        </div>
        <Equalizer playing={playing} />
      </div>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
        <div
          className="relative grid aspect-square w-full max-w-[260px] shrink-0 place-items-center overflow-hidden rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${meta.color}, oklch(0.3 0.1 260))` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="relative text-center text-white">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-80">
              {meta.short}
            </div>
            <div className="mt-1 text-5xl font-black tracking-tight">
              {isMusic ? "♫" : meta.short}
            </div>
          </div>
          <div className="absolute bottom-3 left-4 text-xs font-medium uppercase tracking-widest text-white/80">
            {meta.label}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-2xl font-semibold md:text-3xl">{current.title}</div>
          {!isMusic && current.text && (
            <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">
              “{renderText(current)}”
            </div>
          )}
          {isMusic && (
            <div className="mt-1 truncate text-muted-foreground">Música ambiente</div>
          )}

          <div className="mt-6">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(progress / Math.max(duration, 1)) * 100}%`,
                  background: "var(--gradient-accent)",
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={toggle}
              className="grid size-14 place-items-center rounded-full text-accent-foreground transition-transform hover:scale-[1.03] active:scale-95"
              style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow-accent)" }}
              aria-label={playing ? "Pausar" : "Tocar"}
            >
              {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
            </button>
            <button
              onClick={advance}
              className="grid size-11 place-items-center rounded-full border border-border bg-card-elevated text-foreground hover:bg-white/10"
              aria-label="Próxima"
            >
              <SkipForward className="size-4" />
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setMuted((m) => !m)}
                className="grid size-9 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setMuted(false);
                  setVolume(Number(e.target.value));
                }}
                className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent"
              />
            </div>
          </div>

          {next && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-border/60 bg-card-elevated/60 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                A seguir
              </span>
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black"
                style={{ background: CATEGORY_META[next.category].color }}
              >
                {CATEGORY_META[next.category].short}
              </span>
              <span className="truncate text-sm">{next.title}</span>
            </div>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || current.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onEnded={advance}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-1 h-5" aria-hidden>
      {[0.1, 0.25, 0.4, 0.15, 0.3].map((d, i) => (
        <span
          key={i}
          className={playing ? "eq-bar" : ""}
          style={{
            display: "inline-block",
            width: 3,
            height: "100%",
            background: "var(--gradient-accent)",
            borderRadius: 2,
            animationDelay: `${d}s`,
            opacity: playing ? 1 : 0.35,
            transform: playing ? undefined : "scaleY(0.35)",
          }}
        />
      ))}
    </div>
  );
}

// Compact queue card to use alongside the player
export function QueueCard() {
  const [library] = useState<MediaItem[]>(() => store.getLibrary());
  const [clockwheels] = useState<Clockwheel[]>(() => store.getClockwheels());
  const [schedule] = useState(() => store.getSchedule());

  const currentClock: Clockwheel = useMemo(() => {
    const id = currentClockwheelId(schedule);
    return clockwheels.find((c) => c.id === id) ?? clockwheels[0];
  }, [clockwheels, schedule]);

  const [queue] = useState(() => buildQueue(currentClock, library, 6));

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Fila automática
        </div>
        <div className="text-[11px] text-muted-foreground">{currentClock.name}</div>
      </div>
      <ul className="mt-3 space-y-2">
        {queue.map((item, i) => {
          const m = CATEGORY_META[item.category];
          return (
            <li key={`${item.id}-${i}`} className="flex items-center gap-3">
              <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black"
                style={{ background: m.color }}
              >
                {m.short}
              </span>
              <span className="truncate text-sm">{item.title}</span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {fmt(item.duration)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
