import assert from "node:assert/strict";
import { test } from "node:test";

import { APLICATIVOS, aplicativoDaRota, porProduto } from "./aplicativos.ts";

test("a rota de dentro de um aplicativo encontra o aplicativo", () => {
  assert.equal(aplicativoDaRota("/social/agenda")?.nome, "Social Hub");
  assert.equal(aplicativoDaRota("/social")?.nome, "Social Hub");
  assert.equal(aplicativoDaRota("/radio")?.nome, "Rádio");
});

test("um caminho parecido não casa com o aplicativo errado", () => {
  // "/relogios" começa com "/rel", não com "/radio" — e nenhuma rota da rádio
  // pode capturar uma que não é dela só por ser mais curta.
  assert.equal(aplicativoDaRota("/relogios")?.nome, "Relógios");
  // E o prefixo tem de ser de segmento inteiro: "/socialzinho" não é o Social.
  assert.equal(aplicativoDaRota("/socialzinho"), null);
});

test("rota que não é de aplicativo nenhum devolve nulo", () => {
  assert.equal(aplicativoDaRota("/social_/entrar"), null);
  assert.equal(aplicativoDaRota("/qualquer-coisa"), null);
});

test("os aplicativos vêm agrupados por produto, sem repetir grupo", () => {
  const grupos = porProduto();
  assert.deepEqual(
    grupos.map((grupo) => grupo.produto),
    ["radio", "social"],
  );
  // Todo aplicativo cai em exatamente um grupo — nenhum some, nenhum duplica.
  assert.equal(
    grupos.reduce((total, grupo) => total + grupo.apps.length, 0),
    APLICATIVOS.length,
  );
});

test("todo aplicativo tem rota única", () => {
  const rotas = APLICATIVOS.map((app) => app.to);
  assert.equal(new Set(rotas).size, rotas.length);
});
