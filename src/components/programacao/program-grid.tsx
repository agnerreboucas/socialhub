import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Music,
  Megaphone,
  Clock,
  CloudSun,
  Cake,
  CalendarHeart,
  Mic,
  Sparkles,
  GripVertical,
  X,
} from "lucide-react";

// ---------- Types ----------

type BlockKind =
  | "musica"
  | "promocao"
  | "hora"
  | "clima"
  | "aniversariante"
  | "data"
  | "comunicado"
  | "institucional";

type BlockDef = {
  kind: BlockKind;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string; // css color var
};

const BLOCKS: Record<BlockKind, BlockDef> = {
  musica:          { kind: "musica",          label: "Música",          desc: "Faixa do acervo ambiente",     icon: Music,         tone: "var(--primary)" },
  promocao:        { kind: "promocao",        label: "Promoção",        desc: "Oferta com locução IA",        icon: Megaphone,     tone: "var(--accent)" },
  hora:            { kind: "hora",            label: "Hora certa",      desc: "Anúncio do horário atual",     icon: Clock,         tone: "oklch(0.78 0.14 200)" },
  clima:           { kind: "clima",           label: "Clima",           desc: "Previsão do tempo da cidade",  icon: CloudSun,      tone: "oklch(0.82 0.13 230)" },
  aniversariante:  { kind: "aniversariante",  label: "Aniversariante",  desc: "Mensagem ao colaborador",      icon: Cake,          tone: "oklch(0.78 0.16 340)" },
  data:            { kind: "data",            label: "Data comemorativa", desc: "Mensagem temática do dia",   icon: CalendarHeart, tone: "oklch(0.80 0.15 30)" },
  comunicado:      { kind: "comunicado",      label: "Comunicado",      desc: "Aviso interno gravado",        icon: Mic,           tone: "oklch(0.80 0.10 90)" },
  institucional:   { kind: "institucional",   label: "Institucional",   desc: "Vinheta da loja",              icon: Sparkles,      tone: "oklch(0.78 0.12 280)" },
};

type Block = { id: string; kind: BlockKind; title?: string };

type Slot = { hour: string; blocks: Block[] };

// ---------- Initial mock grid ----------

const uid = () => Math.random().toString(36).slice(2, 9);

const initialSlots: Slot[] = [
  { hour: "08:00", blocks: [{ id: uid(), kind: "institucional", title: "Bom dia, Mercadinho Perfeito" }, { id: uid(), kind: "musica" }, { id: uid(), kind: "musica" }, { id: uid(), kind: "clima" }] },
  { hour: "09:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "promocao", title: "Pão francês R$ 0,89" }, { id: uid(), kind: "musica" }, { id: uid(), kind: "hora" }] },
  { hour: "10:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "data", title: "Hoje é Dia do Café" }, { id: uid(), kind: "musica" }] },
  { hour: "11:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "promocao", title: "Mussarela 100g R$ 5,99" }, { id: uid(), kind: "musica" }, { id: uid(), kind: "hora" }] },
  { hour: "12:00", blocks: [{ id: uid(), kind: "aniversariante", title: "Parabéns, Carla!" }, { id: uid(), kind: "musica" }, { id: uid(), kind: "musica" }] },
  { hour: "13:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "comunicado", title: "Troca de turno do açougue" }, { id: uid(), kind: "musica" }] },
  { hour: "14:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "promocao", title: "Refri 2L R$ 7,49" }, { id: uid(), kind: "musica" }, { id: uid(), kind: "clima" }] },
  { hour: "15:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "hora" }, { id: uid(), kind: "musica" }] },
  { hour: "16:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "institucional" }, { id: uid(), kind: "musica" }] },
  { hour: "17:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "promocao", title: "Hortifruti 20% OFF" }, { id: uid(), kind: "musica" }] },
  { hour: "18:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "hora" }, { id: uid(), kind: "comunicado", title: "Encerramento das caixas em 1h" }] },
  { hour: "19:00", blocks: [{ id: uid(), kind: "musica" }, { id: uid(), kind: "institucional", title: "Obrigado pela visita" }] },
];

// ---------- DnD id helpers ----------
// Palette items have id: "palette:<kind>"
// Sortable blocks have their own block.id
// Droppable slots have id: "slot:<hour>"

const isPaletteId = (id: string) => id.startsWith("palette:");
const isSlotId = (id: string) => id.startsWith("slot:");
const paletteKind = (id: string) => id.slice("palette:".length) as BlockKind;
const slotHour = (id: string) => id.slice("slot:".length);

// ---------- Component ----------

export function ProgramGrid() {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const findContainer = (id: string): string | null => {
    if (isSlotId(id)) return slotHour(id);
    for (const s of slots) if (s.blocks.some((b) => b.id === id)) return s.hour;
    return null;
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    // From palette -> drop onto a slot or onto a block (insert there)
    if (isPaletteId(activeIdStr)) {
      const kind = paletteKind(activeIdStr);
      const targetHour = isSlotId(overId) ? slotHour(overId) : findContainer(overId);
      if (!targetHour) return;
      setSlots((prev) =>
        prev.map((s) => {
          if (s.hour !== targetHour) return s;
          const newBlock: Block = { id: uid(), kind };
          if (isSlotId(overId)) return { ...s, blocks: [...s.blocks, newBlock] };
          const idx = s.blocks.findIndex((b) => b.id === overId);
          const blocks = [...s.blocks];
          blocks.splice(idx >= 0 ? idx : blocks.length, 0, newBlock);
          return { ...s, blocks };
        }),
      );
      return;
    }

    // Reorder / move between slots
    const fromHour = findContainer(activeIdStr);
    const toHour = isSlotId(overId) ? slotHour(overId) : findContainer(overId);
    if (!fromHour || !toHour) return;

    if (fromHour === toHour) {
      setSlots((prev) =>
        prev.map((s) => {
          if (s.hour !== fromHour) return s;
          const oldIdx = s.blocks.findIndex((b) => b.id === activeIdStr);
          const newIdx = isSlotId(overId)
            ? s.blocks.length - 1
            : s.blocks.findIndex((b) => b.id === overId);
          if (oldIdx < 0 || newIdx < 0) return s;
          return { ...s, blocks: arrayMove(s.blocks, oldIdx, newIdx) };
        }),
      );
    } else {
      setSlots((prev) => {
        const next = prev.map((s) => ({ ...s, blocks: [...s.blocks] }));
        const from = next.find((s) => s.hour === fromHour)!;
        const to = next.find((s) => s.hour === toHour)!;
        const idx = from.blocks.findIndex((b) => b.id === activeIdStr);
        if (idx < 0) return prev;
        const [moved] = from.blocks.splice(idx, 1);
        if (isSlotId(overId)) {
          to.blocks.push(moved);
        } else {
          const overIdx = to.blocks.findIndex((b) => b.id === overId);
          to.blocks.splice(overIdx >= 0 ? overIdx : to.blocks.length, 0, moved);
        }
        return next;
      });
    }
  };

  const removeBlock = (id: string) => {
    setSlots((prev) => prev.map((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) })));
  };

  const totalBlocks = slots.reduce((a, s) => a + s.blocks.length, 0);
  const totalPromos = slots.reduce((a, s) => a + s.blocks.filter((b) => b.kind === "promocao").length, 0);

  const activeDef: BlockDef | null = activeId
    ? isPaletteId(activeId)
      ? BLOCKS[paletteKind(activeId)]
      : (() => {
          for (const s of slots) {
            const b = s.blocks.find((x) => x.id === activeId);
            if (b) return BLOCKS[b.kind];
          }
          return null;
        })()
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* PALETTE */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Paleta
              </div>
              <div className="text-[11px] text-muted-foreground">arraste →</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(BLOCKS).map((b) => (
                <PaletteItem key={b.kind} def={b} />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="text-lg font-semibold">{totalBlocks}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Blocos hoje</div>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="text-lg font-semibold">{totalPromos}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Promoções</div>
              </div>
            </div>
          </div>
        </aside>

        {/* GRID */}
        <div className="rounded-2xl border border-border bg-card/40 p-2 md:p-4">
          <div className="flex flex-col">
            {slots.map((slot) => (
              <SlotRow key={slot.hour} slot={slot} onRemove={removeBlock} />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDef ? <BlockChip def={activeDef} ghost /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ---------- Palette item (drag source) ----------

function PaletteItem({ def }: { def: BlockDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${def.kind}` });
  const Icon = def.icon;
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[
        "group flex flex-col items-start gap-2 rounded-xl border border-border bg-background/50 p-3 text-left transition",
        "hover:border-foreground/30 hover:bg-background/80",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
      style={{ touchAction: "none" }}
    >
      <span
        className="grid size-7 place-items-center rounded-md"
        style={{ background: `color-mix(in oklab, ${def.tone} 22%, transparent)`, color: def.tone }}
      >
        <Icon className="size-4" />
      </span>
      <span className="text-xs font-medium leading-tight">{def.label}</span>
      <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">{def.desc}</span>
    </button>
  );
}

// ---------- Slot row (droppable + sortable list) ----------

function SlotRow({ slot, onRemove }: { slot: Slot; onRemove: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot.hour}` });
  const duration = slot.blocks.length * 3; // each block ~3min estimate

  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 border-b border-border/60 py-3 last:border-0 md:grid-cols-[88px_1fr] md:gap-5 md:py-4">
      <div className="flex flex-col items-end pr-1 pt-1">
        <div className="font-mono text-base font-semibold tabular-nums md:text-lg">{slot.hour}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{duration}min</div>
      </div>

      <div
        ref={setNodeRef}
        className={[
          "min-h-[64px] rounded-xl border border-dashed p-2 transition",
          isOver
            ? "border-accent/60 bg-accent/5"
            : "border-border/40 bg-background/20",
        ].join(" ")}
      >
        <SortableContext items={slot.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            {slot.blocks.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground/60">
                Solte um bloco aqui…
              </div>
            )}
            {slot.blocks.map((b) => (
              <SortableBlock key={b.id} block={b} onRemove={onRemove} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ---------- Sortable block ----------

function SortableBlock({ block, onRemove }: { block: Block; onRemove: (id: string) => void }) {
  const def = BLOCKS[block.kind];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <BlockChip def={def} title={block.title} dragHandle={{ attributes: attributes as unknown as Record<string, unknown>, listeners: listeners as unknown as Record<string, unknown> | undefined }} onRemove={() => onRemove(block.id)} />
    </div>
  );
}

// ---------- Block chip (visual) ----------

function BlockChip({
  def,
  title,
  ghost,
  dragHandle,
  onRemove,
}: {
  def: BlockDef;
  title?: string;
  ghost?: boolean;
  dragHandle?: { attributes: Record<string, unknown>; listeners?: Record<string, unknown> | undefined };
  onRemove?: () => void;
}) {
  const Icon = def.icon;
  return (
    <div
      className={[
        "group inline-flex items-center gap-2 rounded-lg border border-border bg-card pl-1 pr-2 py-1 shadow-sm",
        ghost ? "scale-105 shadow-lg" : "",
      ].join(" ")}
      style={{
        boxShadow: ghost ? `0 8px 24px -8px color-mix(in oklab, ${def.tone} 50%, transparent)` : undefined,
      }}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
        {...(dragHandle?.attributes ?? {})}
        {...(dragHandle?.listeners ?? {})}
        aria-label="Arrastar"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span
        className="grid size-5 place-items-center rounded"
        style={{ background: `color-mix(in oklab, ${def.tone} 25%, transparent)`, color: def.tone }}
      >
        <Icon className="size-3" />
      </span>
      <span className="text-xs font-medium">{def.label}</span>
      {title && (
        <span className="max-w-[180px] truncate text-xs text-muted-foreground">· {title}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 grid size-4 place-items-center rounded text-muted-foreground/50 opacity-0 transition hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
          aria-label="Remover"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
