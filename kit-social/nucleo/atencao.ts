import type { InboxItem, Post } from "./types.ts";

/**
 * Quanta atenção a campanha recebeu, e quanta ela devolveu.
 *
 * Três medidas que o Painel mostra lado a lado porque só juntas contam a
 * história — e separadas cada uma engana de um jeito:
 *
 * **Alcance** é gente. Quantas pessoas diferentes viram alguma coisa.
 *
 * **Impressões** é vezes. Quantas exibições aconteceram, contando repetição.
 * Impressões sozinhas parecem alcance e são sempre maiores — quem lê "37 mil"
 * sem saber que são exibições acredita ter falado com 37 mil pessoas.
 *
 * **Frequência** é a razão entre as duas: quantas vezes, em média, cada pessoa
 * viu. É a medida que ninguém pede e que explica as outras duas. Frequência
 * baixa com alcance alto é campanha espalhada e rasa; frequência alta com
 * alcance baixo é a mesma gente vendo de novo — e, passando de um certo ponto,
 * é desgaste: a pessoa já viu, já decidiu, e continuar aparecendo cansa.
 *
 * A quarta medida é de outra natureza. **Mensagens** não é audiência, é
 * conversa: quantas pessoas escreveram e quantas ainda esperam resposta. Está
 * no mesmo lugar de propósito — numa campanha, deixar alguém sem resposta custa
 * mais do que uma impressão a menos.
 *
 * Módulo puro.
 */

export type Atencao = {
  /** Pessoas diferentes alcançadas. */
  alcance: number;
  /** Exibições, contando repetição. */
  impressoes: number;
  /**
   * Quantas vezes, em média, cada pessoa alcançada viu.
   *
   * Zero quando não houve alcance — e é isso que a tela precisa dizer, em vez
   * de uma divisão por zero disfarçada de "0,0×".
   */
  frequencia: number;
};

export function medirAtencao(alcance: number, impressoes: number): Atencao {
  return {
    alcance,
    impressoes,
    frequencia: alcance > 0 ? impressoes / alcance : 0,
  };
}

/**
 * Como ler a frequência que saiu.
 *
 * As faixas não são universais — dependem do objetivo e do tempo de campanha —,
 * e por isso a frase é descritiva, não um veredito. O que ela faz é dar régua a
 * um número que, sozinho, não diz nada a quem vê pela primeira vez: "1,8" não
 * significa nada até alguém dizer que é quase duas vezes por pessoa.
 */
export function lerFrequencia(frequencia: number): string {
  if (frequencia <= 0) return "Ainda não há alcance no período para calcular.";
  if (frequencia < 1.2) {
    return "Quase todo mundo viu uma vez só. Alcance amplo e pouca repetição — bom para descoberta, fraco para fixar mensagem.";
  }
  if (frequencia < 2.5) {
    return `Cada pessoa viu ${formatarVezes(frequencia)} em média. É a faixa em que a mensagem começa a fixar sem cansar.`;
  }
  if (frequencia < 4) {
    return `Cada pessoa viu ${formatarVezes(frequencia)}. Repetição alta: vale conferir se o alcance parou de crescer, porque aí é a mesma gente vendo de novo.`;
  }
  return `Cada pessoa viu ${formatarVezes(frequencia)}. Repetição muito alta — a partir daqui costuma virar desgaste, e ampliar o público rende mais do que insistir.`;
}

function formatarVezes(frequencia: number): string {
  return `${frequencia.toFixed(1).replace(".", ",")} vezes`;
}

// --- Mensagens ----------------------------------------------------------------

export type Conversas = {
  /** Tudo que chegou no período: comentários e mensagens. */
  recebidas: number;
  respondidas: number;
  pendentes: number;
  /** De 0 a 100. */
  taxaDeResposta: number;
  /** Só as mensagens diretas — o resto é comentário. */
  mensagens: number;
  comentarios: number;
};

/**
 * O estado da caixa de entrada no período.
 *
 * Conta comentário e mensagem juntos no total porque as duas coisas são alguém
 * falando com a campanha e esperando retorno, e separa nos campos de baixo
 * porque respondê-las é trabalho diferente: comentário é público e mensagem é
 * privada.
 */
export function medirConversas(itens: InboxItem[]): Conversas {
  const respondidas = itens.filter((item) => item.status === "respondido").length;
  const mensagens = itens.filter((item) => item.kind === "mensagem").length;

  return {
    recebidas: itens.length,
    respondidas,
    pendentes: itens.length - respondidas,
    taxaDeResposta: itens.length > 0 ? (respondidas / itens.length) * 100 : 0,
    mensagens,
    comentarios: itens.length - mensagens,
  };
}

/** Recorta a caixa de entrada pelo período que o Painel está mostrando. */
export function noPeriodo(itens: InboxItem[], desde: string | null): InboxItem[] {
  if (!desde) return itens;
  return itens.filter((item) => item.receivedAt >= desde);
}

export type PecaQuePuxaConversa = {
  post: Post | null;
  /** Quando a conversa não aponta para publicação nenhuma. */
  semPeca: boolean;
  recebidas: number;
  respondidas: number;
  pendentes: number;
};

/**
 * Quais publicações puxaram mais conversa.
 *
 * É o aprofundamento do cartão de mensagens, e responde a pergunta que decide a
 * próxima pauta: **o que faz as pessoas escreverem?** Alcance diz quem viu;
 * isto diz quem se mexeu a ponto de responder.
 *
 * As conversas sem publicação de origem entram numa linha própria em vez de
 * sumir. Mensagem direta costuma chegar assim — sem apontar para peça nenhuma —
 * e escondê-la faria o total da lista discordar do total do cartão, que é o
 * jeito mais rápido de alguém perder a confiança na tela.
 */
export function pecasQuePuxamConversa(
  itens: InboxItem[],
  posts: Post[],
  quantas = 5,
): PecaQuePuxaConversa[] {
  const porPeca = new Map<string, InboxItem[]>();
  const soltas: InboxItem[] = [];

  for (const item of itens) {
    if (!item.postId) {
      soltas.push(item);
      continue;
    }
    porPeca.set(item.postId, [...(porPeca.get(item.postId) ?? []), item]);
  }

  const resumir = (lista: InboxItem[], post: Post | null, semPeca: boolean) => {
    const respondidas = lista.filter((item) => item.status === "respondido").length;
    return {
      post,
      semPeca,
      recebidas: lista.length,
      respondidas,
      pendentes: lista.length - respondidas,
    };
  };

  const comPeca = [...porPeca.entries()]
    .map(([postId, lista]) =>
      resumir(lista, posts.find((post) => post.id === postId) ?? null, false),
    )
    .sort((a, b) => b.recebidas - a.recebidas)
    .slice(0, quantas);

  return soltas.length > 0 ? [...comPeca, resumir(soltas, null, true)] : comPeca;
}
