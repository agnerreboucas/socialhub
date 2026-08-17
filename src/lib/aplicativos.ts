import { BarChart3, CalendarClock, Clock, LayoutDashboard, Library, Radio } from "lucide-react";

/**
 * Os aplicativos da plataforma, num lugar só.
 *
 * A plataforma não é um aplicativo: é um conjunto deles sobre a mesma base — a
 * rádio operacional do ponto de venda e o Social Hub da campanha. A promessa é
 * justamente essa, a de ligar tudo, e ela se quebra de um jeito bobo: cada tela
 * escrevendo a própria lista de links.
 *
 * Era o que acontecia. A rádio tinha um cabeçalho com seis links, incluindo um
 * para o Social; o Social não tinha nenhum de volta. Quem entrava no Social
 * ficava preso ali e só saía pelo botão de voltar do navegador — e "os outros
 * aplicativos sumiram" é exatamente a impressão que isso dá.
 *
 * Com a lista aqui, quem acrescentar um aplicativo novo o vê aparecer nos dois
 * lados sem tocar em nenhuma tela. É a diferença entre uma navegação que se
 * mantém sozinha e uma que depende de alguém lembrar de editar dois arquivos.
 */
export type Aplicativo = {
  /** A rota de entrada. É por ela que se decide qual está ativo. */
  to: string;
  nome: string;
  /** O que ele faz, em uma linha — para o menu e para quem nunca abriu. */
  resumo: string;
  icone: typeof Radio;
  /**
   * A que produto ele pertence. Dois produtos hoje: a rádio do ponto de venda e
   * o hub social da campanha. O agrupamento é o que evita um menu de seis itens
   * soltos onde não se vê que quatro deles são a mesma coisa.
   */
  produto: "radio" | "social";
};

export const APLICATIVOS: Aplicativo[] = [
  {
    to: "/radio",
    nome: "Rádio",
    resumo: "A tela operacional: o que está tocando agora e o que vem em seguida.",
    icone: Radio,
    produto: "radio",
  },
  {
    to: "/biblioteca",
    nome: "Biblioteca",
    resumo: "O acervo de áudios e roteiros.",
    icone: Library,
    produto: "radio",
  },
  {
    to: "/relogios",
    nome: "Relógios",
    resumo: "Os templates de hora que montam a programação.",
    icone: Clock,
    produto: "radio",
  },
  {
    to: "/programacao",
    nome: "Programação",
    resumo: "A grade da semana, hora a hora.",
    icone: CalendarClock,
    produto: "radio",
  },
  {
    to: "/admin",
    nome: "Admin da rádio",
    resumo: "Os números da rádio: o que mais tocou e o que mais rendeu.",
    icone: LayoutDashboard,
    produto: "radio",
  },
  {
    to: "/social",
    nome: "Social Hub",
    resumo: "Campanha nas redes: agenda, produção, análise e publicação.",
    icone: BarChart3,
    produto: "social",
  },
];

export const NOME_DO_PRODUTO: Record<Aplicativo["produto"], string> = {
  radio: "Rádio do ponto de venda",
  social: "Redes sociais",
};

/**
 * Qual aplicativo está aberto, a partir do caminho da URL.
 *
 * O casamento é pelo prefixo mais longo, e isso importa: `/social/agenda` tem de
 * casar com `/social`, mas `/relogios` não pode casar com `/` nem com nada mais
 * curto que ele. Ordenar por tamanho antes de procurar resolve os dois casos com
 * uma regra só, em vez de uma cascata de exceções.
 */
export function aplicativoDaRota(pathname: string): Aplicativo | null {
  return (
    [...APLICATIVOS]
      .sort((a, b) => b.to.length - a.to.length)
      .find((app) => pathname === app.to || pathname.startsWith(`${app.to}/`)) ?? null
  );
}

/** Os aplicativos agrupados por produto, na ordem em que aparecem no menu. */
export function porProduto(): { produto: Aplicativo["produto"]; apps: Aplicativo[] }[] {
  const grupos: { produto: Aplicativo["produto"]; apps: Aplicativo[] }[] = [];
  for (const app of APLICATIVOS) {
    const grupo = grupos.find((item) => item.produto === app.produto);
    if (grupo) grupo.apps.push(app);
    else grupos.push({ produto: app.produto, apps: [app] });
  }
  return grupos;
}
