import { acharMunicipio } from "./municipios-sp.ts";
import type { Boost } from "./types.ts";

/**
 * Onde a campanha chegou — por cidade, por estado e por região, no Brasil todo.
 *
 * Substitui o mapa do estado de São Paulo. A troca não é só visual: o mapa
 * dependia da tabela de municípios paulistas para existir, e **descartava em
 * silêncio toda cidade fora dela**. Rodando no Brasil inteiro, isso significaria
 * alcance em Salvador, Recife ou Belém simplesmente desaparecendo da tela — sem
 * erro, sem aviso, com o total do painel continuando certo e a lista de cidades
 * não fechando com ele.
 *
 * Aqui a regra é outra: **nada do que a rede informou é descartado.** O que a
 * rede escreveu vira uma linha, mesmo que a plataforma não reconheça o lugar.
 *
 * O estado e a região saem do próprio texto quando ele vem completo ("Salvador,
 * BA" ou "Salvador, Bahia"). Quando vem só o nome da cidade, a plataforma tenta
 * a lista de municípios paulistas e, se acertar, marca `ufInferida` — porque
 * "Rio Claro" existe em São Paulo e no Rio de Janeiro, e um palpite silencioso
 * colocaria entrega no estado errado. Não dando para saber, fica sem estado e a
 * tela diz "não identificada" em vez de inventar.
 *
 * Módulo puro.
 */

export type Regiao = "norte" | "nordeste" | "centro-oeste" | "sudeste" | "sul";

export const NOME_DA_REGIAO: Record<Regiao, string> = {
  norte: "Norte",
  nordeste: "Nordeste",
  "centro-oeste": "Centro-Oeste",
  sudeste: "Sudeste",
  sul: "Sul",
};

/** Ordem de exibição: a mesma que o IBGE usa, de norte para sul. */
export const REGIOES: Regiao[] = ["norte", "nordeste", "centro-oeste", "sudeste", "sul"];

export const UF_PARA_REGIAO: Record<string, Regiao> = {
  AC: "norte",
  AP: "norte",
  AM: "norte",
  PA: "norte",
  RO: "norte",
  RR: "norte",
  TO: "norte",
  AL: "nordeste",
  BA: "nordeste",
  CE: "nordeste",
  MA: "nordeste",
  PB: "nordeste",
  PE: "nordeste",
  PI: "nordeste",
  RN: "nordeste",
  SE: "nordeste",
  DF: "centro-oeste",
  GO: "centro-oeste",
  MT: "centro-oeste",
  MS: "centro-oeste",
  ES: "sudeste",
  MG: "sudeste",
  RJ: "sudeste",
  SP: "sudeste",
  PR: "sul",
  RS: "sul",
  SC: "sul",
};

export const NOME_DA_UF: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

/** Acentos fora, minúsculas, espaços encolhidos. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const UF_POR_NOME = new Map(
  Object.entries(NOME_DA_UF).map(([uf, nome]) => [normalizar(nome), uf]),
);

/** Sigla da UF a partir de "BA" ou "Bahia". Devolve `null` se não for estado. */
export function ufDoTexto(texto: string): string | null {
  const limpo = texto.trim();
  const sigla = limpo.toUpperCase();
  if (sigla.length === 2 && UF_PARA_REGIAO[sigla]) return sigla;
  return UF_POR_NOME.get(normalizar(limpo)) ?? null;
}

export type LocalLido = {
  /** Só o nome da cidade, sem o estado nem o país. */
  cidade: string;
  uf: string | null;
  regiao: Regiao | null;
  /**
   * Verdadeiro quando o estado **não** veio no texto e foi deduzido da lista de
   * municípios paulistas.
   *
   * A tela precisa diferenciar: "Campinas, SP" é informação da rede; "Campinas"
   * virando SP é dedução nossa, e nomes se repetem entre estados.
   */
  ufInferida: boolean;
};

/**
 * Lê o que a rede escreveu no campo de localidade.
 *
 * A Meta devolve coisas como "Salvador, Bahia, Brazil", "São Paulo, SP" ou só
 * "Guarulhos", dependendo do relatório e do nível de agregação. O separador pode
 * ser vírgula ou hífen. "Brazil"/"Brasil" no fim é ruído e sai.
 */
export function lerLocal(texto: string): LocalLido {
  const partes = texto
    .split(/[,–—]|\s-\s/)
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0 && !["brasil", "brazil", "br"].includes(normalizar(parte)));

  if (partes.length === 0) {
    return { cidade: texto.trim(), uf: null, regiao: null, ufInferida: false };
  }

  const cidade = partes[0];

  // O estado pode vir em qualquer posição depois da cidade: "Cidade, Região
  // Metropolitana, SP" acontece.
  for (const parte of partes.slice(1)) {
    const uf = ufDoTexto(parte);
    if (uf) return { cidade, uf, regiao: UF_PARA_REGIAO[uf], ufInferida: false };
  }

  // Veio só um pedaço e ele é um estado: o relatório agregou por UF, não por
  // cidade. A "cidade" é o próprio estado, e dizer isso é melhor que listar
  // "Bahia" como se fosse um município.
  if (partes.length === 1) {
    const uf = ufDoTexto(cidade);
    if (uf) {
      return { cidade: NOME_DA_UF[uf], uf, regiao: UF_PARA_REGIAO[uf], ufInferida: false };
    }
  }

  // Último recurso, e marcado como dedução: o nome bate com um município
  // paulista. Cobre o histórico da campanha, que nasceu em São Paulo.
  if (acharMunicipio(cidade)) {
    return { cidade, uf: "SP", regiao: "sudeste", ufInferida: true };
  }

  return { cidade, uf: null, regiao: null, ufInferida: false };
}

export type LocalAlcancado = LocalLido & {
  /** O texto exato que a rede mandou. É a chave, e é o que some se agruparmos cedo. */
  local: string;
  alcance: number;
  investido: number;
  /** IDs das publicações que entregaram aqui. */
  publicacoes: string[];
  /**
   * Verdadeiro quando o número saiu de divisão por estimativa, não de medição.
   *
   * Basta um impulsionamento repartido por estimativa para a cidade inteira
   * deixar de ser medida: quem lê "medido" tem de poder confiar que tudo ali
   * foi medido.
   */
  estimado: boolean;
  /** Fatia do alcance total, de 0 a 100. */
  fatia: number;
  custoPorMil: number | null;
};

/**
 * Cruza os impulsionamentos numa linha por localidade, da maior para a menor.
 *
 * Dois caminhos, como antes. Com a quebra por região que a rede devolve
 * (`porLocal`), cada cidade recebe o que de fato aconteceu nela. Sem ela, só
 * existe o total da campanha e a lista de lugares segmentados, e a divisão igual
 * é a única repartição possível — quase certamente errada, porque uma capital
 * não recebe o mesmo que uma cidade de treze mil habitantes. Por isso o
 * resultado sai marcado como estimado.
 */
export function alcancePorLocal(impulsionamentos: Boost[]): LocalAlcancado[] {
  const acumulado = new Map<
    string,
    { local: string; alcance: number; investido: number; posts: Set<string>; estimado: boolean }
  >();

  const guardar = (
    local: string,
    alcance: number,
    investido: number,
    postId: string,
    medido: boolean,
  ) => {
    // A chave é normalizada para "Campinas, SP" e "campinas, sp" virarem uma
    // linha só; o rótulo exibido é a primeira grafia que apareceu.
    const chave = normalizar(local);
    const atual = acumulado.get(chave) ?? {
      local: local.trim(),
      alcance: 0,
      investido: 0,
      posts: new Set<string>(),
      estimado: false,
    };
    atual.alcance += alcance;
    atual.investido += investido;
    atual.posts.add(postId);
    if (!medido) atual.estimado = true;
    acumulado.set(chave, atual);
  };

  for (const boost of impulsionamentos) {
    const quebra = boost.results.porLocal ?? [];
    if (quebra.length > 0) {
      for (const linha of quebra) {
        guardar(linha.local, linha.reach, linha.spend, boost.postId, true);
      }
      continue;
    }

    const lugares = boost.audience.locations.filter((local) => local.trim().length > 0);
    if (lugares.length === 0) continue;
    const fatia = 1 / lugares.length;

    for (const local of lugares) {
      guardar(
        local,
        boost.results.reach * fatia,
        boost.results.spend * fatia,
        boost.postId,
        false,
      );
    }
  }

  const total = [...acumulado.values()].reduce((soma, item) => soma + item.alcance, 0);

  return [...acumulado.values()]
    .map((item) => {
      const alcance = Math.round(item.alcance);
      const investido = Math.round(item.investido * 100) / 100;
      return {
        ...lerLocal(item.local),
        local: item.local,
        alcance,
        investido,
        publicacoes: [...item.posts],
        estimado: item.estimado,
        fatia: total > 0 ? (item.alcance / total) * 100 : 0,
        custoPorMil: alcance > 0 ? (investido / alcance) * 1000 : null,
      };
    })
    .sort((a, b) => b.alcance - a.alcance);
}

export type GrupoDeLocais = {
  /** Rótulo pronto para a tela. */
  nome: string;
  alcance: number;
  investido: number;
  /** Quantas localidades distintas caíram neste grupo. */
  locais: number;
  /** Fatia do alcance total, de 0 a 100. */
  fatia: number;
  custoPorMil: number | null;
  /** Verdadeiro quando alguma localidade do grupo veio de estimativa. */
  estimado: boolean;
};

function agrupar(
  locais: LocalAlcancado[],
  chave: (local: LocalAlcancado) => string,
  nome: (chave: string) => string,
): (GrupoDeLocais & { chave: string })[] {
  const total = locais.reduce((soma, local) => soma + local.alcance, 0);
  const mapa = new Map<string, LocalAlcancado[]>();

  for (const local of locais) {
    const k = chave(local);
    mapa.set(k, [...(mapa.get(k) ?? []), local]);
  }

  return [...mapa.entries()]
    .map(([k, itens]) => {
      const alcance = itens.reduce((soma, item) => soma + item.alcance, 0);
      const investido = Math.round(itens.reduce((soma, item) => soma + item.investido, 0) * 100) / 100;
      return {
        chave: k,
        nome: nome(k),
        alcance,
        investido,
        locais: itens.length,
        fatia: total > 0 ? (alcance / total) * 100 : 0,
        custoPorMil: alcance > 0 ? (investido / alcance) * 1000 : null,
        estimado: itens.some((item) => item.estimado),
      };
    })
    .sort((a, b) => b.alcance - a.alcance);
}

/** Chave usada quando a plataforma não sabe de onde é a entrega. */
export const SEM_REGIAO = "nao-identificada";

export function alcancePorRegiao(locais: LocalAlcancado[]): (GrupoDeLocais & { chave: string })[] {
  return agrupar(
    locais,
    (local) => local.regiao ?? SEM_REGIAO,
    (chave) => (chave === SEM_REGIAO ? "Não identificada" : NOME_DA_REGIAO[chave as Regiao]),
  );
}

export function alcancePorUf(locais: LocalAlcancado[]): (GrupoDeLocais & { chave: string })[] {
  return agrupar(
    locais,
    (local) => local.uf ?? SEM_REGIAO,
    (chave) => (chave === SEM_REGIAO ? "Não identificado" : `${NOME_DA_UF[chave]} (${chave})`),
  );
}

export type TotaisDeLocalidade = {
  locais: number;
  cidades: number;
  estados: number;
  regioes: number;
  alcance: number;
  investido: number;
  custoPorMil: number | null;
  /** Localidades cujo número foi medido pela rede, não repartido por estimativa. */
  medidas: number;
  estimadas: number;
  /** Localidades sem estado identificado — o tamanho do ponto cego. */
  semEstado: number;
};

export function totalizarLocalidades(locais: LocalAlcancado[]): TotaisDeLocalidade {
  const alcance = locais.reduce((soma, local) => soma + local.alcance, 0);
  const investido = Math.round(locais.reduce((soma, local) => soma + local.investido, 0) * 100) / 100;

  return {
    locais: locais.length,
    cidades: new Set(locais.map((local) => normalizar(local.cidade))).size,
    estados: new Set(locais.map((local) => local.uf).filter(Boolean)).size,
    regioes: new Set(locais.map((local) => local.regiao).filter(Boolean)).size,
    alcance,
    investido,
    custoPorMil: alcance > 0 ? (investido / alcance) * 1000 : null,
    medidas: locais.filter((local) => !local.estimado).length,
    estimadas: locais.filter((local) => local.estimado).length,
    semEstado: locais.filter((local) => local.uf === null).length,
  };
}

/** Filtra por região, aceitando `null` para "todas". */
export function locaisDaRegiao(
  locais: LocalAlcancado[],
  regiao: Regiao | typeof SEM_REGIAO | null,
): LocalAlcancado[] {
  if (regiao === null) return locais;
  if (regiao === SEM_REGIAO) return locais.filter((local) => local.regiao === null);
  return locais.filter((local) => local.regiao === regiao);
}

/** Busca por nome de cidade ou estado, sem acento e sem caixa. */
export function buscarLocais(locais: LocalAlcancado[], termo: string): LocalAlcancado[] {
  const busca = normalizar(termo);
  if (busca.length === 0) return locais;
  return locais.filter((local) => {
    const estado = local.uf ? `${local.uf} ${NOME_DA_UF[local.uf] ?? ""}` : "";
    return normalizar(`${local.local} ${local.cidade} ${estado}`).includes(busca);
  });
}
