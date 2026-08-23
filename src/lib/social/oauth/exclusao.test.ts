import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import { codigoDeConfirmacao, deBase64Url, respostaParaMeta, verificarPedido } from "./exclusao.ts";

const SEGREDO = "segredo-de-teste-do-aplicativo";

/** Monta um `signed_request` como a Meta monta, para exercitar o caminho real. */
function assinado(conteudo: Record<string, unknown>, segredo = SEGREDO): string {
  const corpo = Buffer.from(JSON.stringify(conteudo)).toString("base64url");
  const assinatura = createHmac("sha256", segredo).update(corpo).digest("base64url");
  return `${assinatura}.${corpo}`;
}

const assinar = (conteudo: string) =>
  createHmac("sha256", SEGREDO).update(conteudo).digest("base64url");

test("um pedido legítimo passa e diz de quem é", () => {
  const pedido = assinado({
    algorithm: "HMAC-SHA256",
    user_id: "1234567890",
    issued_at: 1_760_000_000,
  });

  const resultado = verificarPedido(pedido, assinar);

  assert.equal(resultado.ok, true);
  if (!resultado.ok) return;
  assert.equal(resultado.pedido.usuarioId, "1234567890");
  assert.equal(resultado.pedido.emitidoEm, 1_760_000_000);
});

test("assinatura de outro segredo é recusada", () => {
  // O teste que justifica o módulo existir: sem esta recusa, quem descobrir o
  // endereço apaga os dados de qualquer pessoa mandando um POST.
  const forjado = assinado(
    { algorithm: "HMAC-SHA256", user_id: "1234567890", issued_at: 1 },
    "segredo-errado",
  );

  const resultado = verificarPedido(forjado, assinar);

  assert.equal(resultado.ok, false);
  if (resultado.ok) return;
  assert.match(resultado.motivo, /assinatura não confere/i);
});

test("conteúdo alterado depois de assinado é recusado", () => {
  const original = assinado({ algorithm: "HMAC-SHA256", user_id: "111", issued_at: 1 });
  const [assinatura] = original.split(".");
  const outroCorpo = Buffer.from(
    JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "999", issued_at: 1 }),
  ).toString("base64url");

  const resultado = verificarPedido(`${assinatura}.${outroCorpo}`, assinar);
  assert.equal(resultado.ok, false);
});

test("formato quebrado não derruba o servidor", () => {
  for (const entrada of ["", "semponto", "a.b.c", ".", "a.", ".b"]) {
    const resultado = verificarPedido(entrada, assinar);
    assert.equal(resultado.ok, false, `"${entrada}" deveria ser recusado`);
  }
});

test("conteúdo que não é JSON é recusado com motivo claro", () => {
  const corpo = Buffer.from("isto não é json").toString("base64url");
  const resultado = verificarPedido(`${assinar(corpo)}.${corpo}`, assinar);

  assert.equal(resultado.ok, false);
  if (resultado.ok) return;
  assert.match(resultado.motivo, /não é um JSON válido/i);
});

test("algoritmo diferente de HMAC-SHA256 é recusado", () => {
  // Sem esta checagem, alguém proporia um algoritmo fraco e a verificação
  // aceitaria — o pedido traz o nome do algoritmo, e quem manda o pedido é
  // quem escolhe o nome.
  const pedido = assinado({ algorithm: "none", user_id: "111", issued_at: 1 });
  const resultado = verificarPedido(pedido, assinar);

  assert.equal(resultado.ok, false);
  if (resultado.ok) return;
  assert.match(resultado.motivo, /Algoritmo não suportado/i);
});

test("pedido sem usuário é recusado", () => {
  const pedido = assinado({ algorithm: "HMAC-SHA256", issued_at: 1 });
  const resultado = verificarPedido(pedido, assinar);

  assert.equal(resultado.ok, false);
  if (resultado.ok) return;
  assert.match(resultado.motivo, /não identifica o usuário/i);
});

test("a assinatura é comparada sem se importar com preenchimento", () => {
  // A Meta manda base64url sem "="; uma implementação de HMAC pode devolver
  // com. Recusar por causa disso rejeitaria pedidos legítimos.
  const pedido = assinado({ algorithm: "HMAC-SHA256", user_id: "111", issued_at: 1 });
  const comPreenchimento = (conteudo: string) =>
    `${createHmac("sha256", SEGREDO).update(conteudo).digest("base64url")}==`;

  assert.equal(verificarPedido(pedido, comPreenchimento).ok, true);
});

test("o código de confirmação é estável para o mesmo pedido", () => {
  const pedido = { usuarioId: "1234567890", emitidoEm: 1_760_000_000 };

  // Quem consultar duas vezes precisa ver o mesmo protocolo.
  assert.equal(codigoDeConfirmacao(pedido), codigoDeConfirmacao({ ...pedido }));
  assert.notEqual(codigoDeConfirmacao(pedido), codigoDeConfirmacao({ ...pedido, usuarioId: "9" }));
  assert.match(codigoDeConfirmacao(pedido), /^EX[0-9A-Z]{8}$/);
});

test("a resposta traz a URL de acompanhamento com o código", () => {
  const resposta = respostaParaMeta("https://exemplo.com.br/exclusao", "EXABC12345");

  assert.equal(resposta.confirmation_code, "EXABC12345");
  assert.match(resposta.url, /codigo=EXABC12345/);
});

test("o decodificador aguenta acento e falta de preenchimento", () => {
  const texto = JSON.stringify({ nome: "Ampliação Marketing" });
  const codificado = Buffer.from(texto).toString("base64url");
  assert.equal(deBase64Url(codificado), texto);
});
