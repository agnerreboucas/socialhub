import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Grid2x2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOME_DO_PRODUTO, aplicativoDaRota, porProduto } from "@/lib/aplicativos";
import { cn } from "@/lib/utils";

/**
 * O menu que troca de aplicativo.
 *
 * Fica no mesmo lugar em todos os aplicativos — encostado na marca, no alto à
 * esquerda — porque é onde as plataformas que têm mais de um produto o põem, e
 * porque a posição fixa é o que faz a pessoa parar de procurar depois da
 * segunda vez.
 *
 * O botão mostra o aplicativo **atual**, não a palavra "aplicativos". Um menu
 * que diz onde você está antes de dizer para onde pode ir responde à primeira
 * pergunta de quem se perdeu, que é justamente essa.
 *
 * O agrupamento por produto não é enfeite: quatro das seis telas são a mesma
 * rádio vista de ângulos diferentes, e listar as seis em coluna faria parecer
 * que são seis coisas independentes.
 *
 * Feito sobre o `DropdownMenu` do projeto, e não com um `absolute` próprio, por
 * um motivo concreto: na barra lateral do Social o menu nasce dentro de uma
 * coluna de 16rem que rola — e um painel posicionado ali é cortado na borda
 * dela, o que aconteceu na primeira versão. O primitivo desenha o painel fora
 * da árvore da barra, então ele atravessa a borda; de brinde vêm o fechar no
 * Esc, o fechar ao clicar fora e a navegação por teclado, que eu teria de
 * reescrever à mão.
 */
export function TrocaDeAplicativo({ compacto = false }: { compacto?: boolean }) {
  const { pathname } = useLocation();
  const atual = aplicativoDaRota(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Trocar de aplicativo"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border text-sm outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
          compacto ? "px-2 py-1.5" : "px-2.5 py-1.5",
        )}
      >
        <Grid2x2 className="size-4 text-muted-foreground" />
        {compacto ? null : (
          <span className="max-w-[8rem] truncate">{atual ? atual.nome : "Aplicativos"}</span>
        )}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        {porProduto().map((grupo) => (
          <div key={grupo.produto}>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {NOME_DO_PRODUTO[grupo.produto]}
            </DropdownMenuLabel>
            {grupo.apps.map((app) => {
              const ativo = atual?.to === app.to;
              return (
                <DropdownMenuItem key={app.to} asChild className={cn(ativo && "bg-secondary")}>
                  <Link to={app.to} className="flex items-start gap-2.5">
                    <app.icone
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        ativo ? "text-accent" : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{app.nome}</span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {app.resumo}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
