// Retail Radio — mock data layer for the auto-DJ.
// Persists to localStorage so Cloud migration just swaps the read/write fns.

export type Category =
  | "musica"
  | "vinheta"
  | "spot"
  | "id"
  | "hora"
  | "comunicado";

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; short: string }
> = {
  musica: { label: "Música", color: "oklch(0.72 0.16 230)", short: "MUS" },
  vinheta: { label: "Vinheta", color: "oklch(0.78 0.18 320)", short: "VIN" },
  spot: { label: "Spot / Promoção", color: "oklch(0.78 0.18 55)", short: "SPT" },
  id: { label: "ID da Rádio", color: "oklch(0.75 0.14 160)", short: "ID" },
  hora: { label: "Hora Certa", color: "oklch(0.82 0.14 90)", short: "HRA" },
  comunicado: { label: "Comunicado", color: "oklch(0.72 0.14 20)", short: "CMU" },
};

export type MediaItem = {
  id: string;
  title: string;
  category: Category;
  duration: number; // seconds
  src?: string; // optional audio source (real audio only for some)
  tags?: string[];
  weight?: number; // rotation weight (higher = more frequent)
  text?: string; // narration / script for non-music items
};

export type ClockSlot = { id: string; category: Category };

export type Clockwheel = {
  id: string;
  name: string;
  description: string;
  slots: ClockSlot[];
};

// hour (0-23) -> clockwheel id
export type DaySchedule = Record<number, string>;
// day (0=Dom .. 6=Sáb) -> day schedule
export type WeekSchedule = Record<number, DaySchedule>;

// ------------------------------------------------------------------
// Defaults (used as initial seed before user edits)
// ------------------------------------------------------------------

export const defaultLibrary: MediaItem[] = [
  // Música — usa SoundHelix (áudio real demo)
  { id: "m1", title: "Summer Aisle", category: "musica", duration: 248, weight: 3, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", tags: ["pop", "leve"] },
  { id: "m2", title: "Open Hours", category: "musica", duration: 232, weight: 3, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", tags: ["indie"] },
  { id: "m3", title: "Checkout Glow", category: "musica", duration: 271, weight: 2, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", tags: ["eletrônica"] },
  { id: "m4", title: "Bairro FM", category: "musica", duration: 218, weight: 2, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", tags: ["mpb"] },
  { id: "m5", title: "Aurora Tape", category: "musica", duration: 256, weight: 2, src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", tags: ["chill"] },

  // Vinhetas
  { id: "v1", title: "Vinheta curta — Mercadinho Perfeito", category: "vinheta", duration: 6, text: "Mercadinho Perfeito. Perto de você, todo dia." },
  { id: "v2", title: "Vinheta — Hora da Oferta", category: "vinheta", duration: 5, text: "Atenção! Chegou a hora da oferta." },
  { id: "v3", title: "Vinheta institucional", category: "vinheta", duration: 7, text: "Você está ouvindo a rádio Mercadinho Perfeito." },

  // Spots / Promoções
  { id: "s1", title: "Mussarela 100g R$ 5,99", category: "spot", duration: 18, text: "Mussarela fatiada, 100 gramas, por apenas cinco reais e noventa e nove centavos. Só esta semana!" },
  { id: "s2", title: "Coca-Cola 2L R$ 8,49", category: "spot", duration: 16, text: "Coca-Cola dois litros, oito reais e quarenta e nove centavos. Aproveite enquanto durar." },
  { id: "s3", title: "Café Pilão 500g R$ 14,99", category: "spot", duration: 20, text: "Café Pilão tradicional, 500 gramas, por quatorze e noventa e nove. Combina com seu dia." },
  { id: "s4", title: "Pão Francês kg R$ 12,90", category: "spot", duration: 15, text: "Pão francês quentinho, o quilo a doze e noventa. Fresquinho o dia inteiro." },

  // ID da Rádio
  { id: "i1", title: "ID curto", category: "id", duration: 4, text: "Retail Radio. Mercadinho Perfeito." },

  // Hora certa
  { id: "h1", title: "Hora certa dinâmica", category: "hora", duration: 6, text: "Agora são {{HH}} horas e {{MM}} minutos." },

  // Comunicados
  { id: "c1", title: "Aniversariante do dia", category: "comunicado", duration: 10, text: "Parabéns para a Dona Maria, aniversariante do dia. A casa toda deseja felicidades!" },
  { id: "c2", title: "Atendimento no caixa 3", category: "comunicado", duration: 8, text: "Solicitamos um operador no caixa 3, por gentileza." },
];

export const defaultClockwheels: Clockwheel[] = [
  {
    id: "cw-comercial",
    name: "Relógio Comercial",
    description: "Mix padrão para horário comercial: 3 músicas, vinheta, spot, música, hora certa.",
    slots: [
      { id: "1", category: "musica" },
      { id: "2", category: "musica" },
      { id: "3", category: "vinheta" },
      { id: "4", category: "spot" },
      { id: "5", category: "musica" },
      { id: "6", category: "hora" },
      { id: "7", category: "musica" },
      { id: "8", category: "id" },
    ],
  },
  {
    id: "cw-manha",
    name: "Relógio Manhã",
    description: "Pegada leve para abertura: muita música, comunicados, hora certa frequente.",
    slots: [
      { id: "1", category: "id" },
      { id: "2", category: "hora" },
      { id: "3", category: "musica" },
      { id: "4", category: "musica" },
      { id: "5", category: "comunicado" },
      { id: "6", category: "musica" },
      { id: "7", category: "vinheta" },
      { id: "8", category: "spot" },
      { id: "9", category: "musica" },
    ],
  },
  {
    id: "cw-pico",
    name: "Relógio Pico de Vendas",
    description: "Mais spots e vinhetas no rush do meio-dia e fim de tarde.",
    slots: [
      { id: "1", category: "musica" },
      { id: "2", category: "spot" },
      { id: "3", category: "vinheta" },
      { id: "4", category: "musica" },
      { id: "5", category: "spot" },
      { id: "6", category: "musica" },
      { id: "7", category: "hora" },
      { id: "8", category: "spot" },
    ],
  },
];

// Default: comercial das 8-11 e 14-18, manhã 6-8, pico 11-14 e 18-22, comercial resto
function buildDefaultDay(): DaySchedule {
  const d: DaySchedule = {};
  for (let h = 0; h < 24; h++) {
    if (h >= 6 && h < 8) d[h] = "cw-manha";
    else if ((h >= 11 && h < 14) || (h >= 18 && h < 22)) d[h] = "cw-pico";
    else d[h] = "cw-comercial";
  }
  return d;
}

export const defaultSchedule: WeekSchedule = {
  0: buildDefaultDay(),
  1: buildDefaultDay(),
  2: buildDefaultDay(),
  3: buildDefaultDay(),
  4: buildDefaultDay(),
  5: buildDefaultDay(),
  6: buildDefaultDay(),
};

// ------------------------------------------------------------------
// Persistence (localStorage — swap to Cloud later)
// ------------------------------------------------------------------

const K_LIB = "rr.library.v1";
const K_CW = "rr.clockwheels.v1";
const K_SCHED = "rr.schedule.v1";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export const store = {
  getLibrary: () => load<MediaItem[]>(K_LIB, defaultLibrary),
  setLibrary: (v: MediaItem[]) => save(K_LIB, v),
  getClockwheels: () => load<Clockwheel[]>(K_CW, defaultClockwheels),
  setClockwheels: (v: Clockwheel[]) => save(K_CW, v),
  getSchedule: () => load<WeekSchedule>(K_SCHED, defaultSchedule),
  setSchedule: (v: WeekSchedule) => save(K_SCHED, v),
};

// ------------------------------------------------------------------
// Auto-DJ helpers
// ------------------------------------------------------------------

export function pickWeighted<T extends { weight?: number }>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  const weights = items.map((i) => i.weight ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickByCategory(
  library: MediaItem[],
  category: Category,
  avoid: Set<string>,
): MediaItem | undefined {
  const pool = library.filter((m) => m.category === category && !avoid.has(m.id));
  if (pool.length === 0) {
    // ignore avoid if nothing left
    return pickWeighted(library.filter((m) => m.category === category));
  }
  return pickWeighted(pool);
}

export function currentClockwheelId(schedule: WeekSchedule, when = new Date()): string | undefined {
  const day = when.getDay();
  const hour = when.getHours();
  return schedule[day]?.[hour];
}

export function buildQueue(
  clockwheel: Clockwheel,
  library: MediaItem[],
  size = 8,
): MediaItem[] {
  const queue: MediaItem[] = [];
  const recent = new Set<string>();
  for (let i = 0; i < size; i++) {
    const slot = clockwheel.slots[i % clockwheel.slots.length];
    const pick = pickByCategory(library, slot.category, recent);
    if (pick) {
      queue.push(pick);
      recent.add(pick.id);
      // keep recent window small so we don't starve small libraries
      if (recent.size > 4) {
        const first = recent.values().next().value as string;
        recent.delete(first);
      }
    }
  }
  return queue;
}

export function renderText(item: MediaItem, when = new Date()): string {
  if (!item.text) return item.title;
  return item.text
    .replace("{{HH}}", String(when.getHours()).padStart(2, "0"))
    .replace("{{MM}}", String(when.getMinutes()).padStart(2, "0"));
}
