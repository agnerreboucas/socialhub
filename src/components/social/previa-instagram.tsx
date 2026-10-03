import {
  Bookmark,
  Heart,
  Images,
  MessageCircle,
  MoreHorizontal,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import {
  PROPORCAO_DA_GRADE,
  type ItemDaGrade,
  avisosDaPrevia,
  cortarLegenda,
  hashtagsDaLegenda,
  pedacosDaLegenda,
  razaoDaProporcao,
} from "@/lib/social/previa";
import type { PostMedia, SocialAccount } from "@/lib/social/types";
import { cn } from "@/lib/utils";

/**
 * A peça como ela vai aparecer, antes de existir.
 *
 * Três abas, e cada uma responde uma pergunta diferente. **Feed** mostra onde a
 * legenda corta no "mais" — o que decide se quem passa rolando entende a peça.
 * **Story** mostra as faixas que a interface do Instagram cobre, que é onde texto
 * de arte desaparece. **Grade** mostra o perfil: peça a peça cada arte pode estar
 * boa e o conjunto sair repetitivo, e isso só aparece lado a lado.
 *
 * A prévia não promete ser pixel igual ao aplicativo — a Meta muda a interface
 * sem avisar, e uma prévia que se vende como idêntica envelhece mal. Ela garante
 * o que decide: o corte da legenda, o número de marcações e o que o recorte come.
 */
export function PreviaInstagram({
  conta,
  legenda,
  media,
  formato,
  grade = [],
  className,
}: {
  conta?: SocialAccount;
  legenda: string;
  media: PostMedia;
  formato: string;
  /** As peças já agendadas, para a prévia da linha editorial. */
  grade?: ItemDaGrade[];
  className?: string;
}) {
  const [aba, setAba] = useState<"feed" | "story" | "grade">(
    formato === "story" ? "story" : "feed",
  );

  const avisos = avisosDaPrevia({ legenda, media, formato });
  const hashtags = hashtagsDaLegenda(legenda);

  const abas: { id: typeof aba; rotulo: string }[] = [
    { id: "feed", rotulo: "Feed" },
    { id: "story", rotulo: "Story" },
    { id: "grade", rotulo: "Grade" },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-border p-1">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs transition-colors",
                aba === item.id
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {hashtags.length} {hashtags.length === 1 ? "marcação" : "marcações"}
        </span>
      </div>

      {aba === "feed" ? (
        <CartaoDoFeed conta={conta} legenda={legenda} media={media} formato={formato} />
      ) : aba === "story" ? (
        <QuadroDoStory conta={conta} media={media} />
      ) : (
        <GradeDoPerfil conta={conta} grade={grade} media={media} legenda={legenda} />
      )}

      {avisos.length > 0 ? (
        <ul className="space-y-1.5">
          {avisos.map((aviso, indice) => (
            <li
              key={indice}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs leading-snug",
                aviso.gravidade === "erro"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400",
              )}
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>{aviso.mensagem}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** O retângulo da arte. Sem arquivo ainda: a proporção é a informação. */
function Arte({
  media,
  formato,
  gradiente,
  proporcao,
  children,
}: {
  media: PostMedia;
  formato?: string;
  gradiente?: string;
  /** Força a proporção do recorte, para a grade e para o story. */
  proporcao?: number;
  children?: React.ReactNode;
}) {
  const razao = proporcao ?? razaoDaProporcao(media.aspectRatio);

  return (
    <div
      className="relative w-full overflow-hidden bg-secondary"
      style={{
        aspectRatio: String(razao),
        background: gradiente || "linear-gradient(135deg, oklch(0.5 0.14 280), oklch(0.32 0.1 250))",
      }}
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white">
          {media.aspectRatio}
          {formato === "carrossel" ? ` · ${media.count} itens` : ""}
          {formato === "video" && media.durationSeconds ? ` · ${media.durationSeconds}s` : ""}
        </span>
      </div>
      {formato === "carrossel" ? (
        <Images className="absolute right-2 top-2 size-4 text-white/90 drop-shadow" />
      ) : null}
      {children}
    </div>
  );
}

function Cabecalho({ conta, compacto = false }: { conta?: SocialAccount; compacto?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", compacto ? "px-2 py-1.5" : "px-3 py-2.5")}>
      <span
        className="size-7 shrink-0 rounded-full"
        style={{
          background:
            conta?.avatarGradient ||
            "linear-gradient(135deg, oklch(0.72 0.2 60), oklch(0.55 0.25 350))",
        }}
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
        {conta?.handle ?? "sua.conta"}
      </span>
      <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

function CartaoDoFeed({
  conta,
  legenda,
  media,
  formato,
}: {
  conta?: SocialAccount;
  legenda: string;
  media: PostMedia;
  formato: string;
}) {
  const [aberta, setAberta] = useState(false);
  const corte = cortarLegenda(legenda);
  const texto = aberta ? legenda : corte.visivel;

  return (
    <div className="mx-auto max-w-[22rem] overflow-hidden rounded-2xl border border-border bg-card">
      <Cabecalho conta={conta} />
      <Arte media={media} formato={formato} />

      <div className="px-3 pb-3 pt-2.5">
        <div className="flex items-center gap-3.5 text-muted-foreground">
          <Heart className="size-5" />
          <MessageCircle className="size-5" />
          <Send className="size-5" />
          <Bookmark className="ml-auto size-5" />
        </div>

        <p className="mt-2.5 whitespace-pre-wrap break-words text-xs leading-relaxed">
          <span className="font-semibold">{conta?.handle ?? "sua.conta"}</span>{" "}
          {legenda.trim().length === 0 ? (
            <span className="text-muted-foreground">sem legenda</span>
          ) : (
            pedacosDaLegenda(texto).map((pedaco, indice) => (
              <span
                key={indice}
                className={pedaco.tipo === "texto" ? undefined : "text-[#4a9ae1]"}
              >
                {pedaco.texto}
              </span>
            ))
          )}
          {corte.cortada && !aberta ? (
            <>
              {"… "}
              <button
                type="button"
                onClick={() => setAberta(true)}
                className="text-muted-foreground hover:underline"
              >
                mais
              </button>
            </>
          ) : null}
        </p>

        {corte.cortada ? (
          <p className="mt-2 border-t border-border/60 pt-2 text-[11px] leading-snug text-muted-foreground">
            {aberta ? (
              <>
                Mostrando a legenda inteira.{" "}
                <button
                  type="button"
                  onClick={() => setAberta(false)}
                  className="text-accent hover:underline"
                >
                  Ver como o feed corta
                </button>
              </>
            ) : (
              `Quem passa rolando lê só esta parte. Os outros ${corte.escondido.length} caracteres ficam atrás do “mais”.`
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * O story, com as faixas que a interface do Instagram cobre.
 *
 * As porcentagens são aproximadas e variam com o aparelho — o que não varia é
 * que existe interface em cima e embaixo. Texto de arte colocado ali desaparece,
 * e é a única coisa que esta prévia precisa provar.
 */
const FAIXA_DE_CIMA = 0.14;
const FAIXA_DE_BAIXO = 0.2;

function QuadroDoStory({ conta, media }: { conta?: SocialAccount; media: PostMedia }) {
  return (
    <div className="mx-auto max-w-[16rem]">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <Arte media={media} proporcao={9 / 16}>
          <div
            className="absolute inset-x-0 top-0 border-b border-dashed border-white/50 bg-black/35"
            style={{ height: `${FAIXA_DE_CIMA * 100}%` }}
          >
            <div className="flex items-center gap-2 px-2.5 pt-2">
              <span
                className="size-5 rounded-full ring-2 ring-white/80"
                style={{
                  background:
                    conta?.avatarGradient ||
                    "linear-gradient(135deg, oklch(0.72 0.2 60), oklch(0.55 0.25 350))",
                }}
              />
              <span className="truncate text-[10px] font-semibold text-white">
                {conta?.handle ?? "sua.conta"}
              </span>
            </div>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center border-t border-dashed border-white/50 bg-black/35 pb-2"
            style={{ height: `${FAIXA_DE_BAIXO * 100}%` }}
          >
            <span className="rounded-full border border-white/60 px-3 py-1 text-[10px] text-white">
              Enviar mensagem
            </span>
          </div>
        </Arte>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        As faixas tracejadas são cobertas pela interface do Instagram — o nome do perfil em cima, a
        caixa de mensagem embaixo. Texto de arte ali desaparece. A medida é aproximada e muda com o
        aparelho.
      </p>
    </div>
  );
}

/**
 * A grade do perfil, com a peça em edição no lugar onde ela vai cair.
 *
 * É a prévia da linha editorial: três fundos escuros seguidos ou a mesma cor nas
 * nove primeiras só aparecem aqui.
 */
function GradeDoPerfil({
  conta,
  grade,
  media,
  legenda,
}: {
  conta?: SocialAccount;
  grade: ItemDaGrade[];
  media: PostMedia;
  legenda: string;
}) {
  const emEdicao: ItemDaGrade = {
    id: "__em-edicao",
    trecho: legenda.replace(/\s+/g, " ").trim().slice(0, 40),
    quando: null,
    formato: "imagem",
    coverGradient: "",
    futura: true,
  };

  const itens = [emEdicao, ...grade].slice(0, 9);

  return (
    <div className="mx-auto max-w-[22rem]">
      <Cabecalho conta={conta} compacto />
      <div className="grid grid-cols-3 gap-0.5">
        {itens.map((item) => (
          <div
            key={item.id}
            className={cn(
              "relative overflow-hidden",
              item.id === "__em-edicao" && "ring-2 ring-inset ring-accent",
            )}
            style={{ aspectRatio: String(PROPORCAO_DA_GRADE) }}
          >
            <div
              className="size-full"
              style={{
                background:
                  item.coverGradient ||
                  "linear-gradient(135deg, oklch(0.5 0.14 280), oklch(0.32 0.1 250))",
              }}
            />
            {item.futura ? (
              <span className="absolute left-1 top-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-white">
                {item.id === "__em-edicao" ? "esta" : "agendada"}
              </span>
            ) : null}
            {item.formato === "carrossel" ? (
              <Images className="absolute right-1 top-1 size-3 text-white/90" />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        A peça em edição está no canto, com borda. As agendadas aparecem no lugar onde vão cair, e o
        recorte é o da grade — a arte perde as bordas que ficam fora dele.
        {media.aspectRatio !== "4:5" ? ` A sua está ${media.aspectRatio}.` : ""}
      </p>
    </div>
  );
}
