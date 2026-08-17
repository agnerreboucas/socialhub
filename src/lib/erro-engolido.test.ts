import assert from "node:assert/strict";
import { test } from "node:test";

import { erroEngolidoPeloH3 } from "./erro-engolido.ts";

const JSON_H3 = "application/json";

test("reconhece o corpo que a implantação real devolveu", () => {
  // Este é o JSON exato que apareceu no ar, e é o caso que a versão anterior
  // deixava passar: não tem "message", só "unhandled".
  assert.equal(
    erroEngolidoPeloH3(500, JSON_H3, '{"error":true,"status":500,"unhandled":true}'),
    true,
  );
});

test("reconhece também a forma antiga, com message", () => {
  assert.equal(erroEngolidoPeloH3(500, JSON_H3, '{"unhandled":true,"message":"HTTPError"}'), true);
});

test("um erro de aplicação em JSON não é sequestrado", () => {
  // 500 legítimo, com corpo próprio: quem o produziu sabe o que está dizendo, e
  // trocar por uma página de erro genérica destruiria a informação.
  assert.equal(erroEngolidoPeloH3(500, JSON_H3, '{"erro":"banco fora do ar"}'), false);
});

test("resposta que não é 5xx passa direto", () => {
  assert.equal(erroEngolidoPeloH3(404, JSON_H3, '{"unhandled":true}'), false);
  assert.equal(erroEngolidoPeloH3(200, JSON_H3, '{"unhandled":true}'), false);
});

test("resposta que não é JSON passa direto", () => {
  // A nossa própria página de erro é HTML e devolve 500 — reprocessá-la seria
  // um laço.
  assert.equal(erroEngolidoPeloH3(500, "text/html; charset=utf-8", "<html>…</html>"), false);
});

test("o teste de saúde com 503 não é confundido com erro engolido", () => {
  assert.equal(
    erroEngolidoPeloH3(503, JSON_H3, '{"ok":false,"banco":"sem resposta","emPeHa":12}'),
    false,
  );
});
