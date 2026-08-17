import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { tracks } from "@/lib/mock-data";

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function NowPlayingCard() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(tracks[0].duration);
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = tracks[index];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(0);
    if (playing) {
      a.play().catch(() => setPlaying(false));
    }
  }, [index]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const skip = () => setIndex((i) => (i + 1) % tracks.length);

  return (
    <div className="surface-card relative overflow-hidden p-6 md:p-8">
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-40 blur-3xl"
        style={{ background: track.cover }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-accent live-dot" />
          Tocando agora
        </div>
        <Equalizer playing={playing} />
      </div>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
        <div
          className="relative aspect-square w-full max-w-[260px] shrink-0 overflow-hidden rounded-2xl"
          style={{ background: track.cover }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 text-xs font-medium uppercase tracking-widest text-white/80">
            Música Ambiente
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-2xl font-semibold md:text-3xl">{track.title}</div>
          <div className="mt-1 truncate text-muted-foreground">{track.artist}</div>

          {/* Progress */}
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

          {/* Controls */}
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
              onClick={skip}
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
        </div>
      </div>

      <audio
        ref={audioRef}
        src={track.src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || track.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onEnded={skip}
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
