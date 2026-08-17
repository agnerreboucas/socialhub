import { Link, useLocation } from "@tanstack/react-router";
import { Radio } from "lucide-react";

import { APLICATIVOS, aplicativoDaRota } from "@/lib/aplicativos";
import { TrocaDeAplicativo } from "@/components/troca-de-aplicativo";
import { cn } from "@/lib/utils";

/**
 * O cabeçalho da rádio.
 *
 * A barra de links mostra só as telas **da rádio**. O Social Hub saiu dela e
 * foi para o menu de aplicativos, ao lado da marca: ele não é mais uma sexta
 * aba de rádio, é outro produto sobre a mesma base, e misturar os dois na mesma
 * fileira de pílulas dizia o contrário.
 *
 * Os links vêm do registro em `lib/aplicativos.ts`, e não de uma lista escrita
 * aqui. Era uma lista à mão, e foi assim que o Social virou um beco sem saída:
 * o cabeçalho da rádio sabia dele, o Social não sabia da rádio, e nada obrigava
 * os dois lados a concordarem.
 */
export function BrandHeader() {
  const { pathname } = useLocation();
  const atual = aplicativoDaRota(pathname);
  const daRadio = APLICATIVOS.filter((app) => app.produto === "radio");

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 md:px-10 md:py-6">
      <div className="flex items-center gap-3">
        <div
          className="grid size-10 place-items-center rounded-xl"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Radio className="size-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Mercadinho Perfeito
          </div>
          <div className="text-base font-semibold">
            Retail Radio <span className="text-accent">AI</span>
          </div>
        </div>
        <TrocaDeAplicativo />
      </div>

      <nav className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur">
        {daRadio.map((app) => (
          <Link
            key={app.to}
            to={app.to}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors",
              atual?.to === app.to
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <app.icone className="size-4" />
            {app.nome}
          </Link>
        ))}
      </nav>
    </header>
  );
}
