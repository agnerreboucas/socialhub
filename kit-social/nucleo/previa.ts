import type { PostMedia } from "./types.ts";

/**
 * Como a peça vai aparecer no Instagram, antes de existir.
 *
 * A pergunta que isto responde não é estética, é de linha editorial: a legenda
 * cortada no "mais" muda o que a pessoa lê sem tocar na tela, e o recorte da
 * grade muda o que ela vê ao abrir o perfil. As duas coisas são decididas pelo
 * Instagram, não por quem escreve — e hoje só aparecem depois de publicar, que
 * é tarde.
 *
 * Tudo aqui é cálculo sobre texto e proporção. O que o módulo **não** faz é
 * prometer pixel igual ao aplicativo: a Meta muda a interface sem avisar, e uma
 * prévia que se vende como idêntica envelhece mal. O que ela garante é o que
 * importa para decidir: onde a legenda corta, quantas marcações existem, e o
 * que o recorte vai comer.
 *
 * Módulo puro.
 */

/**
 * Quantos caracteres o feed mostra antes do "mais".
 *
 * O Instagram nunca publicou o número, e ele oscila com a largura da tela e com
 * a fonte. 125 é a medida que bate na maioria dos aparelhos e é a que a
 * literatura de redes usa. Está aqui, numa constante, porque é um palpite
 * calibrado: quando mudar, muda num lugar só.
 */
export const CORTE_DO_FEED = 125;

/** Marcações por publicação aceitas pelo Instagram. Acima disso a rede recusa. */
export const LIMITE_DE_HASHTAGS = 30;

export type LegendaCortada = {
  /** O que aparece antes do "mais". */
  visivel: string;
  /** O que fica escondido. Vazio quando a legenda inteira cabe. */
  escondido: string;
  cortada: boolean;
};

/**
 * Corta a legenda onde o feed corta, numa palavra inteira.
 *
 * Cortar no meio da palavra economiza dois caracteres e custa a leitura. A
 * primeira quebra de linha também corta: o Instagram mostra o começo até a
 * primeira linha quando ela termina antes do limite, e é assim que uma legenda
 * que abre com o nome da cidade esconde o resto.
 */
export function cortarLegenda(legenda: string, limite = CORTE_DO_FEED): LegendaCortada {
  if (legenda.length <= limite) return { visivel: legenda, escondido: "", cortada: false };

  const bruto = legenda.slice(0, limite);
  const ultimoEspaco = bruto.lastIndexOf(" ");
  const corte = ultimoEspaco > limite * 0.6 ? ultimoEspaco : limite;

  return {
    visivel: legenda.slice(0, corte).trimEnd(),
    escondido: legenda.slice(corte).trimStart(),
    cortada: true,
  };
}

export type PedacoDaLegenda = {
  tipo: "texto" | "hashtag" | "mencao" | "link";
  texto: string;
};

/**
 * Separa a legenda nos pedaços que o Instagram pinta de azul.
 *
 * Existe para a prévia mostrar a legenda como ela vai ser lida: uma legenda com
 * doze marcações no meio do texto fica azul demais, e isso só se vê colorido.
 */
export function pedacosDaLegenda(legenda: string): PedacoDaLegenda[] {
  const padrao = /(https?:\/\/\S+|www\.\S+|#[\p{L}\p{N}_]+|@[A-Za-z0-9._]+)/gu;
  const pedacos: PedacoDaLegenda[] = [];
  let ultimo = 0;

  for (const achado of legenda.matchAll(padrao)) {
    const inicio = achado.index ?? 0;
    if (inicio > ultimo) pedacos.push({ tipo: "texto", texto: legenda.slice(ultimo, inicio) });

    const token = achado[0];
    pedacos.push({
      tipo: token.startsWith("#") ? "hashtag" : token.startsWith("@") ? "mencao" : "link",
      texto: token,
    });
    ultimo = inicio + token.length;
  }

  if (ultimo < legenda.length) pedacos.push({ tipo: "texto", texto: legenda.slice(ultimo) });
  return pedacos;
}

export function hashtagsDaLegenda(legenda: string): string[] {
  return pedacosDaLegenda(legenda)
    .filter((pedaco) => pedaco.tipo === "hashtag")
    .map((pedaco) => pedaco.texto);
}

export function mencoesDaLegenda(legenda: string): string[] {
  return pedacosDaLegenda(legenda)
    .filter((pedaco) => pedaco.tipo === "mencao")
    .map((pedaco) => pedaco.texto);
}

/**
 * As proporções que o feed do Instagram aceita sem recortar.
 *
 * Fora delas a rede recorta sozinha, e o recorte nunca é onde quem montou a arte
 * esperava. 9:16 é o caso que mais acontece: a pessoa aproveita a arte do story
 * no feed e perde o topo e o pé.
 */
export const PROPORCOES_DO_FEED: PostMedia["aspectRatio"][] = ["1:1", "4:5"];

/**
 * A proporção do recorte da grade do perfil.
 *
 * O Instagram já mudou isso — a grade foi quadrada por anos e virou retrato. A
 * prévia usa uma constante justamente porque vai mudar de novo; trocar aqui
 * ajusta a tela inteira.
 */
export const PROPORCAO_DA_GRADE = 4 / 5;

export function razaoDaProporcao(proporcao: PostMedia["aspectRatio"]): number {
  const [largura, altura] = proporcao.split(":").map(Number);
  return largura / altura;
}

export type AvisoDaPrevia = {
  /** `erro` a rede recusa; `atencao` ela aceita e estraga. */
  gravidade: "erro" | "atencao";
  mensagem: string;
};

/**
 * O que vai dar errado antes de dar errado.
 *
 * Separado do validador de rascunho de propósito: aquele responde "a rede
 * aceita?", e estes avisos respondem "vai sair como você quer?". Legenda cortada
 * no meio da frase e arte recortada passam na validação e estragam a peça.
 */
export function avisosDaPrevia({
  legenda,
  media,
  formato,
}: {
  legenda: string;
  media: PostMedia;
  formato: string;
}): AvisoDaPrevia[] {
  const avisos: AvisoDaPrevia[] = [];
  const hashtags = hashtagsDaLegenda(legenda);

  if (hashtags.length > LIMITE_DE_HASHTAGS) {
    avisos.push({
      gravidade: "erro",
      mensagem: `${hashtags.length} marcações na legenda. O Instagram aceita ${LIMITE_DE_HASHTAGS} e recusa a publicação acima disso.`,
    });
  }

  const ehFeed = formato === "imagem" || formato === "carrossel";
  if (ehFeed && !PROPORCOES_DO_FEED.includes(media.aspectRatio)) {
    avisos.push({
      gravidade: "atencao",
      mensagem: `A arte está ${media.aspectRatio} e o feed mostra até 4:5. O Instagram vai recortar sozinho — confira se o texto da arte não fica de fora.`,
    });
  }

  if (formato === "story" && media.aspectRatio !== "9:16") {
    avisos.push({
      gravidade: "atencao",
      mensagem: `Story é 9:16. Em ${media.aspectRatio} a arte sai com tarja ou recortada.`,
    });
  }

  if (legenda.trim().length === 0) {
    avisos.push({
      gravidade: "atencao",
      mensagem: "Sem legenda. A publicação sai, mas perde o texto que faz a pessoa parar.",
    });
  } else if (cortarLegenda(legenda).cortada) {
    const { visivel } = cortarLegenda(legenda);
    const terminaEmFrase = /[.!?…:]$/.test(visivel.trimEnd());
    if (!terminaEmFrase) {
      avisos.push({
        gravidade: "atencao",
        mensagem: "O feed corta a legenda no meio da frase. Quem não tocar em “mais” lê só até ali.",
      });
    }
  }

  if (hashtags.length > 0 && legenda.trim().startsWith(hashtags[0])) {
    avisos.push({
      gravidade: "atencao",
      mensagem:
        "A legenda começa por marcação, e é ela que aparece no corte do feed. Começar pela frase aproveita melhor as primeiras linhas.",
    });
  }

  return avisos;
}

export type ItemDaGrade = {
  id: string;
  /** Legenda reduzida ao que cabe embaixo da miniatura. */
  trecho: string;
  quando: string | null;
  formato: string;
  coverGradient: string;
  /** Ainda não publicada: a grade mostra como vai ficar, não como está. */
  futura: boolean;
};

/**
 * A grade do perfil, na ordem em que o Instagram vai mostrar.
 *
 * É a prévia da linha editorial, e a razão de existir: peça a peça cada arte
 * pode estar boa e o perfil inteiro sair repetitivo — três fundos escuros
 * seguidos, ou a mesma cor nas nove primeiras. Isso só aparece na grade.
 *
 * Mais recente primeiro, com as agendadas no topo, porque é onde elas vão cair.
 */
export function gradeDoPerfil<
  T extends {
    id: string;
    caption: string;
    format: string;
    coverGradient: string;
    publishedAt: string | null;
    scheduledFor: string | null;
  },
>(pecas: T[], limite = 9): ItemDaGrade[] {
  const quandoDe = (peca: T) => peca.publishedAt ?? peca.scheduledFor;

  return pecas
    .filter((peca) => quandoDe(peca) !== null && peca.format !== "story")
    .sort((a, b) => new Date(quandoDe(b)!).getTime() - new Date(quandoDe(a)!).getTime())
    .slice(0, limite)
    .map((peca) => ({
      id: peca.id,
      trecho: peca.caption.replace(/\s+/g, " ").trim().slice(0, 40),
      quando: quandoDe(peca),
      formato: peca.format,
      coverGradient: peca.coverGradient,
      futura: peca.publishedAt === null,
    }));
}
