import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

/**
 * A página que a Meta exige junto do endereço de exclusão.
 *
 * Quando alguém remove o aplicativo da conta e pede a remoção dos dados, a Meta
 * devolve para essa pessoa um link com o número de protocolo. Esta é a página
 * desse link.
 *
 * **Pública e sem sessão de propósito.** Quem chega aqui acabou de desconectar
 * o aplicativo — exigir login para saber o que aconteceu com os próprios dados
 * seria exatamente o contrário do que a página serve.
 *
 * Ela não consulta nada. O protocolo vem na própria URL, e a página diz o que
 * foi feito e como falar com gente. Uma consulta ao estado do pedido faria deste
 * endereço público uma janela para a base: manda um protocolo, lê a resposta,
 * descobre quem está cadastrado.
 */
export const Route = createFileRoute("/exclusao-de-dados")({
  validateSearch: (busca: Record<string, unknown>) => ({
    codigo: typeof busca.codigo === "string" ? busca.codigo : null,
  }),
  component: ExclusaoDeDados,
});

function ExclusaoDeDados() {
  const { codigo } = Route.useSearch();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center gap-3">
        <div
          className="grid size-10 place-items-center rounded-xl"
          style={{ background: "var(--gradient-brand)" }}
        >
          <ShieldCheck className="size-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Ampliação Marketing Digital
          </p>
          <p className="text-base font-semibold">Social Hub</p>
        </div>
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Exclusão de dados</h1>

      {codigo ? (
        <p className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
          Seu pedido foi registrado com o protocolo{" "}
          <strong className="font-mono tabular-nums">{codigo}</strong>. Guarde este número — é por
          ele que a gente localiza o pedido.
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Esta página recebe o número de protocolo pelo link enviado no momento do pedido. Sem ele,
          o texto abaixo continua valendo.
        </p>
      )}

      <div className="mt-8 space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold">O que a plataforma guarda</h2>
          <p className="mt-1.5 text-muted-foreground">
            Quando uma conta do Instagram ou do Facebook é conectada, o Social Hub guarda o
            identificador da conta, o nome público do perfil e as métricas agregadas que a própria
            rede fornece — alcance, impressões, interações e evolução de seguidores. O token de
            acesso é guardado cifrado e nunca é exibido em nenhuma tela.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">O que acontece com o pedido</h2>
          <p className="mt-1.5 text-muted-foreground">
            Os dados vinculados à conta são removidos e o token de acesso é descartado. A partir daí
            a plataforma deixa de ler qualquer informação daquela conta. Métricas já agregadas em
            relatórios históricos, que não identificam pessoas, podem permanecer.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Você também pode desconectar sozinho</h2>
          <p className="mt-1.5 text-muted-foreground">
            A qualquer momento, em{" "}
            <span className="font-medium text-foreground">
              Facebook → Configurações → Aplicativos e sites
            </span>
            , dá para remover a autorização do Social Hub. Isso encerra o acesso na hora, sem
            precisar trocar a senha.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">Falar com a gente</h2>
          <p className="mt-1.5 text-muted-foreground">
            Dúvidas sobre este pedido:{" "}
            <a className="text-accent hover:underline" href="mailto:ampliacaomktdigital@gmail.com">
              ampliacaomktdigital@gmail.com
            </a>
            . Responder com o número de protocolo agiliza.
          </p>
        </section>
      </div>
    </main>
  );
}
