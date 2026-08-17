import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand-header";
import { adminStats, topCampaigns, topPromos } from "@/lib/mock-data";
import { Clock3, Music2, Megaphone, Sparkles, Download, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Retail Radio AI" },
      { name: "description", content: "Estatísticas, relatórios e desempenho da sua rádio inteligente." },
    ],
  }),
  component: AdminScreen,
});

function AdminScreen() {
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="mx-auto max-w-[1400px] px-6 pb-12 md:px-10">
        {/* Title row */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dashboard</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
              Visão geral da rádio
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Últimos 30 dias · Mercadinho Perfeito — Unidade Centro
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-accent-foreground"
            style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow-accent)" }}
          >
            <Download className="size-4" />
            Exportar relatório PDF
          </button>
        </div>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat icon={<Clock3 className="size-4" />} label="Horas reproduzidas" value={adminStats.hoursPlayed.toLocaleString("pt-BR")} delta="+12% vs mês anterior" />
          <Stat icon={<Music2 className="size-4" />} label="Músicas tocadas" value={adminStats.tracksPlayed.toLocaleString("pt-BR")} delta="+8%" />
          <Stat icon={<Megaphone className="size-4" />} label="Anúncios executados" value={adminStats.adsExecuted.toLocaleString("pt-BR")} delta="+22%" />
          <Stat icon={<Sparkles className="size-4" />} label="Campanhas executadas" value={adminStats.campaignsExecuted.toLocaleString("pt-BR")} delta="+5%" />
        </section>

        {/* Lists */}
        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <RankingCard
            title="Top promoções"
            subtitle="Mais reproduzidas no período"
            items={topPromos}
            accent="accent"
          />
          <RankingCard
            title="Top campanhas"
            subtitle="Execução por campanha"
            items={topCampaigns}
            accent="primary"
          />
        </section>

        {/* Availability */}
        <section className="mt-6 surface-card p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Disponibilidade</div>
              <div className="mt-1 text-2xl font-semibold">99,7% no ar</div>
              <div className="mt-1 text-sm text-muted-foreground">718h 41min reproduzidas de 720h disponíveis</div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card-elevated px-3 py-1 text-xs text-success">
              <TrendingUp className="size-3" /> estável
            </div>
          </div>
          <div className="mt-5 grid gap-1" style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}>
            {Array.from({ length: 30 }).map((_, i) => {
              const ok = i !== 18; // one tiny incident
              return (
                <div
                  key={i}
                  className="h-10 rounded-md"
                  style={{
                    background: ok
                      ? "linear-gradient(180deg, oklch(0.72 0.17 150 / 80%), oklch(0.55 0.16 150 / 60%))"
                      : "linear-gradient(180deg, oklch(0.7 0.18 50 / 80%), oklch(0.5 0.18 35 / 60%))",
                  }}
                  title={`Dia ${i + 1}`}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-success">{delta}</div>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string;
  subtitle: string;
  items: { name: string; plays: number }[];
  accent: "accent" | "primary";
}) {
  const max = Math.max(...items.map((i) => i.plays));
  return (
    <div className="surface-card p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <ul className="mt-5 space-y-4">
        {items.map((it, i) => (
          <li key={it.name}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-card-elevated text-[11px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-medium">{it.name}</span>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{it.plays} exec.</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(it.plays / max) * 100}%`,
                  background:
                    accent === "accent" ? "var(--gradient-accent)" : "var(--gradient-brand)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
