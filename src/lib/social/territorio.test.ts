import assert from "node:assert/strict";
import { test } from "node:test";

import { acharMunicipio, MUNICIPIOS_SP } from "./municipios-sp.ts";
import {
  BLOCOS_DO_TOP_100,
  CAMADAS,
  EIXOS,
  blocoDaPosicao,
  camadaDaPosicao,
  conferirTop100,
  eixosDoMunicipio,
  fichaDoMunicipio,
  municipiosDaCamada,
  municipiosDoEixo,
  presencaSugerida,
  tamanhoDasCamadas,
} from "./territorio.ts";

test("a lista de eixos está casada com o ranking, município a município", () => {
  // O teste que protege a lista posicional: se alguém inserir um município na
  // matriz do IPS, os eixos passam a apontar para a cidade errada sem nenhum
  // erro de compilação. Aqui isso vira uma falha imediata, com o nome dos dois.
  assert.deepEqual(conferirTop100(), []);
});

test("as camadas cobrem o ranking inteiro, sem buraco e sem sobreposição", () => {
  assert.equal(camadaDaPosicao(1)?.id, "top100");
  assert.equal(camadaDaPosicao(100)?.id, "top100");
  assert.equal(camadaDaPosicao(101)?.id, "top200");
  assert.equal(camadaDaPosicao(200)?.id, "top200");
  assert.equal(camadaDaPosicao(201)?.id, "top300");
  assert.equal(camadaDaPosicao(300)?.id, "top300");
  assert.equal(camadaDaPosicao(301)?.id, "cobertura");
  assert.equal(camadaDaPosicao(600)?.id, "cobertura");
});

test("município sem posição no IPS não ganha camada inventada", () => {
  // São 45 na matriz. Dar-lhes uma camada seria classificar quem a metodologia
  // ainda não classificou.
  assert.equal(camadaDaPosicao(null), null);
  const semPosicao = MUNICIPIOS_SP.filter((m) => m.posicao === null);
  assert.ok(semPosicao.length > 0, "a matriz deveria ter municípios sem posição");
  for (const municipio of semPosicao) {
    assert.equal(fichaDoMunicipio(municipio).camada, null, municipio.nome);
  }
});

test("os dez blocos cobrem as cem primeiras posições, dez a dez", () => {
  assert.equal(BLOCOS_DO_TOP_100.length, 10);
  assert.equal(blocoDaPosicao(1)?.numero, 1);
  assert.equal(blocoDaPosicao(10)?.numero, 1);
  assert.equal(blocoDaPosicao(11)?.numero, 2);
  assert.equal(blocoDaPosicao(100)?.numero, 10);
  // Fora do Top 100 não há bloco: o anexo só desenhou os dez primeiros.
  assert.equal(blocoDaPosicao(101), null);

  for (let posicao = 1; posicao <= 100; posicao += 1) {
    assert.ok(blocoDaPosicao(posicao), `posição ${posicao} ficou sem bloco`);
  }
});

test("cada município do Top 100 tem pelo menos um eixo de entrada", () => {
  for (const municipio of municipiosDaCamada("top100")) {
    const eixos = eixosDoMunicipio(municipio);
    assert.ok(eixos.length > 0, `${municipio.nome} ficou sem eixo`);
  }
});

test("fora do Top 100 o eixo é vazio, e isso é a resposta certa", () => {
  const daSegundaCamada = municipiosDaCamada("top200")[0];
  assert.ok(daSegundaCamada, "deveria haver municípios na segunda camada");
  // O anexo só fez a leitura estratégica das cem primeiras. Atribuir um eixo às
  // outras 545 a partir de nada seria inventar orientação de campanha.
  assert.deepEqual(eixosDoMunicipio(daSegundaCamada), []);
});

test("os eixos do anexo batem com o que a ficha mostra", () => {
  const guarulhos = acharMunicipio("Guarulhos");
  assert.ok(guarulhos);

  const ficha = fichaDoMunicipio(guarulhos);
  assert.equal(ficha.municipio.posicao, 2);
  assert.equal(ficha.camada?.id, "top100");
  assert.equal(ficha.bloco?.numero, 1);
  assert.equal(ficha.presencaSugerida, "A");
  // "Saúde, mobilidade, trabalho e direitos" — saúde é a porta de entrada.
  assert.equal(ficha.eixos[0].id, "saude");
  assert.deepEqual(
    ficha.eixos.map((eixo) => eixo.id),
    ["saude", "cidade", "trabalho", "direitos"],
  );
});

test("São Carlos entra por educação, como o documento exemplifica", () => {
  const saoCarlos = acharMunicipio("São Carlos");
  assert.ok(saoCarlos);
  assert.equal(eixosDoMunicipio(saoCarlos)[0].id, "educacao");
});

test("a presença sugerida acompanha a camada", () => {
  assert.equal(presencaSugerida(1), "A");
  assert.equal(presencaSugerida(100), "A");
  assert.equal(presencaSugerida(150), "B");
  assert.equal(presencaSugerida(300), "B");
  assert.equal(presencaSugerida(400), "C");
  // Sem posição no ranking, o nível mais leve — não o mais pesado.
  assert.equal(presencaSugerida(null), "C");
});

test("a primeira camada tem exatamente cem municípios", () => {
  assert.equal(municipiosDaCamada("top100").length, 100);
  assert.equal(municipiosDaCamada("top200").length, 100);
  assert.equal(municipiosDaCamada("top300").length, 100);
});

test("a soma das camadas é o total de municípios pontuados", () => {
  const pontuados = MUNICIPIOS_SP.filter((m) => m.posicao !== null).length;
  const soma = tamanhoDasCamadas().reduce((total, item) => total + item.municipios, 0);
  assert.equal(soma, pontuados);
});

test("dá para perguntar onde uma pauta abre porta", () => {
  const daSaude = municipiosDoEixo("saude");

  assert.ok(daSaude.some((m) => m.nome === "Guarulhos"));
  // Conta o eixo em qualquer posição, principal ou secundário: quem procura
  // território para uma pauta não quer só os que a têm como primeira.
  assert.ok(daSaude.some((m) => m.nome === "Sorocaba"));
  // E só olha o Top 100, que é onde existe leitura estratégica.
  assert.ok(daSaude.every((m) => (m.posicao ?? 999) <= 100));
});

test("todo eixo citado no Top 100 existe na lista dos sete", () => {
  const conhecidos = new Set(EIXOS.map((eixo) => eixo.id));
  for (const municipio of municipiosDaCamada("top100")) {
    for (const eixo of eixosDoMunicipio(municipio)) {
      assert.ok(conhecidos.has(eixo.id), `${municipio.nome}: eixo ${eixo.id} não existe`);
    }
  }
});

test("as camadas vêm na ordem da expansão", () => {
  assert.deepEqual(
    CAMADAS.map((camada) => camada.ate),
    [100, 200, 300, 645],
  );
});
