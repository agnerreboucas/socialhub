import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import {
  CATEGORY_META,
  store,
  type Category,
  type MediaItem,
} from "@/lib/radio-data";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Retail Radio AI" },
      { name: "description", content: "Acervo de músicas, vinhetas, spots e comunicados da rádio." },
    ],
  }),
  component: BibliotecaPage,
});

const CATS: Category[] = ["musica", "vinheta", "spot", "id", "hora", "comunicado"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function BibliotecaPage() {
  const [items, setItems] = useState<MediaItem[]>(() => store.getLibrary());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all");

  const persist = (next: MediaItem[]) => {
    setItems(next);
    store.setLibrary(next);
  };

  const add = (category: Category) => {
    const item: MediaItem = {
      id: uid(),
      title: category === "musica" ? "Nova música" : `Novo ${CATEGORY_META[category].label.toLowerCase()}`,
      category,
      duration: category === "musica" ? 200 : 10,
      weight: 1,
      text: category === "musica" ? undefined : "Escreva o roteiro aqui…",
    };
    persist([item, ...items]);
  };

  const remove = (id: string) => persist(items.filter((i) => i.id !== id));

  const patch = (id: string, p: Partial<MediaItem>) =>
    persist(items.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filter !== "all" && i.category !== filter) return false;
      if (query && !`${i.title} ${i.text ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const cat of CATS) c[cat] = items.filter((i) => i.category === cat).length;
    return c;
  }, [items]);

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="mx-auto max-w-[1400px] px-6 pb-10 md:px-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Biblioteca</div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Acervo de áudios e roteiros
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre músicas, vinhetas, spots e comunicados. O auto-DJ sorteia a partir daqui seguindo o relógio da hora.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => add(c)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-card-elevated"
              >
                <Plus className="size-3.5" />
                {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="w-72 rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm outline-none focus:border-accent"
            />
          </div>
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`Todos (${counts.all})`} />
          {CATS.map((c) => (
            <FilterChip
              key={c}
              active={filter === c}
              onClick={() => setFilter(c)}
              label={`${CATEGORY_META[c].label} (${counts[c] ?? 0})`}
              dot={CATEGORY_META[c].color}
            />
          ))}
        </div>

        <div className="surface-card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_90px_70px_40px] gap-3 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div>Título / Roteiro</div>
            <div>Categoria</div>
            <div className="text-right">Duração (s)</div>
            <div className="text-right">Peso</div>
            <div></div>
          </div>
          <ul>
            {filtered.map((it) => (
              <li
                key={it.id}
                className="grid grid-cols-[1fr_120px_90px_70px_40px] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <input
                    value={it.title}
                    onChange={(e) => patch(it.id, { title: e.target.value })}
                    className="w-full bg-transparent text-sm font-medium outline-none focus:text-accent"
                  />
                  {it.category !== "musica" && (
                    <input
                      value={it.text ?? ""}
                      onChange={(e) => patch(it.id, { text: e.target.value })}
                      placeholder="Roteiro do locutor"
                      className="mt-0.5 w-full bg-transparent text-xs text-muted-foreground outline-none focus:text-foreground"
                    />
                  )}
                  {it.category === "musica" && (
                    <input
                      value={it.src ?? ""}
                      onChange={(e) => patch(it.id, { src: e.target.value })}
                      placeholder="URL do mp3"
                      className="mt-0.5 w-full bg-transparent text-xs text-muted-foreground outline-none focus:text-foreground"
                    />
                  )}
                </div>
                <select
                  value={it.category}
                  onChange={(e) => patch(it.id, { category: e.target.value as Category })}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                >
                  {CATS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.duration}
                  onChange={(e) => patch(it.id, { duration: Number(e.target.value) })}
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-right text-xs tabular-nums"
                />
                <input
                  type="number"
                  min={1}
                  value={it.weight ?? 1}
                  onChange={(e) => patch(it.id, { weight: Number(e.target.value) })}
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-right text-xs tabular-nums"
                />
                <button
                  onClick={() => remove(it.id)}
                  className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Excluir"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nada por aqui. Adicione um item usando os botões acima.
              </li>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
      {label}
    </button>
  );
}
