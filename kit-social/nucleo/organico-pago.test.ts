import assert from "node:assert/strict";
import { test } from "node:test";

import {
  melhorOrganicaSemVerba,
  ordenarRecorte,
  recortarPecas,
  totalizarRecorte,
} from "./organico-pago.ts";
import type { Boost, Post, PostMetrics } from "./types.ts";

function peca(id: string, metrics: Partial<PostMetrics> = {}): Post {
  return {
    id,
    projectId: "proj-1",
    accountIds: ["acc-1"],
    format: "imagem",
    caption: `legenda de ${id}`,
    media: { count: 1, aspectRatio: "4:5", fileSizeMb: 2 },
    status: "publicado",
    scheduledFor: null,
    publishedAt: "2026-08-14T10:00:00",
    createdBy: "user-1",
    approvedBy: null,
    requiresApproval: true,
    metrics: {
      reach: 1000,
      impressions: 1500,
      likes: 50,
      comments: 10,
      shares: 5,
      saves: 3,
      ...metrics,
    },
    coverGradient: "",
  };
}

function anuncio(postId: string, reach: number, spend: number, clicks = 0): Boost {
  return {
    id: `b-${Math.random().toString(36).slice(2, 8)}`,
    postId,
    accountId: "acc-1",
    objective: "alcance",
    budgetTotal: spend,
    durationDays: 7,
    startedAt: "2026-08-15T00:00:00Z",
    endsAt: "2026-08-22T00:00:00Z",
    status: "encerrado",
    audience: { locations: [], ageMin: 18, ageMax: 65, interests: [] },
    results: { spend, reach, impressions: reach * 2, engagement: 100, clicks },
  };
}

test("o pago é subtraído do total, não somado", () => {
  // A rede reporta a publicação já incluindo o que o anúncio trouxe — é o
  // mesmo post. Somar contaria o alcance comprado duas vezes.
  const [recorte] = recortarPecas([peca("p1", { reach: 10_000 })], [anuncio("p1", 4000, 200)]);

  assert.equal(recorte.alcanceTotal, 10_000);
  assert.equal(recorte.alcancePago, 4000);
  assert.equal(recorte.alcanceOrganico, 6000);
  assert.equal(recorte.inconsistente, false);
});

test("quando o pago passa do total, a peça sai marcada e o orgânico não fica negativo", () => {
  // Acontece de verdade: a rede estima alcance por caminhos diferentes para o
  // post e para o anúncio. O que não pode é a tela mostrar "-500 orgânico".
  const [recorte] = recortarPecas([peca("p1", { reach: 3000 })], [anuncio("p1", 3500, 150)]);

  assert.equal(recorte.alcanceOrganico, 0);
  assert.equal(recorte.inconsistente, true);
});

test("peça sem impulsionamento é toda orgânica", () => {
  const [recorte] = recortarPecas([peca("p1", { reach: 8000 })], []);

  assert.equal(recorte.alcancePago, 0);
  assert.equal(recorte.alcanceOrganico, 8000);
  assert.equal(recorte.custoPorMil, null);
});

test("vários anúncios na mesma peça somam", () => {
  const [recorte] = recortarPecas(
    [peca("p1", { reach: 20_000 })],
    [anuncio("p1", 5000, 250, 80), anuncio("p1", 3000, 150, 40)],
  );

  assert.equal(recorte.alcancePago, 8000);
  assert.equal(recorte.investido, 400);
  assert.equal(recorte.cliques, 120);
  assert.equal(recorte.impulsionamentos.length, 2);
});

test("cliques não medidos são nulos, e isso é diferente de zero", () => {
  // Uma peça orgânica sem medição de clique apareceria como "0 cliques", que
  // se lê como "ninguém clicou" em vez de "não medimos".
  const [semMedicao] = recortarPecas([peca("p1")], []);
  assert.equal(semMedicao.cliques, null);

  const [comMedicao] = recortarPecas([peca("p2", { clicks: 0 })], []);
  assert.equal(comMedicao.cliques, 0, "zero informado pela rede é zero mesmo");
});

test("cliques do orgânico e do anúncio se somam quando ambos existem", () => {
  const [recorte] = recortarPecas([peca("p1", { clicks: 30 })], [anuncio("p1", 2000, 100, 45)]);
  assert.equal(recorte.cliques, 75);
});

test("peça não publicada fica de fora", () => {
  // Uma peça agendada não tem desempenho a comparar, e listá-la com zeros
  // derrubaria a média sem que nada tivesse acontecido.
  const agendada: Post = { ...peca("p1"), status: "agendado", metrics: null };
  assert.equal(recortarPecas([agendada], []).length, 0);
});

test("o custo por mil usa o alcance pago, não o total", () => {
  const [recorte] = recortarPecas([peca("p1", { reach: 50_000 })], [anuncio("p1", 10_000, 500)]);
  // 500 reais para 10.000 pessoas = R$ 50 por mil.
  assert.equal(recorte.custoPorMil, 50);
});

test("a ordenação é sempre do maior para o menor", () => {
  const pecas = recortarPecas(
    [
      peca("p1", { reach: 1000, comments: 80 }),
      peca("p2", { reach: 9000, comments: 5 }),
      peca("p3", { reach: 4000, comments: 40 }),
    ],
    [],
  );

  assert.deepEqual(
    ordenarRecorte(pecas, "alcance").map((p) => p.post.id),
    ["p2", "p3", "p1"],
  );
  assert.deepEqual(
    ordenarRecorte(pecas, "comentarios").map((p) => p.post.id),
    ["p1", "p3", "p2"],
  );
});

test("ordenar por cliques põe as peças sem medição no fim", () => {
  const pecas = recortarPecas(
    [peca("p1"), peca("p2", { clicks: 40 }), peca("p3", { clicks: 0 })],
    [],
  );

  const ordem = ordenarRecorte(pecas, "cliques").map((p) => p.post.id);
  assert.equal(ordem[0], "p2");
  // A sem medição vai para o fim — atrás até da que teve zero clique medido.
  assert.equal(ordem[2], "p1");
});

test("os totais fecham e dizem a fatia paga", () => {
  const pecas = recortarPecas(
    [peca("p1", { reach: 10_000 }), peca("p2", { reach: 10_000 })],
    [anuncio("p1", 5000, 250)],
  );

  const totais = totalizarRecorte(pecas);

  assert.equal(totais.pecas, 2);
  assert.equal(totais.impulsionadas, 1);
  assert.equal(totais.alcanceTotal, 20_000);
  assert.equal(totais.alcancePago, 5000);
  assert.equal(totais.alcanceOrganico, 15_000);
  assert.equal(totais.fatiaPaga, 25);
  assert.equal(totais.investido, 250);
  assert.equal(totais.custoPorMil, 50);
});

test("sem nenhuma medição de clique, o total é nulo e não zero", () => {
  const totais = totalizarRecorte(recortarPecas([peca("p1"), peca("p2")], []));
  assert.equal(totais.cliques, null);
});

test("basta uma peça medida para o total de cliques existir", () => {
  const totais = totalizarRecorte(
    recortarPecas([peca("p1"), peca("p2", { clicks: 25 })], []),
  );
  assert.equal(totais.cliques, 25);
});

test("conjunto vazio não quebra os totais", () => {
  const totais = totalizarRecorte([]);
  assert.equal(totais.pecas, 0);
  assert.equal(totais.fatiaPaga, 0);
  assert.equal(totais.custoPorMil, null);
});

test("a melhor orgânica sem verba é candidata a impulsionar", () => {
  const pecas = recortarPecas(
    [
      peca("p1", { reach: 12_000 }), // impulsionada: não é descoberta
      peca("p2", { reach: 9000 }), // a melhor sem verba
      peca("p3", { reach: 3000 }),
    ],
    [anuncio("p1", 6000, 300)],
  );

  assert.equal(melhorOrganicaSemVerba(pecas)?.post.id, "p2");
});

test("sem peça livre de verba, não há candidata", () => {
  const pecas = recortarPecas([peca("p1")], [anuncio("p1", 500, 50)]);
  assert.equal(melhorOrganicaSemVerba(pecas), null);
  assert.equal(melhorOrganicaSemVerba([]), null);
});
