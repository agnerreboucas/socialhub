import { MUNICIPIOS_SP, type Municipio } from "./municipios-sp.ts";

/**
 * A estratégia territorial da campanha.
 *
 * O documento que originou este módulo diz uma coisa que vale repetir aqui,
 * porque ela governa o desenho: **o Top 100 não é uma lista de cidades a
 * visitar, é uma rede de núcleos capazes de irradiar presença para os outros
 * 545.** Um módulo que tratasse as cem como fila de tarefas contaria a história
 * errada — por isso aqui não existe "concluída", existe a ficha do município e
 * o que ela já tem preenchido.
 *
 * Três decisões:
 *
 * **O ranking não é redefinido aqui.** A posição de cada município já vem da
 * matriz do IPS em `municipios-sp.ts`, e as cem primeiras posições de lá são
 * exatamente as cem do anexo — conferido nome a nome. Reescrever a lista criaria
 * duas fontes que uma hora discordam; o que este módulo acrescenta é o **eixo
 * recomendado**, que é a leitura estratégica e não existe na matriz.
 *
 * **O IPS é preliminar, e a plataforma diz isso.** A versão usada pesa população
 * (40%), proximidade (25%), IDHM 2010 (20%) e escala urbana (15%), e o próprio
 * documento pede que saúde, educação, saneamento, habitação, mobilidade e
 * segurança entrem depois. A tela mostra a ressalva junto do número: um ranking
 * preliminar apresentado sem ela vira definitivo na cabeça de quem lê.
 *
 * **O eixo é porta de entrada, não assunto único.** "São Carlos → Educação"
 * significa por onde começar a conversa naquele território, não que a campanha
 * só fale de educação lá. O tipo se chama `eixoDeEntrada` por isso.
 *
 * Módulo puro.
 */

// --- Os sete eixos ------------------------------------------------------------

export type EixoId = "educacao" | "saude" | "cultura" | "trabalho" | "direitos" | "cidade" | "rede";

export type Eixo = {
  id: EixoId;
  nome: string;
  /** Os públicos e temas que o eixo abre, do documento. */
  frentes: string[];
};

export const EIXOS: Eixo[] = [
  {
    id: "educacao",
    nome: "Educação",
    frentes: [
      "escolas",
      "professores",
      "creches",
      "educação étnico-racial",
      "juventude",
      "educação profissional",
      "organizações educacionais",
    ],
  },
  {
    id: "saude",
    nome: "Saúde",
    frentes: [
      "saúde pública",
      "saúde mental",
      "atenção básica",
      "população em situação de rua",
      "assistência",
      "profissionais da saúde",
    ],
  },
  {
    id: "cultura",
    nome: "Cultura",
    frentes: [
      "cultura periférica",
      "produtores culturais",
      "artistas",
      "coletivos",
      "patrimônio",
      "manifestações culturais",
    ],
  },
  {
    id: "trabalho",
    nome: "Trabalho, renda e economia",
    frentes: [
      "trabalhadores",
      "empreendedores",
      "cooperativas",
      "economia solidária",
      "costureiras",
      "comércio local",
      "emprego",
    ],
  },
  {
    id: "direitos",
    nome: "Direitos e diversidade",
    frentes: [
      "comunidade negra",
      "população LGBTQIAPNB+",
      "mulheres",
      "juventude",
      "direitos humanos",
      "inclusão",
    ],
  },
  {
    id: "cidade",
    nome: "Cidade e qualidade de vida",
    frentes: [
      "mobilidade",
      "habitação",
      "saneamento",
      "meio ambiente",
      "resíduos",
      "energia",
      "segurança",
      "urbanização",
    ],
  },
  {
    id: "rede",
    nome: "Rede territorial",
    frentes: [
      "lideranças",
      "organizações",
      "movimentos",
      "associações",
      "coletivos",
      "instituições",
      "parceiros",
      "grupos organizados",
    ],
  },
];

export const EIXO_POR_ID = new Map(EIXOS.map((eixo) => [eixo.id, eixo]));

// --- As camadas de expansão ---------------------------------------------------

export type CamadaId = "top100" | "top200" | "top300" | "cobertura";

export type Camada = {
  id: CamadaId;
  nome: string;
  /** Última posição do ranking que pertence à camada. */
  ate: number;
  objetivo: string;
};

/**
 * As quatro camadas, na ordem da expansão.
 *
 * A razão de existirem: a campanha não consegue operar no mesmo nível nos 645
 * municípios ao mesmo tempo, e fingir que consegue produz um plano que não se
 * executa. A camada diz o que se espera de cada território **agora**.
 */
export const CAMADAS: Camada[] = [
  {
    id: "top100",
    nome: "Top 100 — núcleos prioritários",
    ate: 100,
    objetivo: "Presença, relacionamento, comunicação, mobilização e expansão de rede.",
  },
  {
    id: "top200",
    nome: "Top 200 — expansão regional",
    ate: 200,
    objetivo: "Expansão territorial e formação de redes regionais.",
  },
  {
    id: "top300",
    nome: "Top 300 — capilaridade",
    ate: 300,
    objetivo: "Consolidação regional e presença em novos territórios.",
  },
  {
    id: "cobertura",
    nome: "301 a 645 — cobertura ampliada",
    ate: 645,
    objetivo: "Presença estratégica, comunicação digital e identificação de oportunidades.",
  },
];

/**
 * A camada de um município pela posição no ranking.
 *
 * Devolve `null` para os 45 municípios que a matriz do IPS não pontuou. Eles
 * existem no mapa e não têm camada — inventar uma para eles seria dar posição a
 * quem a metodologia ainda não classificou.
 */
export function camadaDaPosicao(posicao: number | null): Camada | null {
  if (posicao === null || posicao < 1) return null;
  return CAMADAS.find((camada) => posicao <= camada.ate) ?? null;
}

// --- Os dez blocos do Top 100 -------------------------------------------------

export type Bloco = {
  numero: number;
  de: number;
  ate: number;
  titulo: string;
  /** Como o documento caracteriza o conjunto. */
  leitura: string;
};

export const BLOCOS_DO_TOP_100: Bloco[] = [
  {
    numero: 1,
    de: 1,
    ate: 10,
    titulo: "Prioridade máxima",
    leitura: "As cidades mais semelhantes à capital no conjunto dos indicadores.",
  },
  {
    numero: 2,
    de: 11,
    ate: 20,
    titulo: "Prioridade alta",
    leitura: "Forte convergência urbana e socioeconômica.",
  },
  {
    numero: 3,
    de: 21,
    ate: 30,
    titulo: "Prioridade alta",
    leitura: "Grandes e médias cidades com problemas urbanos semelhantes.",
  },
  {
    numero: 4,
    de: 31,
    ate: 40,
    titulo: "Polos regionais",
    leitura: "Polos regionais e cidades em processo de transformação.",
  },
  {
    numero: 5,
    de: 41,
    ate: 50,
    titulo: "Infraestrutura e pressão social",
    leitura: "Combinação relevante de infraestrutura e pressão social.",
  },
  {
    numero: 6,
    de: 51,
    ate: 60,
    titulo: "Cidades médias",
    leitura: "Cidades médias com características metropolitanas ou regionais.",
  },
  {
    numero: 7,
    de: 61,
    ate: 70,
    titulo: "Demanda pública",
    leitura: "Problemas urbanos e demanda pública.",
  },
  {
    numero: 8,
    de: 71,
    ate: 80,
    titulo: "Crescimento",
    leitura: "Crescimento e aproximação progressiva do perfil metropolitano.",
  },
  {
    numero: 9,
    de: 81,
    ate: 90,
    titulo: "Similaridade específica",
    leitura: "Municípios que se destacam em indicadores específicos de similaridade.",
  },
  {
    numero: 10,
    de: 91,
    ate: 100,
    titulo: "Limite de entrada",
    leitura: "Limite de entrada do Top 100, ainda com relevância territorial.",
  },
];

export function blocoDaPosicao(posicao: number | null): Bloco | null {
  if (posicao === null) return null;
  return BLOCOS_DO_TOP_100.find((bloco) => posicao >= bloco.de && posicao <= bloco.ate) ?? null;
}

// --- Os níveis de presença ----------------------------------------------------

export type NivelDePresenca = "A" | "B" | "C";

export const NIVEIS_DE_PRESENCA: {
  id: NivelDePresenca;
  nome: string;
  quando: string;
  acoes: string[];
}[] = [
  {
    id: "A",
    nome: "Presença física prioritária",
    quando: "Cidades estratégicas do Top 100.",
    acoes: [
      "visita",
      "reunião",
      "evento",
      "encontro",
      "gravação",
      "roda de conversa",
      "articulação territorial",
    ],
  },
  {
    id: "B",
    nome: "Presença híbrida",
    quando: "Há rede local, mas a presença física não é prioritária.",
    acoes: ["digital", "liderança local", "eventos pontuais"],
  },
  {
    id: "C",
    nome: "Presença digital e de relacionamento",
    quando: "Cidades menores ou com menor prioridade operacional.",
    acoes: [
      "redes",
      "grupos",
      "relacionamento",
      "lideranças",
      "comunicação segmentada",
      "identificação de oportunidades",
    ],
  },
];

/**
 * O nível de presença sugerido, a partir da camada.
 *
 * É sugestão e não decisão: o documento diz que a classificação é da equipe, e
 * uma cidade do Top 100 sem rede local pode começar em C enquanto uma da camada
 * seguinte, com liderança forte, merece A. A ficha guarda o que a equipe
 * escolheu; isto só preenche o primeiro palpite.
 */
export function presencaSugerida(posicao: number | null): NivelDePresenca {
  const camada = camadaDaPosicao(posicao);
  if (camada?.id === "top100") return "A";
  if (camada?.id === "top200" || camada?.id === "top300") return "B";
  return "C";
}

// --- A leitura estratégica do Top 100 -----------------------------------------

/**
 * O eixo de entrada de cada um dos cem, na ordem do ranking.
 *
 * Vem do anexo da campanha. Guardado como lista de ids na ordem da posição —
 * índice 0 é a posição 1 — porque repetir o nome do município aqui criaria uma
 * segunda grafia que uma hora diverge da matriz. O `conferirTop100` garante que
 * o alinhamento não se perca.
 *
 * O primeiro id é o eixo principal; os demais são os secundários que o documento
 * recomenda junto.
 */
const EIXOS_DO_TOP_100: EixoId[][] = [
  ["trabalho", "cidade"], // 1 São Bernardo do Campo
  ["saude", "cidade", "trabalho", "direitos"], // 2 Guarulhos
  ["saude", "educacao", "cidade"], // 3 Santo André
  ["trabalho", "cidade", "direitos"], // 4 Osasco
  ["educacao", "saude", "trabalho"], // 5 Campinas
  ["educacao", "trabalho", "cidade"], // 6 São José dos Campos
  ["trabalho", "cidade", "saude", "educacao"], // 7 Sorocaba
  ["trabalho", "saude", "cidade", "direitos"], // 8 Mauá
  ["cidade"], // 9 Cotia
  ["educacao", "trabalho", "cidade"], // 10 Santana de Parnaíba
  ["cidade", "cultura"], // 11 Ribeirão Pires
  ["cidade"], // 12 Mairiporã
  ["educacao", "saude", "cidade"], // 13 São Caetano do Sul
  ["cidade", "educacao"], // 14 Caieiras
  ["trabalho", "educacao"], // 15 Indaiatuba
  ["saude", "cidade", "direitos"], // 16 Poá
  ["trabalho", "educacao", "saude"], // 17 Jacareí
  ["saude", "cidade", "direitos"], // 18 Ferraz de Vasconcelos
  ["trabalho", "direitos"], // 19 Jandira
  ["cidade", "trabalho"], // 20 Arujá
  ["cidade", "saude"], // 21 Itapecerica da Serra
  ["trabalho", "educacao", "cultura"], // 22 Americana
  ["educacao", "saude", "trabalho"], // 23 Bragança Paulista
  ["cidade", "cultura"], // 24 Atibaia
  ["educacao", "saude", "cidade"], // 25 Valinhos
  ["saude", "direitos", "cidade"], // 26 Franco da Rocha
  ["saude", "educacao", "cidade"], // 27 Várzea Paulista
  ["cultura", "educacao", "trabalho"], // 28 Itu
  ["trabalho", "educacao", "cultura"], // 29 Itatiba
  ["trabalho", "cidade", "direitos"], // 30 Campo Limpo Paulista
  ["educacao", "trabalho", "cultura"], // 31 Vinhedo
  ["trabalho", "cultura", "cidade"], // 32 Salto
  ["cultura", "cidade"], // 33 São Roque
  ["saude", "educacao", "trabalho", "cultura"], // 34 Ribeirão Preto
  ["cidade", "trabalho", "saude"], // 35 Cubatão
  ["educacao", "saude", "trabalho"], // 36 Rio Claro
  ["trabalho", "educacao", "cultura"], // 37 Santa Bárbara d'Oeste
  ["educacao", "trabalho", "direitos"], // 38 Hortolândia
  ["cidade"], // 39 Vargem Grande Paulista
  ["trabalho", "cidade"], // 40 Paulínia
  ["cidade", "saude"], // 41 Embu-Guaçu
  ["trabalho", "saude", "educacao"], // 42 Votorantim
  ["trabalho", "cidade"], // 43 Cajamar
  ["educacao", "trabalho"], // 44 São Carlos
  ["cidade", "saude"], // 45 Rio Grande da Serra
  ["trabalho", "educacao"], // 46 Louveira
  ["trabalho", "educacao", "saude"], // 47 Caçapava
  ["saude", "cultura"], // 48 Amparo
  ["trabalho", "cidade"], // 49 Itupeva
  ["saude", "cidade", "cultura"], // 50 Itanhaém
  ["trabalho", "educacao", "saude"], // 51 Pindamonhangaba
  ["trabalho", "educacao", "saude"], // 52 Mogi Guaçu
  ["trabalho", "educacao"], // 53 Nova Odessa
  ["saude", "cidade"], // 54 Mongaguá
  ["cidade", "saude"], // 55 Santa Isabel
  ["educacao", "saude", "cultura"], // 56 Guaratinguetá
  ["trabalho", "educacao", "saude"], // 57 Mogi Mirim
  ["educacao", "trabalho"], // 58 Jaguariúna
  ["educacao", "trabalho", "cultura"], // 59 Araras
  ["saude", "educacao"], // 60 Botucatu
  ["saude", "educacao", "trabalho"], // 61 Itapetininga
  ["cidade", "trabalho"], // 62 Mairinque
  ["educacao", "saude", "cultura"], // 63 Araraquara
  ["trabalho", "educacao"], // 64 Boituva
  ["cidade", "trabalho"], // 65 Cabreúva
  ["cidade", "saude"], // 66 Caraguatatuba
  ["educacao", "saude", "cultura"], // 67 São João da Boa Vista
  ["cidade", "saude"], // 68 Bertioga
  ["trabalho", "cultura", "educacao"], // 69 Pedreira
  ["cidade", "trabalho", "cultura"], // 70 São Sebastião
  ["trabalho", "educacao", "cidade"], // 71 Cosmópolis
  ["cultura", "educacao", "trabalho"], // 72 Tatuí
  ["cidade", "trabalho"], // 73 Ibiúna
  ["cidade", "saude"], // 74 Peruíbe
  ["trabalho", "educacao"], // 75 Cerquilho
  ["trabalho", "cidade", "saude"], // 76 Alumínio
  ["educacao", "trabalho"], // 77 Pirassununga
  ["cultura", "trabalho"], // 78 Porto Feliz
  ["cidade", "trabalho"], // 79 Jarinu
  ["saude", "cidade", "cultura"], // 80 Tremembé
  ["cidade", "trabalho"], // 81 Araçoiaba da Serra
  ["saude", "educacao", "trabalho"], // 82 Itapira
  ["cultura", "educacao", "trabalho"], // 83 Tietê
  ["cidade", "cultura"], // 84 Piracaia
  ["saude", "educacao", "trabalho", "cultura"], // 85 São José do Rio Preto
  ["cultura", "cidade"], // 86 Pirapora do Bom Jesus
  ["educacao", "trabalho", "cultura"], // 87 Capivari
  ["educacao", "cultura", "trabalho"], // 88 Espírito Santo do Pinhal
  ["cidade", "cultura"], // 89 Guararema
  ["saude", "educacao", "trabalho"], // 90 Marília
  ["trabalho", "educacao"], // 91 Monte Mor
  ["cidade"], // 92 São Lourenço da Serra
  ["cultura", "cidade"], // 93 Serra Negra
  ["cultura", "trabalho"], // 94 Holambra
  ["trabalho", "saude", "educacao"], // 95 Cruzeiro
  ["trabalho", "saude", "educacao", "cultura"], // 96 Jaú
  ["trabalho", "cidade", "saude"], // 97 Piedade
  ["saude", "educacao", "cidade"], // 98 Bom Jesus dos Perdões
  ["cidade", "trabalho"], // 99 Biritiba-Mirim
  ["educacao", "saude", "trabalho", "cultura"], // 100 Lorena
];

/**
 * Os nomes do anexo, na ordem, só para a conferência de alinhamento.
 *
 * Não são usados em lugar nenhum da aplicação — o nome que a tela mostra vem
 * sempre da matriz. Estão aqui para que `conferirTop100` prove que a lista de
 * eixos acima está casada com o ranking certo. Uma lista posicional sem essa
 * prova é uma lista que se desalinha em silêncio no dia em que alguém inserir
 * uma linha no meio.
 */
const NOMES_DO_ANEXO = [
  "São Bernardo do Campo",
  "Guarulhos",
  "Santo André",
  "Osasco",
  "Campinas",
  "São José dos Campos",
  "Sorocaba",
  "Mauá",
  "Cotia",
  "Santana de Parnaíba",
  "Ribeirão Pires",
  "Mairiporã",
  "São Caetano do Sul",
  "Caieiras",
  "Indaiatuba",
  "Poá",
  "Jacareí",
  "Ferraz de Vasconcelos",
  "Jandira",
  "Arujá",
  "Itapecerica da Serra",
  "Americana",
  "Bragança Paulista",
  "Atibaia",
  "Valinhos",
  "Franco da Rocha",
  "Várzea Paulista",
  "Itu",
  "Itatiba",
  "Campo Limpo Paulista",
  "Vinhedo",
  "Salto",
  "São Roque",
  "Ribeirão Preto",
  "Cubatão",
  "Rio Claro",
  "Santa Bárbara d'Oeste",
  "Hortolândia",
  "Vargem Grande Paulista",
  "Paulínia",
  "Embu-Guaçu",
  "Votorantim",
  "Cajamar",
  "São Carlos",
  "Rio Grande da Serra",
  "Louveira",
  "Caçapava",
  "Amparo",
  "Itupeva",
  "Itanhaém",
  "Pindamonhangaba",
  "Mogi Guaçu",
  "Nova Odessa",
  "Mongaguá",
  "Santa Isabel",
  "Guaratinguetá",
  "Mogi Mirim",
  "Jaguariúna",
  "Araras",
  "Botucatu",
  "Itapetininga",
  "Mairinque",
  "Araraquara",
  "Boituva",
  "Cabreúva",
  "Caraguatatuba",
  "São João da Boa Vista",
  "Bertioga",
  "Pedreira",
  "São Sebastião",
  "Cosmópolis",
  "Tatuí",
  "Ibiúna",
  "Peruíbe",
  "Cerquilho",
  "Alumínio",
  "Pirassununga",
  "Porto Feliz",
  "Jarinu",
  "Tremembé",
  "Araçoiaba da Serra",
  "Itapira",
  "Tietê",
  "Piracaia",
  "São José do Rio Preto",
  "Pirapora do Bom Jesus",
  "Capivari",
  "Espírito Santo do Pinhal",
  "Guararema",
  "Marília",
  "Monte Mor",
  "São Lourenço da Serra",
  "Serra Negra",
  "Holambra",
  "Cruzeiro",
  "Jaú",
  "Piedade",
  "Bom Jesus dos Perdões",
  "Biritiba-Mirim",
  "Lorena",
];

/** Municípios do ranking, ordenados pela posição. Índice 0 = posição 1. */
function ranqueados(): Municipio[] {
  return MUNICIPIOS_SP.filter((m) => m.posicao !== null).sort(
    (a, b) => (a.posicao ?? 0) - (b.posicao ?? 0),
  );
}

/**
 * Confere que a lista de eixos ainda aponta para os municípios certos.
 *
 * Roda nos testes, não em produção. O que ela protege é o modo de falha mais
 * traiçoeiro de uma lista posicional: alguém acrescenta um município à matriz do
 * IPS, tudo continua compilando, e a partir dali Guarulhos passa a exibir o eixo
 * de Santo André sem nenhum erro em lugar nenhum.
 */
export function conferirTop100(): { posicao: number; esperado: string; encontrado: string }[] {
  const lista = ranqueados();
  const divergencias: { posicao: number; esperado: string; encontrado: string }[] = [];

  for (let indice = 0; indice < NOMES_DO_ANEXO.length; indice += 1) {
    const municipio = lista[indice];
    if (!municipio || municipio.nome !== NOMES_DO_ANEXO[indice]) {
      divergencias.push({
        posicao: indice + 1,
        esperado: NOMES_DO_ANEXO[indice],
        encontrado: municipio?.nome ?? "(nenhum)",
      });
    }
  }

  return divergencias;
}

/**
 * Os eixos de entrada de um município.
 *
 * Vazio fora do Top 100 — e isso é a resposta certa, não uma lacuna. O anexo só
 * fez a leitura estratégica das cem primeiras; atribuir um eixo às outras 545 a
 * partir de nada seria inventar orientação de campanha.
 */
export function eixosDoMunicipio(municipio: Municipio): Eixo[] {
  const posicao = municipio.posicao;
  if (posicao === null || posicao < 1 || posicao > EIXOS_DO_TOP_100.length) return [];
  return EIXOS_DO_TOP_100[posicao - 1]
    .map((id) => EIXO_POR_ID.get(id))
    .filter((eixo): eixo is Eixo => Boolean(eixo));
}

// --- A ficha territorial ------------------------------------------------------

/**
 * A ficha mínima que o documento pede para cada município.
 *
 * Os campos se dividem em dois grupos, e a diferença importa: os **derivados**
 * saem da matriz e do anexo, e ninguém digita; os **da equipe** são o trabalho
 * de campo — organizações, lideranças, parceiros, próxima ação — e chegam
 * preenchidos por gente. Só o segundo grupo é editável.
 */
export type FichaTerritorial = {
  municipio: Municipio;
  camada: Camada | null;
  bloco: Bloco | null;
  /** O primeiro é o principal; os outros, secundários. */
  eixos: Eixo[];
  presencaSugerida: NivelDePresenca;
};

export function fichaDoMunicipio(municipio: Municipio): FichaTerritorial {
  return {
    municipio,
    camada: camadaDaPosicao(municipio.posicao),
    bloco: blocoDaPosicao(municipio.posicao),
    eixos: eixosDoMunicipio(municipio),
    presencaSugerida: presencaSugerida(municipio.posicao),
  };
}

/** Os municípios de uma camada, na ordem do ranking. */
export function municipiosDaCamada(camada: CamadaId): Municipio[] {
  return ranqueados().filter((m) => camadaDaPosicao(m.posicao)?.id === camada);
}

/** Quantos municípios cada camada tem — para o resumo da tela. */
export function tamanhoDasCamadas(): { camada: Camada; municipios: number }[] {
  return CAMADAS.map((camada) => ({
    camada,
    municipios: municipiosDaCamada(camada.id).length,
  }));
}

/**
 * Os municípios do Top 100 que entram por um eixo.
 *
 * É a pergunta da produção de conteúdo: "onde a pauta de saúde abre porta?".
 * Conta o eixo em qualquer posição da lista, principal ou secundário — quem
 * procura território para uma pauta não quer só os que a têm como primeira.
 */
export function municipiosDoEixo(eixo: EixoId): Municipio[] {
  return ranqueados()
    .slice(0, EIXOS_DO_TOP_100.length)
    .filter((m) => eixosDoMunicipio(m).some((item) => item.id === eixo));
}

/**
 * A ressalva do IPS, escrita uma vez e mostrada em toda tela que exibe posição.
 *
 * Existe como constante e não como texto solto na tela porque ela precisa
 * aparecer sempre igual: um ranking preliminar que aparece sem ressalva em uma
 * tela vira definitivo na cabeça de quem leu só aquela.
 */
export const RESSALVA_DO_IPS =
  "Ranking preliminar (IPS v0.2): população 40%, proximidade 25%, IDHM 2010 20% e escala urbana 15%. " +
  "Faltam saúde, educação, saneamento, habitação, mobilidade e segurança. Serve para priorizar, não para concluir.";
