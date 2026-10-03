import type { Boost, Post, SocialAccount } from "./types.ts";

/**
 * Cada peça, com o que veio de graça e o que foi pago.
 *
 * O Painel já separava orgânico de pago **no total do dia**. Isso responde
 * "quanto do alcance eu comprei?" e não responde a pergunta seguinte, que é a
 * que decide o próximo investimento: **qual peça rendeu com dinheiro e qual
 * rendeu sozinha?** Uma campanha pode ter alcance pago alto e estar queimando
 * verba em três peças ruins enquanto a melhor nunca foi impulsionada.
 *
 * Duas decisões governam os números aqui, e as duas são sobre não mentir.
 *
 * **O pago é subtraído do total, não somado a ele.** A rede reporta as métricas
 * da publicação já incluindo o que o impulsionamento trouxe — é o mesmo post.
 * Então orgânico = total − pago. Somar os dois contaria o alcance comprado duas
 * vezes e inflaria tudo.
 *
 * **Quando a subtração não fecha, a peça é marcada.** Alcance pago maior que o
 * total acontece de verdade: a rede estima alcance por caminhos diferentes para
 * o post e para o anúncio, e os números não batem na casa decimal. O orgânico
 * vai a zero com o piso e a peça sai com `inconsistente`, para a tela poder
 * dizer que ali o corte é aproximado — em vez de mostrar um zero que parece
 * medido.
 *
 * Módulo puro.
 */

export type RecorteDaPeca = {
  post: Post;
  /** As contas em que a peça saiu, para a tela mostrar as redes. */
  redes: string[];
  /** Impulsionamentos que apontam para esta peça. */
  impulsionamentos: Boost[];

  alcanceTotal: number;
  alcancePago: number;
  alcanceOrganico: number;

  impressoesTotal: number;

  interacoes: number;
  comentarios: number;
  /** Cliques no link: do orgânico quando a rede informa, mais os do anúncio. */
  cliques: number | null;

  investido: number;
  /** Custo por mil pessoas alcançadas pelo anúncio. Nulo sem investimento. */
  custoPorMil: number | null;

  /**
   * Verdadeiro quando o alcance pago informado passa do total da peça.
   *
   * Não é erro de cálculo nosso: a rede estima os dois por caminhos diferentes.
   * Mas quem olha a tela precisa saber que ali o corte entre orgânico e pago é
   * aproximado.
   */
  inconsistente: boolean;
};

/** Soma as interações que a rede devolve para a peça. */
function interacoesDe(post: Post): number {
  const m = post.metrics;
  if (!m) return 0;
  return m.likes + m.comments + m.shares + m.saves;
}

/**
 * Cruza publicações e impulsionamentos numa linha por peça.
 *
 * Só peças publicadas e com métricas entram: uma peça agendada não tem
 * desempenho a comparar, e listá-la com zeros faria a média despencar sem que
 * nada tivesse acontecido.
 */
export function recortarPecas(
  posts: Post[],
  boosts: Boost[],
  contas: SocialAccount[] = [],
): RecorteDaPeca[] {
  const redeDaConta = new Map(contas.map((conta) => [conta.id, conta.networkId as string]));

  return posts
    .filter((post) => post.status === "publicado" && post.metrics)
    .map((post) => {
      const daPeca = boosts.filter((boost) => boost.postId === post.id);

      const alcanceTotal = post.metrics!.reach;
      const alcancePago = daPeca.reduce((soma, boost) => soma + boost.results.reach, 0);
      const investido = daPeca.reduce((soma, boost) => soma + boost.results.spend, 0);
      const cliquesDoAnuncio = daPeca.reduce((soma, boost) => soma + boost.results.clicks, 0);

      const cliquesOrganicos = post.metrics!.clicks;
      // `null` quando ninguém informou nada — nem a rede para o orgânico, nem
      // houve anúncio. É diferente de zero, e a tela mostra "—".
      const cliques =
        cliquesOrganicos === undefined && daPeca.length === 0
          ? null
          : (cliquesOrganicos ?? 0) + cliquesDoAnuncio;

      return {
        post,
        redes: [
          ...new Set(
            post.accountIds
              .map((id) => redeDaConta.get(id))
              .filter((rede): rede is string => Boolean(rede)),
          ),
        ],
        impulsionamentos: daPeca,
        alcanceTotal,
        alcancePago,
        alcanceOrganico: Math.max(0, alcanceTotal - alcancePago),
        impressoesTotal: post.metrics!.impressions,
        interacoes: interacoesDe(post),
        comentarios: post.metrics!.comments,
        cliques,
        investido,
        custoPorMil: alcancePago > 0 ? (investido / alcancePago) * 1000 : null,
        inconsistente: alcancePago > alcanceTotal,
      };
    });
}

export type OrdemDoRecorte =
  | "alcance"
  | "organico"
  | "pago"
  | "interacoes"
  | "comentarios"
  | "cliques"
  | "investido";

/**
 * Ordena o recorte, sempre do maior para o menor.
 *
 * Decrescente e não configurável porque a pergunta de um painel é sempre "o que
 * mais rendeu" — e uma tabela que às vezes começa pelo pior faz a pessoa
 * conferir a seta antes de ler o primeiro número.
 */
export function ordenarRecorte(
  pecas: RecorteDaPeca[],
  ordem: OrdemDoRecorte,
): RecorteDaPeca[] {
  const valor = (peca: RecorteDaPeca): number => {
    switch (ordem) {
      case "organico":
        return peca.alcanceOrganico;
      case "pago":
        return peca.alcancePago;
      case "interacoes":
        return peca.interacoes;
      case "comentarios":
        return peca.comentarios;
      case "cliques":
        return peca.cliques ?? -1;
      case "investido":
        return peca.investido;
      default:
        return peca.alcanceTotal;
    }
  };

  return [...pecas].sort((a, b) => valor(b) - valor(a));
}

export type TotaisDoRecorte = {
  pecas: number;
  impulsionadas: number;
  alcanceTotal: number;
  alcanceOrganico: number;
  alcancePago: number;
  interacoes: number;
  comentarios: number;
  cliques: number | null;
  investido: number;
  custoPorMil: number | null;
  /** Fatia do alcance que veio de anúncio, de 0 a 100. */
  fatiaPaga: number;
};

export function totalizarRecorte(pecas: RecorteDaPeca[]): TotaisDoRecorte {
  const somar = (campo: (peca: RecorteDaPeca) => number) =>
    pecas.reduce((total, peca) => total + campo(peca), 0);

  const alcanceTotal = somar((peca) => peca.alcanceTotal);
  const alcancePago = somar((peca) => peca.alcancePago);
  const investido = somar((peca) => peca.investido);

  // Só soma cliques se alguma peça tiver medição. Sem isso, um conjunto em que
  // nenhuma rede informou cliques apareceria como "0 cliques", que se lê como
  // "ninguém clicou" em vez de "não medimos".
  const comCliques = pecas.filter((peca) => peca.cliques !== null);

  return {
    pecas: pecas.length,
    impulsionadas: pecas.filter((peca) => peca.impulsionamentos.length > 0).length,
    alcanceTotal,
    alcanceOrganico: somar((peca) => peca.alcanceOrganico),
    alcancePago,
    interacoes: somar((peca) => peca.interacoes),
    comentarios: somar((peca) => peca.comentarios),
    cliques:
      comCliques.length > 0
        ? comCliques.reduce((total, peca) => total + (peca.cliques ?? 0), 0)
        : null,
    investido,
    custoPorMil: alcancePago > 0 ? (investido / alcancePago) * 1000 : null,
    fatiaPaga: alcanceTotal > 0 ? (alcancePago / alcanceTotal) * 100 : 0,
  };
}

/**
 * A peça que mais rendeu sem dinheiro.
 *
 * É a pergunta mais útil que este recorte responde, e a que o painel de totais
 * não alcança: uma peça que alcança muita gente sozinha é candidata óbvia a
 * impulsionamento — já provou que funciona antes de custar.
 *
 * Só considera peças **ainda não impulsionadas**. Uma que já recebeu verba não
 * é descoberta; é investimento em andamento.
 */
export function melhorOrganicaSemVerba(pecas: RecorteDaPeca[]): RecorteDaPeca | null {
  const candidatas = pecas.filter((peca) => peca.impulsionamentos.length === 0);
  if (candidatas.length === 0) return null;
  return candidatas.reduce((melhor, peca) =>
    peca.alcanceOrganico > melhor.alcanceOrganico ? peca : melhor,
  );
}
