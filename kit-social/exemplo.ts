/**
 * O kit inteiro funcionando, num arquivo.
 *
 * Rode com `npm run exemplo`. Não instala nada, não liga em banco, não chama
 * rede nenhuma: monta meia dúzia de publicações na mão e passa por todos os
 * módulos, imprimindo o que cada um devolve.
 *
 * Serve a duas coisas. Para quem vai implementar, é o mapa: dá para ver o
 * formato exato que cada função espera e o que ela devolve, sem abrir o código.
 * E é a prova de que o kit se sustenta fora do projeto de origem — se isto roda
 * numa pasta vazia com só o Node instalado, roda no seu projeto.
 */

import { avaliarPecas, porFormato } from "./nucleo/conteudo.ts";
import {
  distribuirPorDia,
  marcaDaPeca,
  montarQuadro,
  motivoParaNaoAvancar,
  podeMoverPara,
  ROTULO_DA_MARCA,
} from "./nucleo/agenda.ts";
import { FASE_LABELS, formatCompact, formatCurrency, formatPercent } from "./nucleo/format.ts";
import { lerFrequencia, medirAtencao, medirConversas } from "./nucleo/atencao.ts";
import { alcancePorLocal, alcancePorRegiao, totalizarLocalidades } from "./nucleo/localidades.ts";
import { melhoresHorarios } from "./nucleo/horarios.ts";
import { hasBlockingIssues, validateDraft } from "./nucleo/networks.ts";
import {
  melhorOrganicaSemVerba,
  ordenarRecorte,
  recortarPecas,
  totalizarRecorte,
} from "./nucleo/organico-pago.ts";
import { avisosDaPrevia, cortarLegenda, gradeDoPerfil } from "./nucleo/previa.ts";
import { recomendar } from "./nucleo/recomendacoes.ts";
import type {
  Boost,
  DailyMetric,
  InboxItem,
  Post,
  PostStatus,
  SocialAccount,
} from "./nucleo/types.ts";

const titulo = (texto: string) => console.log(`\n\x1b[1m${texto}\x1b[0m`);

// ---------------------------------------------------------------------------
// Os dados. É só isto que o seu projeto precisa entregar.
// ---------------------------------------------------------------------------

const contas: SocialAccount[] = [
  {
    id: "acc-ig",
    projectId: "proj-1",
    networkId: "instagram",
    handle: "@minha.conta",
    displayName: "Minha Conta",
    status: "ativa",
    origem: "oauth",
    adAccountConnected: true,
    trackingSince: "2026-01-01",
    tokenExpiresAt: null,
    lastSyncAt: null,
    messagingApproved: true,
    avatarGradient: "",
  },
];

function peca(
  id: string,
  {
    status,
    quando,
    alcance = 0,
    curtidas = 0,
    comentarios = 0,
    legenda = "Publicação de exemplo com #marca e @mencao.",
    formato = "imagem" as Post["format"],
  }: {
    status: PostStatus;
    quando: string | null;
    alcance?: number;
    curtidas?: number;
    comentarios?: number;
    legenda?: string;
    formato?: Post["format"];
  },
): Post {
  const publicado = status === "publicado";
  return {
    id,
    projectId: "proj-1",
    accountIds: ["acc-ig"],
    format: formato,
    caption: legenda,
    media: { count: 1, aspectRatio: "4:5", fileSizeMb: 2 },
    status,
    scheduledFor: publicado ? null : quando,
    publishedAt: publicado ? quando : null,
    createdBy: "user-1",
    approvedBy: null,
    requiresApproval: true,
    metrics: publicado
      ? {
          reach: alcance,
          impressions: Math.round(alcance * 1.6),
          likes: curtidas,
          comments: comentarios,
          shares: 4,
          saves: 7,
        }
      : null,
    coverGradient: "",
  };
}

const posts: Post[] = [
  peca("p1", {
    status: "publicado",
    quando: "2026-09-08T09:00:00-03:00",
    alcance: 18_000,
    curtidas: 620,
    comentarios: 48,
    legenda: "Reunião no bairro hoje. O que mais apareceu foi creche. #educacao",
  }),
  peca("p2", {
    status: "publicado",
    quando: "2026-09-10T19:00:00-03:00",
    alcance: 9_400,
    curtidas: 310,
    comentarios: 12,
    formato: "carrossel",
  }),
  peca("p3", {
    status: "publicado",
    quando: "2026-09-15T19:30:00-03:00",
    alcance: 26_500,
    curtidas: 980,
    comentarios: 96,
  }),
  peca("p4", { status: "aguardando_aprovacao", quando: "2026-10-06T09:00:00-03:00" }),
  peca("p5", { status: "aprovado", quando: "2026-10-07T19:00:00-03:00" }),
  peca("p6", { status: "agendado", quando: "2026-10-08T12:00:00-03:00" }),
  peca("p7", { status: "rascunho", quando: null }),
];

const impulsionamentos: Boost[] = [
  {
    id: "b1",
    postId: "p3",
    accountId: "acc-ig",
    objective: "alcance",
    budgetTotal: 600,
    durationDays: 7,
    startedAt: "2026-09-16T00:00:00Z",
    endsAt: "2026-09-23T00:00:00Z",
    status: "encerrado",
    audience: { locations: ["Salvador, BA"], ageMin: 25, ageMax: 54, interests: [] },
    results: {
      spend: 600,
      reach: 14_000,
      impressions: 31_000,
      engagement: 540,
      clicks: 210,
      porLocal: [
        { local: "Salvador, Bahia", reach: 7_000, spend: 300 },
        { local: "Recife, PE", reach: 4_000, spend: 180 },
        { local: "Juazeiro do Norte", reach: 3_000, spend: 120 },
      ],
    },
  },
  {
    id: "b2",
    postId: "p2",
    accountId: "acc-ig",
    objective: "engajamento",
    budgetTotal: 180,
    durationDays: 5,
    startedAt: "2026-09-11T00:00:00Z",
    endsAt: "2026-09-16T00:00:00Z",
    status: "encerrado",
    audience: { locations: ["Curitiba", "Porto Alegre, RS"], ageMin: 18, ageMax: 44, interests: [] },
    results: { spend: 180, reach: 3_000, impressions: 6_400, engagement: 120, clicks: 40 },
  },
];

const inbox: InboxItem[] = [
  {
    id: "i1",
    accountId: "acc-ig",
    kind: "mensagem",
    authorHandle: "@pessoa.um",
    authorName: "Pessoa Um",
    avatarGradient: "",
    text: "Vocês vão passar no meu bairro?",
    postId: "p3",
    receivedAt: "2026-09-16T10:00:00Z",
    status: "pendente",
    assignedTo: null,
    replies: [],
    relacao: "seguidor",
    interacoes: 3,
  },
  {
    id: "i2",
    accountId: "acc-ig",
    kind: "comentario",
    authorHandle: "@pessoa.dois",
    authorName: "Pessoa Dois",
    avatarGradient: "",
    text: "Parabéns pelo trabalho!",
    postId: "p3",
    receivedAt: "2026-09-16T11:00:00Z",
    status: "respondido",
    assignedTo: "user-1",
    replies: [
      { id: "r1", author: "user-1", text: "Obrigada!", sentAt: "2026-09-16T12:00:00Z" },
    ],
    relacao: "defensor",
    interacoes: 11,
  },
  {
    id: "i3",
    accountId: "acc-ig",
    kind: "mensagem",
    authorHandle: "@pessoa.tres",
    authorName: "Pessoa Três",
    avatarGradient: "",
    text: "Como faço para ajudar?",
    postId: "p1",
    receivedAt: "2026-09-17T09:00:00Z",
    status: "pendente",
    assignedTo: null,
    replies: [],
    relacao: "apoiador",
    interacoes: 5,
  },
];

const metricas: DailyMetric[] = Array.from({ length: 30 }, (_, i) => {
  const dia = new Date(Date.UTC(2026, 8, 1 + i));
  return {
    date: dia.toISOString().slice(0, 10),
    followers: 12_000 + i * 35,
    followersGained: 60,
    followersLost: 25,
    organicReach: 3_000 + i * 40,
    paidReach: i % 5 === 0 ? 2_000 : 0,
    organicImpressions: 5_200 + i * 60,
    paidImpressions: i % 5 === 0 ? 4_100 : 0,
    organicEngagement: 180 + i * 3,
    paidEngagement: i % 5 === 0 ? 90 : 0,
    adSpend: i % 5 === 0 ? 120 : 0,
  };
});

// ---------------------------------------------------------------------------
// 1. Publicação: a rede aceita?
// ---------------------------------------------------------------------------

titulo("1. Validação do rascunho — a rede aceita?");

const problemas = validateDraft(
  {
    format: "carrossel",
    caption: "Legenda normal.",
    media: { count: 14, aspectRatio: "4:5", fileSizeMb: 3 },
  },
  contas,
);
for (const problema of problemas) console.log(`   [${problema.severity}] ${problema.message}`);
console.log(`   bloqueia o envio? ${hasBlockingIssues(problemas) ? "sim" : "não"}`);

// ---------------------------------------------------------------------------
// 2. Prévia: vai sair como você quer?
// ---------------------------------------------------------------------------

titulo("2. Prévia — vai sair como você quer?");

const legendaLonga =
  "A campanha chegou em Guarulhos hoje e a conversa foi sobre creche, transporte e o que falta no bairro para quem trabalha longe de casa #educacao #guarulhos";
const corte = cortarLegenda(legendaLonga);
console.log(`   o feed mostra: "${corte.visivel}"`);
console.log(`   fica atrás do "mais": ${corte.escondido.length} caracteres`);
for (const aviso of avisosDaPrevia({
  legenda: legendaLonga,
  media: { count: 1, aspectRatio: "9:16", fileSizeMb: 2 },
  formato: "imagem",
})) {
  console.log(`   [${aviso.gravidade}] ${aviso.mensagem}`);
}
console.log(`   grade do perfil: ${gradeDoPerfil(posts).length} miniaturas`);

// ---------------------------------------------------------------------------
// 3. Calendário
// ---------------------------------------------------------------------------

titulo("3. Calendário — o que cai em cada dia");

const porDia = distribuirPorDia([], posts);
for (const [dia, itens] of [...porDia.entries()].sort().slice(0, 5)) {
  const marcas = itens
    .map((item) =>
      item.papel === "evento" ? "compromisso" : ROTULO_DA_MARCA[marcaDaPeca(item.post)],
    )
    .join(", ");
  console.log(`   ${dia}: ${itens.length} item(ns) — ${marcas}`);
}

// ---------------------------------------------------------------------------
// 4. Kanban
// ---------------------------------------------------------------------------

titulo("4. Kanban — as colunas e as regras de movimento");

for (const coluna of montarQuadro(posts)) {
  console.log(`   ${FASE_LABELS[coluna.fase]}: ${coluna.posts.length}`);
}
console.log(`   rascunho → publicado? ${podeMoverPara("rascunho", "publicado") ? "pode" : "não"}`);
console.log(`   rascunho → aguardando aprovação? ${podeMoverPara("rascunho", "aguardando_aprovacao") ? "pode" : "não"}`);

// Uma pauta que ainda não escolheu formato não avança, e a mensagem diz o que
// falta em vez de só desabilitar o botão.
const semFormato: Post = { ...posts[6], format: "a_definir" };
console.log(`   pauta sem formato: ${motivoParaNaoAvancar(semFormato, "aprovado") ?? "pode avançar"}`);

// ---------------------------------------------------------------------------
// 5. Orgânico × pago, peça a peça
// ---------------------------------------------------------------------------

titulo("5. Orgânico × pago — peça a peça");

const recorte = ordenarRecorte(recortarPecas(posts, impulsionamentos, contas), "alcance");
for (const linha of recorte) {
  console.log(
    `   ${linha.post.id}: total ${formatCompact(linha.alcanceTotal)} = ` +
      `orgânico ${formatCompact(linha.alcanceOrganico)} + pago ${formatCompact(linha.alcancePago)}` +
      `${linha.investido > 0 ? ` · ${formatCurrency(linha.investido)}` : ""}` +
      `${linha.inconsistente ? " · corte aproximado" : ""}`,
  );
}

const totais = totalizarRecorte(recorte);
console.log(
  `   ${formatPercent(totais.fatiaPaga)} do alcance foi comprado · ` +
    `${totais.custoPorMil === null ? "sem CPM" : `${formatCurrency(totais.custoPorMil)} por mil`}`,
);
console.log(
  `   melhor peça sem verba: ${melhorOrganicaSemVerba(recorte)?.post.id ?? "nenhuma"}` +
    " (candidata óbvia a impulsionar)",
);

// ---------------------------------------------------------------------------
// 6. Atenção e conversas
// ---------------------------------------------------------------------------

titulo("6. Atenção e conversas");

const atencao = medirAtencao(26_500, 42_400);
console.log(
  `   alcance ${formatCompact(atencao.alcance)} · impressões ${formatCompact(atencao.impressoes)} · ` +
    `frequência ${atencao.frequencia.toFixed(2)}`,
);
console.log(`   leitura: ${lerFrequencia(atencao.frequencia)}`);

const conversas = medirConversas(inbox);
console.log(
  `   ${conversas.recebidas} recebidas · ${conversas.respondidas} respondidas · ` +
    `${conversas.pendentes} sem resposta · ${formatPercent(conversas.taxaDeResposta)} de resposta`,
);
console.log(`   sendo ${conversas.mensagens} mensagem(ns) direta(s) e ${conversas.comentarios} comentário(s)`);

// ---------------------------------------------------------------------------
// 7. Insights
// ---------------------------------------------------------------------------

titulo("7. Insights — o que a plataforma percebe sozinha");

const avaliadas = avaliarPecas(posts, inbox);
for (const horario of melhoresHorarios(avaliadas, { minimoDePecas: 1, quantidade: 3 })) {
  console.log(`   ${horario.quando}: ${formatCompact(horario.alcanceMedio)} de alcance médio`);
}
for (const grupo of porFormato(avaliadas)) {
  console.log(`   ${grupo.rotulo}: ${grupo.pecas} peça(s), ${formatCompact(grupo.alcanceMedio)}`);
}

const insights = recomendar({
  contas,
  metricasPorConta: new Map([["acc-ig", metricas]]),
  posts,
  period: "30d",
  interacoesPendentes: conversas.pendentes,
  pendenteMaisAntigaEm: "2026-09-16T10:00:00Z",
  agoraMs: new Date("2026-09-20T12:00:00Z").getTime(),
});
if (insights.length === 0) {
  console.log("   nenhuma recomendação: amostra insuficiente, e dizer isso é melhor que inventar");
}
for (const insight of insights) console.log(`   [${insight.peso}] ${insight.titulo}`);

// ---------------------------------------------------------------------------
// 8. Localidades
// ---------------------------------------------------------------------------

titulo("8. Localidades — onde a campanha chegou");

const locais = alcancePorLocal(impulsionamentos);
for (const local of locais) {
  console.log(
    `   ${local.cidade}${local.uf ? ` (${local.uf}${local.ufInferida ? "*" : ""})` : " — estado não informado"}: ` +
      `${formatCompact(local.alcance)} · ${formatPercent(local.fatia)}` +
      `${local.estimado ? " · estimado" : ""}`,
  );
}
for (const regiao of alcancePorRegiao(locais)) {
  console.log(`   ${regiao.nome}: ${formatCompact(regiao.alcance)} (${formatPercent(regiao.fatia)})`);
}

const totaisDeLocal = totalizarLocalidades(locais);
console.log(
  `   ${totaisDeLocal.cidades} cidades · ${totaisDeLocal.estados} estados · ` +
    `${totaisDeLocal.semEstado} sem estado identificado (o tamanho do ponto cego)`,
);

console.log("\nTudo isso saiu de funções puras, sem banco, sem rede e sem dependência.\n");
