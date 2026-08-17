export type Track = {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  src: string;
  cover: string; // CSS gradient var
};

// SoundHelix — freely usable demo audio tracks
export const tracks: Track[] = [
  {
    id: "t1",
    title: "Summer Aisle",
    artist: "Retail Sessions",
    duration: 248,
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "var(--gradient-cover-1)",
  },
  {
    id: "t2",
    title: "Open Hours",
    artist: "Aurora Tape",
    duration: 232,
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    cover: "var(--gradient-cover-2)",
  },
  {
    id: "t3",
    title: "Checkout Glow",
    artist: "Neon Market",
    duration: 271,
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    cover: "var(--gradient-cover-3)",
  },
  {
    id: "t4",
    title: "Bairro FM",
    artist: "Coletivo Local",
    duration: 218,
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover: "var(--gradient-cover-4)",
  },
];

export type Campaign = {
  id: string;
  name: string;
  color: string; // tailwind class fragment
  countdown?: string;
};

export const campaigns: Campaign[] = [
  { id: "c1", name: "Oferta da Semana", color: "from-accent to-accent/60" },
  { id: "c2", name: "Festa Junina", color: "from-amber-500 to-rose-500" },
  { id: "c3", name: "Dia dos Pais", color: "from-blue-500 to-indigo-600" },
  { id: "c4", name: "Black Friday", color: "from-zinc-200 to-zinc-500" },
];

export const nextMessage = {
  label: "Oferta da Semana",
  kind: "Promoção",
  inSeconds: 42,
  preview:
    "Aproveite nossa promoção especial. Mussarela por apenas cinco reais e noventa e nove centavos.",
};

export const weather = {
  city: "Guarulhos",
  temp: 28,
  condition: "Parcialmente nublado",
};

// Admin mock
export const adminStats = {
  hoursPlayed: 412,
  tracksPlayed: 5_842,
  adsExecuted: 1_204,
  campaignsExecuted: 87,
};

export const topPromos = [
  { name: "Mussarela 100g R$ 5,99", plays: 312 },
  { name: "Coca-Cola 2L R$ 8,49", plays: 287 },
  { name: "Pão Francês kg R$ 12,90", plays: 244 },
  { name: "Café Pilão 500g R$ 14,99", plays: 198 },
  { name: "Detergente Ypê R$ 2,49", plays: 173 },
];

export const topCampaigns = [
  { name: "Oferta da Semana", plays: 412 },
  { name: "Dia dos Pais", plays: 188 },
  { name: "Festa Junina", plays: 142 },
  { name: "Cliente VIP", plays: 96 },
];
