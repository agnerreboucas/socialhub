import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, GripVertical, Copy } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BrandHeader } from "@/components/brand-header";
import {
  CATEGORY_META,
  store,
  type Category,
  type ClockSlot,
  type Clockwheel,
} from "@/lib/radio-data";

export const Route = createFileRoute("/relogios")({
  head: () => ({
    meta: [
      { title: "Relógios — Retail Radio AI" },
      { name: "description", content: "Crie e edite clockwheels (relógios musicais) da sua rádio." },
    ],
  }),
  component: RelogiosPage,
});

const CATS: Category[] = ["musica", "vinheta", "spot", "id", "hora", "comunicado"];
const uid = () => Math.random().toString(36).slice(2, 9);

function RelogiosPage() {
  const [wheels, setWheels] = useState<Clockwheel[]>(() => store.getClockwheels());
  const [activeId, setActiveId] = useState<string>(() => store.getClockwheels()[0]?.id);

  const persist = (next: Clockwheel[]) => {
    setWheels(next);
    store.setClockwheels(next);
  };

  const active = wheels.find((w) => w.id === activeId) ?? wheels[0];

  const addWheel = () => {
    const w: Clockwheel = {
      id: uid(),
      name: "Novo relógio",
      description: "Descreva a pegada deste relógio.",
      slots: [
        { id: uid(), category: "musica" },
        { id: uid(), category: "musica" },
        { id: uid(), category: "vinheta" },
        { id: uid(), category: "spot" },
      ],
    };
    persist([w, ...wheels]);
    setActiveId(w.id);
  };

  const duplicate = (id: string) => {
    const w = wheels.find((x) => x.id === id);
    if (!w) return;
    const copy: Clockwheel = {
      ...w,
      id: uid(),
      name: `${w.name} (cópia)`,
      slots: w.slots.map((s) => ({ ...s, id: uid() })),
    };
    persist([copy, ...wheels]);
    setActiveId(copy.id);
  };

  const removeWheel = (id: string) => {
    const next = wheels.filter((w) => w.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id);
  };

  const patchActive = (p: Partial<Clockwheel>) => {
    persist(wheels.map((w) => (w.id === active.id ? { ...w, ...p } : w)));
  };

  const addSlot = (cat: Category) => {
    patchActive({ slots: [...active.slots, { id: uid(), category: cat }] });
  };

  const removeSlot = (sid: string) => {
    patchActive({ slots: active.slots.filter((s) => s.id !== sid) });
  };

  const changeSlot = (sid: string, cat: Category) => {
    patchActive({
      slots: active.slots.map((s) => (s.id === sid ? { ...s, category: cat } : s)),
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active: a, over: o } = e;
    if (!o || a.id === o.id) return;
    const oldIdx = active.slots.findIndex((s) => s.id === a.id);
    const newIdx = active.slots.findIndex((s) => s.id === o.id);
    if (oldIdx < 0 || newIdx < 0) return;
    patchActive({ slots: arrayMove(active.slots, oldIdx, newIdx) });
  };

  const totalDuration = useMemo(
    () => (active ? active.slots.length * 25 : 0),
    [active],
  );

  if (!active) {
    return (
      <div className="min-h-screen">
        <BrandHeader />
        <main className="mx-auto max-w-[800px] px-6 pb-10 md:px-10">
          <button
            onClick={addWheel}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background"
          >
            <Plus className="size-4" />
            Criar primeiro relógio
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="mx-auto max-w-[1400px] px-6 pb-10 md:px-10">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Relógios musicais</div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Clockwheels — templates de hora
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cada relógio define a sequência de categorias dentro de uma hora.
            O auto-DJ sorteia itens da biblioteca seguindo essa ordem.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* List */}
          <aside className="space-y-2">
            <button
              onClick={addWheel}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-accent hover:text-accent"
            >
              <Plus className="size-4" />
              Novo relógio
            </button>
            {wheels.map((w) => {
              const isActive = w.id === active.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveId(w.id)}
                  className={[
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card hover:bg-card-elevated",
                  ].join(" ")}
                >
                  <div className="truncate text-sm font-medium">{w.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {w.slots.length} blocos
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Editor */}
          <section className="surface-card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  value={active.name}
                  onChange={(e) => patchActive({ name: e.target.value })}
                  className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none focus:text-accent"
                />
                <input
                  value={active.description}
                  onChange={(e) => patchActive({ description: e.target.value })}
                  className="mt-1 w-full bg-transparent text-sm text-muted-foreground outline-none focus:text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => duplicate(active.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-card-elevated"
                >
                  <Copy className="size-3.5" /> Duplicar
                </button>
                <button
                  onClick={() => removeWheel(active.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" /> Excluir
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => addSlot(c)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-card-elevated"
                >
                  <span className="size-2 rounded-full" style={{ background: CATEGORY_META[c].color }} />
                  <Plus className="size-3" /> {CATEGORY_META[c].label}
                </button>
              ))}
              <div className="ml-auto self-center text-[11px] text-muted-foreground">
                ~{Math.floor(totalDuration / 60)}min por ciclo
              </div>
            </div>

            <div className="mt-5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={active.slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-2">
                    {active.slots.map((s, i) => (
                      <SortableSlotRow
                        key={s.id}
                        index={i}
                        slot={s}
                        onChange={(c) => changeSlot(s.id, c)}
                        onRemove={() => removeSlot(s.id)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
              {active.slots.length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                  Adicione blocos para montar o relógio.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SortableSlotRow({
  index,
  slot,
  onChange,
  onRemove,
}: {
  index: number;
  slot: ClockSlot;
  onChange: (c: Category) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.id,
  });
  const meta = CATEGORY_META[slot.category];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-border bg-card-elevated/60 px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/5 cursor-grab active:cursor-grabbing"
        aria-label="Arrastar"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
      <span
        className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black"
        style={{ background: meta.color }}
      >
        {meta.short}
      </span>
      <select
        value={slot.category}
        onChange={(e) => onChange(e.target.value as Category)}
        className="rounded-md border border-border bg-card px-2 py-1 text-xs"
      >
        {CATS.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_META[c].label}
          </option>
        ))}
      </select>
      <span className="ml-auto text-xs text-muted-foreground">
        sorteia 1 item de “{meta.label}”
      </span>
      <button
        onClick={onRemove}
        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remover"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
