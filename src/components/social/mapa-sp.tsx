import { Minus, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { FAIXAS_IPS, PROPORCAO_DO_MAPA, faixaDoIps, type PontoNoMapa } from "@/lib/social/mapa";
import { CONTORNO_SP, MALHA_SP } from "@/lib/social/malha-sp";
import {
  CAMADAS,
  EIXOS,
  camadaDaPosicao,
  eixosDoMunicipio,
  type CamadaId,
  type EixoId,
} from "@/lib/social/territorio";
import { formatCompact, formatCurrency, formatNumber } from "@/lib/social/format";
import { cn } from "@/lib/utils";

/**
 * O estado de São Paulo em territórios, um por município.
 *
 * A versão anterior desenhava uma bolinha por cidade. Bolinha responde
 * "quanto"; não responde "quanto do estado", que é a pergunta de uma campanha
 * estadual. Território pintado responde: a mancha da campanha cresce sobre o
 * mapa, e o vazio ao lado dela tem o mesmo peso visual que a área ocupada.
 *
 * As áreas são células de Voronoi das sedes municipais, calculadas uma vez em
 * `scripts/gerar-malha.ts`. **Não são os limites do IBGE** — e a tela diz isso,
 * porque um mapa que parece oficial e não é, engana em silêncio.
 *
 * Duas visões, duas perguntas:
 *
 * **Prioridade** colore pelo IPS: onde a campanha deveria estar.
 * **Alcance** colore pelo que foi entregue: onde ela está.
 *
 * O recorte da Grande São Paulo existe porque quarenta municípios de área
 * minúscula concentram metade do eleitorado do estado. No mapa inteiro eles são
 * um borrão de dois pixels; sem o recorte, a região que mais importa é a única
 * que não dá para ler.
 */

/**
 * Os quatro jeitos de ler o mesmo desenho.
 *
 * `prioridade` e `alcance` respondem "onde deveria estar" e "onde estou".
 * `camada` e `eixo` vieram com a estratégia territorial: a primeira mostra a
 * expansão por camadas — Top 100, 200, 300 e o resto —, e a segunda pinta o
 * Top 100 pela pauta que abre porta em cada cidade.
 */
export type Visao = "prioridade" | "alcance" | "camada" | "eixo";

/**
 * A cor de cada camada, do mais forte ao mais claro.
 *
 * A escala é de uma cor só, variando a intensidade, porque camada é ordem: dar
 * quatro matizes diferentes faria parecer que são quatro categorias
 * independentes, quando a segunda é o passo depois da primeira.
 */
const COR_DA_CAMADA: Record<CamadaId, string> = {
  top100: "#0f766e",
  top200: "#2dd4bf",
  top300: "#99f6e4",
  cobertura: "#e7e5e4",
};

/**
 * A cor de cada eixo.
 *
 * Aqui, sim, matizes distintos: os sete eixos são categorias sem ordem entre
 * si, e uma escala de intensidade sugeriria uma hierarquia que não existe.
 */
const COR_DO_EIXO: Record<EixoId, string> = {
  educacao: "#2563eb",
  saude: "#dc2626",
  cultura: "#9333ea",
  trabalho: "#ea580c",
  direitos: "#db2777",
  cidade: "#059669",
  rede: "#ca8a04",
};

const LARGURA = 1000;
const ALTURA = Math.round(LARGURA * PROPORCAO_DO_MAPA);

/** A janela do recorte metropolitano, na mesma caixa de 0 a 1 do mapa. */
const RECORTE_METROPOLITANO = { x: 0.678, y: 0.406, largura: 0.112, altura: 0.082 };

const CINZA_SEM_ENTREGA = "#e7e5e4";

/**
 * O caminho do contorno vem numa caixa de 0 a 1; o SVG desenha em pixels.
 *
 * Escalar aqui, e não guardar já escalado, mantém o dado independente do
 * tamanho do desenho — o recorte metropolitano usa a mesma string com outra
 * janela.
 */
function escalarCaminho(caminho: string, escala: number): string {
  return caminho.replace(/-?\d+(\.\d+)?/g, (numero) => (Number(numero) * escala).toFixed(1));
}
const COR_DA_CAPITAL = "#1c1917";

export function MapaDeSaoPaulo({
  pontos,
  visao,
  selecionado,
  onSelecionar,
}: {
  pontos: PontoNoMapa[];
  visao: Visao;
  selecionado: string | null;
  onSelecionar: (codigo: string | null) => void;
}) {
  const [sobre, setSobre] = useState<PontoNoMapa | null>(null);

  /**
   * A janela visível do mapa, em unidades do desenho.
   *
   * O zoom é feito movendo esta janela, e não com `transform` no grupo: assim os
   * rótulos e a espessura dos traços continuam do tamanho certo em qualquer
   * aproximação. Com `scale`, um texto de 10px viraria 80px ao ampliar oito
   * vezes.
   */
  const [janela, setJanela] = useState({ x: 0, y: 0, largura: LARGURA });
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastando = useRef<{ x: number; y: number } | null>(null);

  const escalaDoZoom = LARGURA / janela.largura;
  const alturaDaJanela = janela.largura * PROPORCAO_DO_MAPA;

  /**
   * Aproxima ou afasta mantendo um ponto parado.
   *
   * O ponto parado é o do cursor. Sem isso, o zoom da roda do mouse "foge": a
   * pessoa aponta para Sorocaba, gira a roda e a tela vai para outro lugar,
   * obrigando a arrastar de volta a cada passo.
   */
  const aproximar = (fator: number, focoX?: number, focoY?: number) => {
    setJanela((atual) => {
      const largura = Math.min(LARGURA, Math.max(LARGURA / 24, atual.largura / fator));
      if (largura === atual.largura) return atual;

      const altura = atual.largura * PROPORCAO_DO_MAPA;
      const alvoX = focoX ?? atual.x + atual.largura / 2;
      const alvoY = focoY ?? atual.y + altura / 2;
      const proporcao = largura / atual.largura;

      // O limite mantém a janela sobre o desenho: sem ele dá para arrastar o
      // estado inteiro para fora da tela e ficar olhando o vazio.
      const limitar = (valor: number, tamanho: number, total: number) =>
        Math.min(Math.max(valor, -tamanho * 0.1), total - tamanho * 0.9);

      return {
        largura,
        x: limitar(alvoX - (alvoX - atual.x) * proporcao, largura, LARGURA),
        y: limitar(alvoY - (alvoY - atual.y) * proporcao, largura * PROPORCAO_DO_MAPA, ALTURA),
      };
    });
  };

  /** Converte a posição do mouse na tela para as unidades do desenho. */
  const noDesenho = (evento: { clientX: number; clientY: number }) => {
    const caixa = svgRef.current?.getBoundingClientRect();
    if (!caixa) return null;
    return {
      x: janela.x + ((evento.clientX - caixa.left) / caixa.width) * janela.largura,
      y: janela.y + ((evento.clientY - caixa.top) / caixa.height) * alturaDaJanela,
    };
  };

  const maiorAlcance = useMemo(
    () => Math.max(...pontos.map((ponto) => ponto.alcance), 1),
    [pontos],
  );

  /** A régua do tamanho dos círculos: a maior população do estado. */
  const maiorPopulacao = useMemo(
    () => Math.max(...pontos.map((ponto) => ponto.municipio.populacao ?? 0), 1),
    [pontos],
  );

  /**
   * O território de cada município, casado por índice.
   *
   * `MALHA_SP` sai na mesma ordem de `MUNICIPIOS_SP`, e os pontos também. Casar
   * por índice evita carregar o código do IBGE 645 vezes dentro do arquivo da
   * malha — que já é a maior parte do peso desta tela.
   */
  const territorios = useMemo(
    () => pontos.map((ponto, indice) => ({ ponto, contorno: MALHA_SP[indice] ?? [] })),
    [pontos],
  );

  const cor = (ponto: PontoNoMapa) => {
    if (visao === "camada") {
      const camada = camadaDaPosicao(ponto.municipio.posicao);
      // Sem posição no IPS não há camada — e o cinza diz isso, em vez de
      // empurrar o município para a última camada como se tivesse sido avaliado.
      return camada ? COR_DA_CAMADA[camada.id] : CINZA_SEM_ENTREGA;
    }
    if (visao === "eixo") {
      const eixos = eixosDoMunicipio(ponto.municipio);
      // Só o Top 100 tem leitura estratégica. O resto fica cinza de propósito:
      // é o que faz a primeira camada saltar do mapa.
      return eixos.length > 0 ? COR_DO_EIXO[eixos[0].id] : CINZA_SEM_ENTREGA;
    }
    if (visao === "prioridade") {
      // A capital não tem nota porque é a régua: o índice inteiro mede
      // distância até ela. Pintá-la de cinza de "sem dado" diria o contrário.
      if (ponto.ehCapital) return COR_DA_CAPITAL;
      return faixaDoIps(ponto.municipio.ips)?.cor ?? "#d6d3d1";
    }
    if (ponto.alcance === 0) return CINZA_SEM_ENTREGA;
    const intensidade = Math.sqrt(ponto.alcance / maiorAlcance);
    return `color-mix(in oklch, #0d9488 ${Math.round(30 + intensidade * 70)}%, #ccfbf1)`;
  };

  /**
   * As cidades que ganham nome escrito no mapa.
   *
   * Doze é o número que cabe sem virar sopa de letras num estado deste formato
   * — testado aumentando até os rótulos começarem a se sobrepor. E só nas
   * visões territoriais, porque é nelas que a pergunta é "que cidade é essa?";
   * nas de prioridade e alcance a pergunta é sobre a cor, e o nome aparece no
   * passar do mouse.
   */
  const rotulados = useMemo(() => {
    // Com o mapa aproximado, o nome passa a ser a informação principal — é para
    // isso que a pessoa aproximou. Por isso os rótulos aparecem em qualquer
    // visão a partir de duas vezes, e não só nas territoriais.
    if (escalaDoZoom < 2 && visao !== "camada" && visao !== "eixo") return [];

    // Guloso, em ordem de ranking: a cidade só recebe nome se estiver longe o
    // bastante de outra já rotulada. Sem isto, metade dos doze primeiros cai na
    // Grande São Paulo e os nomes viram um borrão — que foi exatamente o que
    // aconteceu na primeira versão. Assim o mapa rotula polos espalhados, como
    // faz um mapa impresso.
    // Os três limites afrouxam com o zoom, e é isso que faz aproximar valer a
    // pena: a distância mínima encolhe junto com a janela, o corte do ranking
    // desce mais fundo e cabem mais nomes na tela.
    const DISTANCIA_MINIMA = 0.055 / escalaDoZoom;
    const ATE_A_POSICAO = Math.round(40 * escalaDoZoom);
    const QUANTOS = Math.round(12 * Math.min(escalaDoZoom, 6));
    const escolhidos: typeof territorios = [];

    // Só o que está dentro da janela: rotular quem ficou fora da tela gasta o
    // orçamento de nomes com cidade que ninguém está vendo.
    const naJanela = territorios.filter(
      ({ ponto }) =>
        ponto.x * LARGURA >= janela.x &&
        ponto.x * LARGURA <= janela.x + janela.largura &&
        ponto.y * LARGURA >= janela.y &&
        ponto.y * LARGURA <= janela.y + alturaDaJanela,
    );

    for (const item of [...naJanela].sort(
      (a, b) => (a.ponto.municipio.posicao ?? 999) - (b.ponto.municipio.posicao ?? 999),
    )) {
      if ((item.ponto.municipio.posicao ?? 999) > ATE_A_POSICAO) break;
      const colide = escolhidos.some(
        (outro) =>
          Math.hypot(outro.ponto.x - item.ponto.x, outro.ponto.y - item.ponto.y) < DISTANCIA_MINIMA,
      );
      if (!colide) escolhidos.push(item);
      if (escolhidos.length >= QUANTOS) break;
    }

    return escolhidos;
  }, [territorios, visao, escalaDoZoom, janela, alturaDaJanela]);

  const emDestaque =
    sobre ?? pontos.find((ponto) => ponto.municipio.codigo === selecionado) ?? null;

  /**
   * O raio de cada círculo, pela população.
   *
   * **Raiz quadrada, não proporção direta.** O olho compara círculos pela
   * área, não pelo raio: dobrar o raio quadruplica a mancha, e uma cidade com
   * o dobro de gente pareceria ter quatro vezes mais. A raiz faz a área — que é
   * o que se enxerga — crescer junto com a população.
   *
   * Piso de 2px porque um círculo menor que isso some e deixa de ser clicável,
   * e cidade pequena que some do mapa é cidade que a campanha esquece.
   */
  const raio = (ponto: PontoNoMapa, escala: number) => {
    const populacao = ponto.municipio.populacao ?? 0;
    const fracao = Math.sqrt(populacao / maiorPopulacao);
    // Dividido pela raiz do zoom: sem compensação nenhuma, aproximar oito vezes
    // multiplicaria a mancha por oito e o interior do estado viraria um borrão
    // — foi o que aconteceu no recorte metropolitano antes de eu corrigir. Raiz
    // e não o zoom cheio porque os círculos devem crescer **um pouco** ao
    // aproximar; senão o zoom não mostra nada de novo.
    return Math.max(1.5, (fracao * escala * 0.035) / Math.sqrt(escalaDoZoom));
  };

  /**
   * As cidades, em círculos.
   *
   * Eram polígonos de Voronoi — a área mais próxima de cada sede. Bonito, e
   * enganoso: aquilo desenha divisas que não existem, e num mapa de campanha
   * alguém acaba lendo o traço como limite de município. O círculo não promete
   * fronteira nenhuma; ele diz "a cidade fica aqui e tem este tamanho", que é
   * exatamente o que o dado sustenta.
   *
   * Desenhados do menor para o maior, para que o círculo pequeno não fique
   * escondido embaixo do grande — sem isso, os municípios do entorno de São
   * Paulo desapareceriam sob a capital.
   */
  const desenhar = (escala: number, chave: string, fatorDoRaio = 1) =>
    [...territorios]
      .sort((a, b) => (b.ponto.municipio.populacao ?? 0) - (a.ponto.municipio.populacao ?? 0))
      .map(({ ponto }) => {
        const estaSelecionado = ponto.municipio.codigo === selecionado;
        const sobDoMouse = sobre?.municipio.codigo === ponto.municipio.codigo;
        const destacado = estaSelecionado || sobDoMouse;

        return (
          <circle
            key={`${chave}-${ponto.municipio.codigo}`}
            cx={ponto.x * escala}
            cy={ponto.y * escala}
            r={raio(ponto, escala) * fatorDoRaio * (destacado ? 1.35 : 1)}
            fill={cor(ponto)}
            fillOpacity={0.85}
            stroke={destacado ? "var(--color-foreground)" : "rgba(255,255,255,0.7)"}
            strokeWidth={estaSelecionado ? 2 : sobDoMouse ? 1.5 : 0.5}
            // Tracejado quando o número foi repartido pela plataforma em vez de
            // medido pela rede. É discreto de propósito — não é erro, é ressalva
            // —, mas quem for tirar conclusão de uma cidade vai perguntar o que
            // é aquilo, e a resposta está no detalhe.
            strokeDasharray={ponto.estimado && visao === "alcance" ? "2 2" : undefined}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setSobre(ponto)}
            onMouseLeave={() => setSobre(null)}
            onClick={() => onSelecionar(estaSelecionado ? null : ponto.municipio.codigo)}
          >
            <title>{ponto.municipio.nome}</title>
          </circle>
        );
      });

  const capital = pontos.find((ponto) => ponto.ehCapital);

  return (
    <div className="relative">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`${janela.x} ${janela.y} ${janela.largura} ${alturaDaJanela}`}
          className={cn("w-full touch-none", escalaDoZoom > 1 ? "cursor-grab" : "")}
          role="img"
          onWheel={(evento) => {
            const ponto = noDesenho(evento);
            aproximar(evento.deltaY < 0 ? 1.2 : 1 / 1.2, ponto?.x, ponto?.y);
          }}
          onPointerDown={(evento) => {
            if (escalaDoZoom <= 1) return;
            arrastando.current = { x: evento.clientX, y: evento.clientY };
            evento.currentTarget.setPointerCapture(evento.pointerId);
          }}
          onPointerMove={(evento) => {
            const inicio = arrastando.current;
            if (!inicio) return;
            const caixa = svgRef.current?.getBoundingClientRect();
            if (!caixa) return;

            // O deslocamento é convertido para unidades do desenho antes de
            // somar: arrastar 10px numa janela apertada move muito menos
            // território do que os mesmos 10px no estado inteiro.
            const dx = ((evento.clientX - inicio.x) / caixa.width) * janela.largura;
            const dy = ((evento.clientY - inicio.y) / caixa.height) * alturaDaJanela;
            arrastando.current = { x: evento.clientX, y: evento.clientY };
            setJanela((atual) => ({
              ...atual,
              x: Math.min(
                Math.max(atual.x - dx, -atual.largura * 0.1),
                LARGURA - atual.largura * 0.9,
              ),
              y: Math.min(
                Math.max(atual.y - dy, -alturaDaJanela * 0.1),
                ALTURA - alturaDaJanela * 0.9,
              ),
            }));
          }}
          onPointerUp={() => (arrastando.current = null)}
          onPointerCancel={() => (arrastando.current = null)}
          aria-label={`Mapa do estado de São Paulo com ${pontos.length} municípios em círculos proporcionais à população, coloridos por ${visao}.`}
        >
          {/* O corpo do estado, por baixo de tudo.
              Com círculos em vez de polígonos, alguma coisa precisa dar forma ao
              mapa — sem este preenchimento sobrariam pontos flutuando sem
              contexto, e ninguém reconheceria São Paulo. O tom é bem lavado de
              propósito: é fundo, não informação. */}
          <path
            d={escalarCaminho(CONTORNO_SP, LARGURA)}
            fill="var(--color-secondary)"
            stroke="none"
          />

          {/* Os círculos não são recortados pelo contorno. Uma cidade na divisa
              teria o círculo cortado ao meio, e o corte pareceria dado — como se
              metade dela estivesse fora do estado. */}
          {desenhar(LARGURA, "estado")}

          {/* Os rótulos das primeiras cidades, como num mapa impresso.
              Só nas visões territoriais e só no topo do ranking: escrever os 645
              nomes cobriria o desenho, e a referência que originou esta tela
              rotula justamente os polos, não tudo. */}
          {rotulados.length > 0 ? (
            <g className="pointer-events-none">
              {rotulados.map(({ ponto }) => (
                <text
                  key={`rotulo-${ponto.municipio.codigo}`}
                  x={ponto.x * LARGURA}
                  y={ponto.y * LARGURA - 6 / escalaDoZoom - raio(ponto, LARGURA) * 0.6}
                  textAnchor="middle"
                  className="fill-foreground font-medium"
                  style={{
                    // Em unidades do desenho, dividido pelo zoom: assim o nome
                    // mantém o mesmo tamanho na tela em qualquer aproximação.
                    fontSize: 10 / escalaDoZoom,
                    paintOrder: "stroke",
                    stroke: "var(--color-background)",
                    strokeWidth: 3 / escalaDoZoom,
                  }}
                >
                  {ponto.municipio.nome}
                </text>
              ))}
            </g>
          ) : null}

          <path
            d={escalarCaminho(CONTORNO_SP, LARGURA)}
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth={1.6}
            strokeLinejoin="round"
            opacity={0.5}
            pointerEvents="none"
          />

          {/* A moldura do recorte, para quem olha saber de onde ele veio. */}
          <rect
            x={RECORTE_METROPOLITANO.x * LARGURA}
            y={RECORTE_METROPOLITANO.y * LARGURA}
            width={RECORTE_METROPOLITANO.largura * LARGURA}
            height={RECORTE_METROPOLITANO.altura * LARGURA}
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        </svg>

        {emDestaque ? (
          <div className="pointer-events-none absolute left-3 top-3 max-w-[16rem] rounded-xl border border-border bg-card/95 p-3 text-xs shadow-lg backdrop-blur">
            <p className="font-semibold">{emDestaque.municipio.nome}</p>
            {emDestaque.ehCapital ? (
              <p className="text-[10px] uppercase tracking-[0.1em] text-accent">
                referência do índice
              </p>
            ) : null}
            <dl className="mt-1.5 space-y-0.5 text-muted-foreground">
              {emDestaque.municipio.ips !== null ? (
                <Linha rotulo="IPS">
                  {emDestaque.municipio.ips} · {emDestaque.municipio.posicao}º
                </Linha>
              ) : null}
              {emDestaque.municipio.populacao ? (
                <Linha rotulo="População">{formatNumber(emDestaque.municipio.populacao)}</Linha>
              ) : null}
              {emDestaque.municipio.km !== null ? (
                <Linha rotulo="Da capital">{emDestaque.municipio.km} km</Linha>
              ) : null}
              <div className="flex justify-between gap-3 border-t border-border pt-1">
                <dt>Alcançado</dt>
                <dd
                  className={cn(
                    "tabular-nums font-medium",
                    emDestaque.alcance > 0 ? "text-foreground" : "text-destructive",
                  )}
                >
                  {emDestaque.alcance > 0 ? formatCompact(emDestaque.alcance) : "ninguém"}
                </dd>
              </div>
              {emDestaque.investido > 0 ? (
                <Linha rotulo="Investido">{formatCurrency(emDestaque.investido)}</Linha>
              ) : null}
            </dl>
            <p className="mt-1.5 text-[10px] text-muted-foreground">clique para abrir o detalhe</p>
          </div>
        ) : null}

        {/* Os controles de zoom, no canto de cima à direita — onde todo mapa
            os põe. O botão de voltar só aparece aproximado: um "estado inteiro"
            sempre visível seria um botão que não faz nada na maior parte do
            tempo. */}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <div className="flex overflow-hidden rounded-lg border border-border bg-card/92 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => aproximar(1.6)}
              aria-label="Aproximar o mapa"
              className="px-2.5 py-1.5 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
              disabled={janela.largura <= LARGURA / 24 + 0.01}
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => aproximar(1 / 1.6)}
              aria-label="Afastar o mapa"
              className="border-l border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
              disabled={escalaDoZoom <= 1.01}
            >
              <Minus className="size-4" />
            </button>
          </div>

          {escalaDoZoom > 1.01 ? (
            <button
              type="button"
              onClick={() => setJanela({ x: 0, y: 0, largura: LARGURA })}
              className="rounded-lg border border-border bg-card/92 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur transition-colors hover:bg-secondary"
            >
              Estado inteiro · {escalaDoZoom.toFixed(1)}×
            </button>
          ) : (
            <span className="rounded-lg bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
              role para aproximar
            </span>
          )}
        </div>

        {/* O recorte metropolitano, sobreposto no canto que fica vazio. */}
        <div className="absolute bottom-2 left-2 w-[38%] max-w-[19rem] rounded-xl border border-border bg-card/92 p-2 shadow-lg backdrop-blur sm:w-[32%]">
          <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Grande São Paulo
          </p>
          <svg
            viewBox={`${RECORTE_METROPOLITANO.x * LARGURA} ${RECORTE_METROPOLITANO.y * LARGURA} ${RECORTE_METROPOLITANO.largura * LARGURA} ${RECORTE_METROPOLITANO.altura * LARGURA}`}
            className="w-full"
            role="img"
            aria-label="Recorte ampliado da região metropolitana de São Paulo."
          >
            {/* O mesmo fundo do mapa grande, para o recorte não ficar sobre o
                branco do cartão. Sem recorte por contorno: aqui a janela já é
                um retângulo dentro do estado. */}
            <path
              d={escalarCaminho(CONTORNO_SP, LARGURA)}
              fill="var(--color-secondary)"
              stroke="none"
            />
            {/* Raio reduzido no recorte.
                A janela amplia a geografia cerca de nove vezes, e o círculo vem
                junto: em tamanho cheio a Grande São Paulo virava uma mancha só,
                que é o oposto do que um recorte ampliado serve para mostrar. Um
                quarto do raio dá círculos ainda maiores que no mapa inteiro,
                com espaço entre eles. */}
            {desenhar(LARGURA, "metro", 0.25)}
            {capital ? (
              <circle
                cx={capital.x * LARGURA}
                cy={capital.y * LARGURA}
                r={2.4}
                fill="none"
                stroke="var(--color-background)"
                strokeWidth={1.4}
                pointerEvents="none"
              />
            ) : null}
          </svg>
        </div>
      </div>

      <Legenda visao={visao} />
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{rotulo}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

function Legenda({ visao }: { visao: Visao }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      {visao === "camada" ? (
        <>
          <span>Camada de expansão:</span>
          {CAMADAS.map((camada) => (
            <Amostra key={camada.id} cor={COR_DA_CAMADA[camada.id]}>
              {camada.id === "cobertura" ? "301–645" : `Top ${camada.ate}`}
            </Amostra>
          ))}
          <Amostra cor={CINZA_SEM_ENTREGA}>sem posição no IPS</Amostra>
        </>
      ) : visao === "eixo" ? (
        <>
          <span>Eixo de entrada:</span>
          {EIXOS.map((eixo) => (
            <Amostra key={eixo.id} cor={COR_DO_EIXO[eixo.id]}>
              {eixo.nome.split(",")[0].split(" e ")[0]}
            </Amostra>
          ))}
          <Amostra cor={CINZA_SEM_ENTREGA}>fora do Top 100</Amostra>
        </>
      ) : visao === "prioridade" ? (
        <>
          <span>Nota do IPS:</span>
          {[...FAIXAS_IPS].reverse().map((faixa) => (
            <Amostra key={faixa.rotulo} cor={faixa.cor}>
              {faixa.rotulo}
            </Amostra>
          ))}
          <Amostra cor={COR_DA_CAPITAL}>capital</Amostra>
        </>
      ) : (
        <>
          <span>Pessoas alcançadas:</span>
          <Amostra cor={CINZA_SEM_ENTREGA}>nenhuma</Amostra>
          <Amostra cor="color-mix(in oklch, #0d9488 55%, #ccfbf1)">algumas</Amostra>
          <Amostra cor="#0d9488">muitas</Amostra>
          <span className="inline-flex items-center gap-1.5">
            <svg width="11" height="11" aria-hidden>
              <circle
                cx="5.5"
                cy="5.5"
                r="4.5"
                fill="none"
                stroke="currentColor"
                strokeDasharray="2 2"
              />
            </svg>
            repartido, não medido
          </span>
        </>
      )}
      <span className="ml-auto">Círculo pela população, na posição da sede municipal.</span>
    </div>
  );
}

function Amostra({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: cor }} />
      {children}
    </span>
  );
}
