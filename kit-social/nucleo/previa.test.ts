import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CORTE_DO_FEED,
  avisosDaPrevia,
  cortarLegenda,
  gradeDoPerfil,
  hashtagsDaLegenda,
  mencoesDaLegenda,
  pedacosDaLegenda,
  razaoDaProporcao,
} from "./previa.ts";
import type { PostMedia } from "./types.ts";

const MIDIA: PostMedia = { count: 1, aspectRatio: "4:5", fileSizeMb: 2 };

test("legenda curta não é cortada", () => {
  const corte = cortarLegenda("Bom dia, São Paulo.");
  assert.equal(corte.cortada, false);
  assert.equal(corte.visivel, "Bom dia, São Paulo.");
  assert.equal(corte.escondido, "");
});

test("legenda longa corta em palavra inteira e o resto fica escondido", () => {
  const legenda = "palavra ".repeat(40).trim();
  const corte = cortarLegenda(legenda);

  assert.equal(corte.cortada, true);
  assert.ok(corte.visivel.length <= CORTE_DO_FEED);
  assert.ok(!corte.visivel.endsWith("palavr"), "não corta no meio da palavra");
  assert.equal(`${corte.visivel} ${corte.escondido}`, legenda, "nada se perde no corte");
});

test("a legenda é separada no que o Instagram pinta de azul", () => {
  const pedacos = pedacosDaLegenda("Olha isso @neoncunha no site https://exemplo.org #campanha");

  assert.deepEqual(
    pedacos.map((p) => p.tipo),
    ["texto", "mencao", "texto", "link", "texto", "hashtag"],
  );
  assert.equal(pedacos.map((p) => p.texto).join(""), "Olha isso @neoncunha no site https://exemplo.org #campanha");
});

test("marcações com acento contam como marcação", () => {
  assert.deepEqual(hashtagsDaLegenda("vamos #educação #saúde2026"), ["#educação", "#saúde2026"]);
});

test("menções e marcações são lidas separadamente", () => {
  assert.deepEqual(mencoesDaLegenda("obrigada @ampliacao.mkt #parceria"), ["@ampliacao.mkt"]);
  assert.deepEqual(hashtagsDaLegenda("obrigada @ampliacao.mkt #parceria"), ["#parceria"]);
});

test("texto sem marcação nenhuma volta inteiro", () => {
  const pedacos = pedacosDaLegenda("só texto corrido");
  assert.deepEqual(pedacos, [{ tipo: "texto", texto: "só texto corrido" }]);
});

test("legenda vazia não quebra", () => {
  assert.deepEqual(pedacosDaLegenda(""), []);
  assert.equal(cortarLegenda("").cortada, false);
});

test("passar de 30 marcações é erro, porque a rede recusa", () => {
  const legenda = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(" ");
  const avisos = avisosDaPrevia({ legenda, media: MIDIA, formato: "imagem" });

  const erro = avisos.find((aviso) => aviso.gravidade === "erro");
  assert.ok(erro, "a recusa da rede não é detalhe de estilo");
  assert.match(erro!.mensagem, /31 marcações/);
});

test("30 marcações exatas passam", () => {
  const legenda = Array.from({ length: 30 }, (_, i) => `#tag${i}`).join(" ");
  const avisos = avisosDaPrevia({ legenda, media: MIDIA, formato: "imagem" });
  assert.equal(avisos.filter((aviso) => aviso.gravidade === "erro").length, 0);
});

test("arte 9:16 no feed avisa do recorte", () => {
  const avisos = avisosDaPrevia({
    legenda: "Tudo certo.",
    media: { ...MIDIA, aspectRatio: "9:16" },
    formato: "imagem",
  });
  assert.ok(avisos.some((aviso) => /recortar/i.test(aviso.mensagem)));
});

test("story fora de 9:16 avisa", () => {
  const avisos = avisosDaPrevia({
    legenda: "Tudo certo.",
    media: { ...MIDIA, aspectRatio: "1:1" },
    formato: "story",
  });
  assert.ok(avisos.some((aviso) => /Story é 9:16/.test(aviso.mensagem)));
});

test("story em 9:16 não avisa de proporção", () => {
  const avisos = avisosDaPrevia({
    legenda: "Tudo certo.",
    media: { ...MIDIA, aspectRatio: "9:16" },
    formato: "story",
  });
  assert.equal(avisos.filter((aviso) => /9:16/.test(aviso.mensagem)).length, 0);
});

test("legenda vazia é avisada", () => {
  const avisos = avisosDaPrevia({ legenda: "   ", media: MIDIA, formato: "imagem" });
  assert.ok(avisos.some((aviso) => /Sem legenda/.test(aviso.mensagem)));
});

test("corte no meio da frase é avisado; corte em ponto final não", () => {
  const meio = `${"palavra ".repeat(30)}fim`;
  assert.ok(
    avisosDaPrevia({ legenda: meio, media: MIDIA, formato: "imagem" }).some((aviso) =>
      /meio da frase/.test(aviso.mensagem),
    ),
  );

  // Uma legenda cuja frase fecha exatamente onde o feed corta lê bem sem abrir
  // o "mais" — e aí não há o que avisar.
  const comPonto = `${"palavra ".repeat(15).trim()}. ${"resto ".repeat(20).trim()}`;
  assert.equal(
    avisosDaPrevia({ legenda: comPonto, media: MIDIA, formato: "imagem" }).filter((aviso) =>
      /meio da frase/.test(aviso.mensagem),
    ).length,
    0,
  );
});

test("legenda que abre por marcação é avisada", () => {
  const avisos = avisosDaPrevia({
    legenda: "#eleicoes2026 a campanha chegou em Guarulhos.",
    media: MIDIA,
    formato: "imagem",
  });
  assert.ok(avisos.some((aviso) => /começa por marcação/.test(aviso.mensagem)));
});

test("peça redonda não gera aviso nenhum", () => {
  const avisos = avisosDaPrevia({
    legenda: "A campanha chegou em Guarulhos hoje. Veja como foi.",
    media: MIDIA,
    formato: "imagem",
  });
  assert.deepEqual(avisos, []);
});

test("a razão da proporção é calculada e não tabelada", () => {
  assert.equal(razaoDaProporcao("1:1"), 1);
  assert.equal(razaoDaProporcao("4:5"), 0.8);
  assert.equal(razaoDaProporcao("16:9"), 16 / 9);
});

function peca(
  id: string,
  { publishedAt = null as string | null, scheduledFor = null as string | null, format = "imagem" },
) {
  return {
    id,
    caption: `legenda de ${id}`,
    format,
    coverGradient: "",
    publishedAt,
    scheduledFor,
  };
}

test("a grade mostra a mais recente primeiro, com as agendadas no topo", () => {
  const grade = gradeDoPerfil([
    peca("p1", { publishedAt: "2026-09-01T10:00:00Z" }),
    peca("p3", { scheduledFor: "2026-10-20T10:00:00Z" }),
    peca("p2", { publishedAt: "2026-09-15T10:00:00Z" }),
  ]);

  assert.deepEqual(
    grade.map((item) => item.id),
    ["p3", "p2", "p1"],
  );
  assert.equal(grade[0].futura, true, "a agendada aparece como o que vai acontecer");
  assert.equal(grade[1].futura, false);
});

test("story fica fora da grade, porque não entra no perfil", () => {
  const grade = gradeDoPerfil([
    peca("s1", { publishedAt: "2026-09-20T10:00:00Z", format: "story" }),
    peca("p1", { publishedAt: "2026-09-01T10:00:00Z" }),
  ]);
  assert.deepEqual(
    grade.map((item) => item.id),
    ["p1"],
  );
});

test("peça sem data nenhuma não tem lugar na grade", () => {
  assert.deepEqual(gradeDoPerfil([peca("p1", {})]), []);
});

test("a grade respeita o limite pedido", () => {
  const pecas = Array.from({ length: 20 }, (_, i) =>
    peca(`p${i}`, { publishedAt: `2026-09-${String((i % 28) + 1).padStart(2, "0")}T10:00:00Z` }),
  );
  assert.equal(gradeDoPerfil(pecas).length, 9);
  assert.equal(gradeDoPerfil(pecas, 12).length, 12);
});
