import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand-header";
import { ProgramGrid } from "@/components/programacao/program-grid";

export const Route = createFileRoute("/programacao")({
  head: () => ({
    meta: [
      { title: "Programação — Retail Radio AI" },
      { name: "description", content: "Monte a grade sonora do seu estabelecimento arrastando blocos por horário." },
    ],
  }),
  component: ProgramacaoPage,
});

function ProgramacaoPage() {
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="px-6 pb-16 md:px-10">
        <div className="mb-8 flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Grade do dia · Quarta-feira
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Programação Sonora
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Arraste blocos da paleta para os horários da loja. Reordene dentro de cada faixa.
            A rádio executa automaticamente seguindo essa grade.
          </p>
        </div>
        <ProgramGrid />
      </main>
    </div>
  );
}
