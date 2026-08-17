import { useEffect, useState } from "react";
import { Cloud, Megaphone, CalendarClock, Wifi, CheckCircle2 } from "lucide-react";
import { campaigns, nextMessage, weather } from "@/lib/mock-data";

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function ClockCard() {
  const now = useNow();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  return (
    <div className="surface-card p-6">
      <Header icon={<CalendarClock className="size-4" />}>Hora</Header>
      <div className="mt-4 flex items-baseline gap-1 font-semibold tabular-nums">
        <span className="text-5xl md:text-6xl tracking-tight">{hh}:{mm}</span>
        <span className="text-xl text-muted-foreground">:{ss}</span>
      </div>
      <div className="mt-2 text-sm text-muted-foreground capitalize">
        {WEEKDAYS[now.getDay()]}
      </div>
    </div>
  );
}

export function WeatherCard() {
  return (
    <div className="surface-card p-6">
      <Header icon={<Cloud className="size-4" />}>Clima</Header>
      <div className="mt-4 flex items-end gap-3">
        <div className="text-5xl font-semibold tabular-nums">{weather.temp}°</div>
        <div className="pb-1.5">
          <div className="text-sm font-medium">{weather.city}</div>
          <div className="text-xs text-muted-foreground">{weather.condition}</div>
        </div>
      </div>
    </div>
  );
}

export function NextMessageCard() {
  const [count, setCount] = useState(nextMessage.inSeconds);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c <= 0 ? 42 : c - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(count / 60).toString().padStart(2, "0");
  const ss = (count % 60).toString().padStart(2, "0");

  return (
    <div className="surface-card relative overflow-hidden p-6">
      <Header icon={<Megaphone className="size-4 text-accent" />}>Próxima mensagem</Header>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full brand-chip px-3 py-1 text-xs font-semibold">
        {nextMessage.kind}
      </div>
      <div className="mt-3 text-lg font-semibold leading-snug">{nextMessage.label}</div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{nextMessage.preview}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Executa em</span>
        <span className="text-xl font-semibold tabular-nums text-accent">{mm}:{ss}</span>
      </div>
    </div>
  );
}

export function CampaignsCard() {
  return (
    <div className="surface-card p-6">
      <Header icon={<span className="inline-block size-2 rounded-full bg-accent" />}>
        Campanhas ativas
      </Header>
      <ul className="mt-4 space-y-2.5">
        {campaigns.map((c) => (
          <li
            key={c.id}
            className="group flex items-center justify-between rounded-xl border border-border bg-card-elevated px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className={`inline-block size-2 rounded-full bg-gradient-to-br ${c.color}`} />
              <span className="text-sm font-medium">{c.name}</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Ativa</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusCard() {
  const now = useNow();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  return (
    <div className="surface-card p-6">
      <Header icon={<Wifi className="size-4" />}>Status</Header>
      <div className="mt-4 flex items-center gap-2">
        <span className="size-2 rounded-full bg-success live-dot" />
        <span className="text-sm font-semibold text-success">Online</span>
      </div>
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Sincronização</span>
          <span className="inline-flex items-center gap-1 text-foreground">
            <CheckCircle2 className="size-3 text-success" /> {hh}:{mm}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Conexão</span>
          <span className="text-foreground">Estável</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Dispositivo</span>
          <span className="text-foreground">Loja Centro</span>
        </div>
      </div>
    </div>
  );
}

function Header({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      {icon}
      {children}
    </div>
  );
}
