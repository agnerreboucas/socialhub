import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SEM_REGIAO,
  alcancePorLocal,
  alcancePorRegiao,
  alcancePorUf,
  buscarLocais,
  lerLocal,
  locaisDaRegiao,
  totalizarLocalidades,
  ufDoTexto,
} from "./localidades.ts";
import type { Boost } from "./types.ts";

/**
 * A dedução que os testes injetam, no lugar da matriz de municípios.
 *
 * Mantém o teste do módulo independente de qualquer tabela de cidades: o que
 * está sendo verificado é que a dedução entra marcada, não qual lista acertou.
 */
const DEDUZ_SP = (cidade: string) =>
  ["Guarulhos", "Campinas", "Osasco", "Sorocaba"].includes(cidade) ? "SP" : null;

function anuncio(
  postId: string,
  { locais = [] as string[], porLocal, reach = 0, spend = 0 }: {
    locais?: string[];
    porLocal?: { local: string; reach: number; spend: number }[];
    reach?: number;
    spend?: number;
  },
): Boost {
  return {
    id: `b-${postId}-${porLocal ? "medido" : "estimado"}`,
    postId,
    accountId: "acc-1",
    objective: "alcance",
    budgetTotal: spend,
    durationDays: 7,
    startedAt: "2026-09-01T00:00:00Z",
    endsAt: "2026-09-08T00:00:00Z",
    status: "encerrado",
    audience: { locations: locais, ageMin: 18, ageMax: 65, interests: [] },
    results: { spend, reach, impressions: reach * 2, engagement: 0, clicks: 0, porLocal },
  };
}

test("o estado sai do texto quando a rede manda a sigla ou o nome", () => {
  assert.equal(ufDoTexto("BA"), "BA");
  assert.equal(ufDoTexto("ba"), "BA");
  assert.equal(ufDoTexto("Bahia"), "BA");
  assert.equal(ufDoTexto("Espirito Santo"), "ES");
  assert.equal(ufDoTexto("Brasil"), null);
});

test("lê cidade, estado e região de um texto completo", () => {
  const lido = lerLocal("Salvador, Bahia, Brazil");
  assert.equal(lido.cidade, "Salvador");
  assert.equal(lido.uf, "BA");
  assert.equal(lido.regiao, "nordeste");
  assert.equal(lido.ufInferida, false);
});

test("aceita sigla, hífen e estado em terceira posição", () => {
  assert.equal(lerLocal("Recife - PE").uf, "PE");
  assert.equal(lerLocal("Curitiba, Região Metropolitana, PR").uf, "PR");
  assert.equal(lerLocal("Curitiba, Região Metropolitana, PR").cidade, "Curitiba");
});

test("cidade sem estado no texto e sem dedução fica sem estado, não chuta", () => {
  // Chutar aqui colocaria entrega no estado errado e ninguém veria o erro.
  const lido = lerLocal("Juazeiro do Norte", DEDUZ_SP);
  assert.equal(lido.uf, null);
  assert.equal(lido.regiao, null);
  assert.equal(lido.cidade, "Juazeiro do Norte");
});

test("nome que a dedução reconhece ganha estado, mas marcado como dedução", () => {
  const lido = lerLocal("Guarulhos", DEDUZ_SP);
  assert.equal(lido.uf, "SP");
  assert.equal(lido.regiao, "sudeste");
  assert.equal(lido.ufInferida, true, "a tela precisa saber que isso é dedução nossa");
});

test("relatório agregado por estado não aparece como se fosse cidade", () => {
  const lido = lerLocal("Pernambuco");
  assert.equal(lido.uf, "PE");
  assert.equal(lido.cidade, "Pernambuco");
  assert.equal(lido.ufInferida, false);
});

test("nenhuma localidade informada pela rede é descartada", () => {
  // Era o furo do mapa: cidade fora da tabela paulista desaparecia da tela, e o
  // total do painel continuava certo sem a lista fechar com ele.
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Salvador, BA", reach: 4000, spend: 200 },
        { local: "Belém, PA", reach: 1500, spend: 90 },
        { local: "Lugar Que Não Existe", reach: 300, spend: 10 },
      ],
    }),
  ]);

  assert.equal(locais.length, 3);
  assert.equal(
    locais.reduce((soma, local) => soma + local.alcance, 0),
    5800,
    "a soma das cidades tem de fechar com o total entregue",
  );
});

test("a lista vem da maior para a menor, com a fatia de cada uma", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Recife, PE", reach: 2500, spend: 100 },
        { local: "São Paulo, SP", reach: 7500, spend: 300 },
      ],
    }),
  ]);

  assert.deepEqual(
    locais.map((local) => local.cidade),
    ["São Paulo", "Recife"],
  );
  assert.equal(locais[0].fatia, 75);
  assert.equal(locais[1].fatia, 25);
});

test("mesma cidade em grafias diferentes é uma linha só", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Campinas, SP", reach: 1000, spend: 50 },
        { local: "campinas, sp", reach: 500, spend: 25 },
      ],
    }),
  ]);

  assert.equal(locais.length, 1);
  assert.equal(locais[0].alcance, 1500);
  assert.equal(locais[0].local, "Campinas, SP", "o rótulo é a primeira grafia que apareceu");
});

test("sem quebra por região, o total é repartido igualmente e sai marcado", () => {
  const locais = alcancePorLocal([
    anuncio("p1", { locais: ["Fortaleza, CE", "Natal, RN"], reach: 6000, spend: 300 }),
  ]);

  assert.equal(locais.length, 2);
  assert.equal(locais[0].alcance, 3000);
  assert.ok(
    locais.every((local) => local.estimado),
    "divisão igual é quase certamente errada — a tela tem de dizer isso",
  );
});

test("basta um impulsionamento estimado para a cidade deixar de ser medida", () => {
  const locais = alcancePorLocal([
    anuncio("p1", { porLocal: [{ local: "Goiânia, GO", reach: 2000, spend: 100 }] }),
    anuncio("p2", { locais: ["Goiânia, GO"], reach: 1000, spend: 60 }),
  ]);

  assert.equal(locais.length, 1);
  assert.equal(locais[0].alcance, 3000);
  assert.equal(locais[0].estimado, true);
  assert.equal(locais[0].publicacoes.length, 2);
});

test("o custo por mil usa o alcance da própria localidade", () => {
  const locais = alcancePorLocal([
    anuncio("p1", { porLocal: [{ local: "Manaus, AM", reach: 10_000, spend: 400 }] }),
  ]);
  assert.equal(locais[0].custoPorMil, 40);
});

test("sem localidade nenhuma, não há linha", () => {
  assert.deepEqual(alcancePorLocal([anuncio("p1", { locais: [], reach: 5000, spend: 200 })]), []);
  assert.deepEqual(alcancePorLocal([]), []);
});

test("as regiões somam o alcance e aparecem da maior para a menor", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Salvador, BA", reach: 3000, spend: 150 },
        { local: "Recife, PE", reach: 2000, spend: 100 },
        { local: "São Paulo, SP", reach: 4000, spend: 200 },
        { local: "Porto Alegre, RS", reach: 1000, spend: 50 },
      ],
    }),
  ]);

  const regioes = alcancePorRegiao(locais);
  assert.deepEqual(
    regioes.map((r) => r.nome),
    ["Nordeste", "Sudeste", "Sul"],
  );
  assert.equal(regioes[0].alcance, 5000);
  assert.equal(regioes[0].locais, 2);
  assert.equal(regioes[0].fatia, 50);
});

test("entrega sem estado identificado vira um grupo próprio, não some", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Recife, PE", reach: 1000, spend: 50 },
        { local: "Lugar Desconhecido", reach: 1000, spend: 50 },
      ],
    }),
  ]);

  const regioes = alcancePorRegiao(locais);
  assert.equal(regioes.length, 2);
  assert.ok(regioes.some((r) => r.chave === SEM_REGIAO && r.alcance === 1000));
});

test("o agrupamento por estado usa a sigla e o nome", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Salvador, BA", reach: 2000, spend: 100 },
        { local: "Feira de Santana, BA", reach: 1000, spend: 50 },
      ],
    }),
  ]);

  const estados = alcancePorUf(locais);
  assert.equal(estados.length, 1);
  assert.equal(estados[0].nome, "Bahia (BA)");
  assert.equal(estados[0].alcance, 3000);
  assert.equal(estados[0].locais, 2);
});

test("os totais contam cidades, estados, regiões e o ponto cego", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Salvador, BA", reach: 3000, spend: 150 },
        { local: "São Paulo, SP", reach: 5000, spend: 250 },
        { local: "Lugar Desconhecido", reach: 2000, spend: 100 },
      ],
    }),
  ]);

  const totais = totalizarLocalidades(locais);
  assert.equal(totais.locais, 3);
  assert.equal(totais.cidades, 3);
  assert.equal(totais.estados, 2);
  assert.equal(totais.regioes, 2);
  assert.equal(totais.alcance, 10_000);
  assert.equal(totais.investido, 500);
  assert.equal(totais.custoPorMil, 50);
  assert.equal(totais.medidas, 3);
  assert.equal(totais.estimadas, 0);
  assert.equal(totais.semEstado, 1, "o tamanho do ponto cego é informação, não detalhe");
});

test("conjunto vazio não quebra os totais", () => {
  const totais = totalizarLocalidades([]);
  assert.equal(totais.locais, 0);
  assert.equal(totais.alcance, 0);
  assert.equal(totais.custoPorMil, null);
});

test("filtrar por região", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Salvador, BA", reach: 1000, spend: 50 },
        { local: "Curitiba, PR", reach: 1000, spend: 50 },
        { local: "Lugar Desconhecido", reach: 1000, spend: 50 },
      ],
    }),
  ]);

  assert.equal(locaisDaRegiao(locais, null).length, 3);
  assert.equal(locaisDaRegiao(locais, "nordeste").length, 1);
  assert.equal(locaisDaRegiao(locais, SEM_REGIAO)[0].cidade, "Lugar Desconhecido");
});

test("a busca ignora acento e caixa, e acha pelo estado também", () => {
  const locais = alcancePorLocal([
    anuncio("p1", {
      porLocal: [
        { local: "Goiânia, GO", reach: 1000, spend: 50 },
        { local: "Recife, PE", reach: 1000, spend: 50 },
      ],
    }),
  ]);

  assert.equal(buscarLocais(locais, "goiania")[0].cidade, "Goiânia");
  assert.equal(buscarLocais(locais, "PERNAMBUCO")[0].cidade, "Recife");
  assert.equal(buscarLocais(locais, "").length, 2);
  assert.equal(buscarLocais(locais, "xyz").length, 0);
});

test("sem dedução injetada, cidade sozinha nunca ganha estado", () => {
  // Garante que o módulo não carrega tabela de cidade nenhuma por dentro: é o
  // que o torna copiável para outro projeto sem arrastar 645 municípios.
  const lido = lerLocal("Guarulhos");
  assert.equal(lido.uf, null);
  assert.equal(lido.ufInferida, false);
});

test("a dedução vale também na lista inteira", () => {
  const locais = alcancePorLocal(
    [anuncio("p1", { porLocal: [{ local: "Campinas", reach: 1000, spend: 50 }] })],
    (cidade) => (cidade === "Campinas" ? "SP" : null),
  );

  assert.equal(locais[0].uf, "SP");
  assert.equal(locais[0].ufInferida, true);
  assert.equal(alcancePorRegiao(locais)[0].nome, "Sudeste");
});
