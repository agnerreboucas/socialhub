import assert from "node:assert/strict";
import { test } from "node:test";

import {
  lerFrequencia,
  medirAtencao,
  medirConversas,
  noPeriodo,
  pecasQuePuxamConversa,
} from "./atencao.ts";
import type { InboxItem, Post } from "./types.ts";

function conversa(parcial: Partial<InboxItem> = {}): InboxItem {
  return {
    id: `i-${Math.random().toString(36).slice(2, 8)}`,
    accountId: "acc-1",
    kind: "comentario",
    authorHandle: "@alguem",
    authorName: "Alguém",
    avatarGradient: "",
    text: "oi",
    postId: null,
    receivedAt: "2026-08-15T10:00:00",
    status: "pendente",
    assignedTo: null,
    replies: [],
    relacao: "seguidor",
    interacoes: 1,
    ...parcial,
  };
}

function peca(id: string): Post {
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
    metrics: null,
    coverGradient: "",
  };
}

// --- Alcance, impressões e frequência -----------------------------------------

test("a frequência é quantas vezes cada pessoa viu", () => {
  const medida = medirAtencao(20_661, 37_898);
  assert.equal(medida.alcance, 20_661);
  assert.equal(medida.impressoes, 37_898);
  assert.ok(Math.abs(medida.frequencia - 1.834) < 0.001);
});

test("sem alcance, a frequência é zero e não uma divisão por zero", () => {
  const medida = medirAtencao(0, 0);
  assert.equal(medida.frequencia, 0);
  assert.ok(Number.isFinite(medida.frequencia));

  // O caso perverso: impressões sem alcance registrado. Continua finito.
  assert.equal(medirAtencao(0, 500).frequencia, 0);
});

test("a leitura da frequência muda de conselho conforme a faixa", () => {
  assert.match(lerFrequencia(0), /Ainda não há alcance/);
  assert.match(lerFrequencia(1.05), /uma vez só/);
  assert.match(lerFrequencia(1.8), /começa a fixar/);
  assert.match(lerFrequencia(3.2), /Repetição alta/);
  assert.match(lerFrequencia(6), /desgaste/);
});

test("a leitura escreve o número em português", () => {
  // Vírgula decimal, não ponto: é um texto que vai para a tela.
  assert.match(lerFrequencia(1.8), /1,8 vezes/);
});

// --- Conversas ----------------------------------------------------------------

test("as conversas separam respondidas de pendentes", () => {
  const medida = medirConversas([
    conversa({ status: "respondido" }),
    conversa({ status: "respondido" }),
    conversa({ status: "pendente" }),
    conversa({ status: "pendente" }),
    conversa({ status: "pendente" }),
  ]);

  assert.equal(medida.recebidas, 5);
  assert.equal(medida.respondidas, 2);
  assert.equal(medida.pendentes, 3);
  assert.equal(medida.taxaDeResposta, 40);
});

test("comentário e mensagem somam no total e se separam embaixo", () => {
  const medida = medirConversas([
    conversa({ kind: "comentario" }),
    conversa({ kind: "comentario" }),
    conversa({ kind: "mensagem" }),
  ]);

  assert.equal(medida.recebidas, 3);
  assert.equal(medida.comentarios, 2);
  assert.equal(medida.mensagens, 1);
});

test("caixa vazia não vira taxa de resposta indefinida", () => {
  const medida = medirConversas([]);
  assert.equal(medida.recebidas, 0);
  assert.equal(medida.taxaDeResposta, 0);
});

test("o período recorta pela data de chegada", () => {
  const itens = [
    conversa({ receivedAt: "2026-08-01T10:00:00" }),
    conversa({ receivedAt: "2026-08-15T10:00:00" }),
    conversa({ receivedAt: "2026-08-20T10:00:00" }),
  ];

  assert.equal(noPeriodo(itens, "2026-08-10").length, 2);
  // Sem corte, tudo passa.
  assert.equal(noPeriodo(itens, null).length, 3);
});

// --- Quais peças puxam conversa -----------------------------------------------

test("as peças vêm ordenadas por quantas conversas puxaram", () => {
  const posts = [peca("p1"), peca("p2")];
  const itens = [
    conversa({ postId: "p1" }),
    conversa({ postId: "p1" }),
    conversa({ postId: "p1", status: "respondido" }),
    conversa({ postId: "p2" }),
  ];

  const ranking = pecasQuePuxamConversa(itens, posts);

  assert.equal(ranking[0].post?.id, "p1");
  assert.equal(ranking[0].recebidas, 3);
  assert.equal(ranking[0].respondidas, 1);
  assert.equal(ranking[0].pendentes, 2);
  assert.equal(ranking[1].post?.id, "p2");
});

test("conversa sem publicação de origem ganha linha própria, e o total fecha", () => {
  const posts = [peca("p1")];
  const itens = [
    conversa({ postId: "p1" }),
    conversa({ postId: null }),
    conversa({ postId: null }),
  ];

  const ranking = pecasQuePuxamConversa(itens, posts);
  const solta = ranking.find((linha) => linha.semPeca);

  assert.ok(solta, "a linha das conversas sem peça deveria existir");
  assert.equal(solta.recebidas, 2);
  // O total da lista tem de bater com o total do cartão, senão a tela se
  // contradiz e ninguém confia mais nela.
  assert.equal(
    ranking.reduce((soma, linha) => soma + linha.recebidas, 0),
    itens.length,
  );
});

test("sem conversa solta, não aparece linha de conversa solta", () => {
  const ranking = pecasQuePuxamConversa([conversa({ postId: "p1" })], [peca("p1")]);
  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].semPeca, false);
});

test("a peça que sumiu do projeto não derruba o ranking", () => {
  // A conversa aponta para uma publicação que não está mais na lista — o
  // ranking mostra a contagem com `post: null` em vez de quebrar.
  const ranking = pecasQuePuxamConversa([conversa({ postId: "apagada" })], []);
  assert.equal(ranking[0].post, null);
  assert.equal(ranking[0].recebidas, 1);
});
