import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Info, MapPin, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { detalharLocalidade, obterLocalidades } from "@/lib/api/social.functions";
import {
  EmptyState,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/social/primitives";
import {
  BOOST_OBJECTIVE_LABELS,
  formatCompact,
  formatCurrency,
  formatDay,
  formatNumber,
  formatPercent,
} from "@/lib/social/format";
import {
  NOME_DA_UF,
  REGIOES,
  SEM_REGIAO,
  type LocalAlcancado,
  type Regiao,
  buscarLocais,
  locaisDaRegiao,
} from "@/lib/social/localidades";
import { nomeDoFormato } from "@/lib/social/rastreio";
import { NIVEIS_DE_PRESENCA, RESSALVA_DO_IPS, fichaDoMunicipio } from "@/lib/social/territorio";
import { useSocialSession } from "@/lib/social/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/social/localidades")({
  component: LocalidadesPage,
});

type Corte = "cidade" | "estado" | "regiao";

const ROTULO_DO_CORTE: Record<Corte, string> = {
  cidade: "Cidades",
  estado: "Estados",
  regiao: "Regiões",
};

/**
 * Onde a campanha chegou — cidade por cidade, no Brasil todo.
 *
 * Esta tela substituiu o mapa do estado de São Paulo. A troca foi pedida com a
 * mudança de escopo (a operação passou a ser nacional), e o mapa não dava para
 * levar junto: ele existia em cima da tabela dos 645 municípios paulistas, com
 * as coordenadas de cada sede. Fazer o mesmo desenho para 5.570 municípios
 * exigiria a malha do país inteiro — e o desenho não é o que decide nada aqui.
 *
 * Em lugar dele, três cortes do mesmo dado. **Cidades** é a lista, que responde
 * "onde foi mais forte". **Estados** e **Regiões** agregam, que é o que a
 * pergunta nacional exige: cinquenta cidades espalhadas não dizem se o Nordeste
 * está coberto; a soma por região diz.
 *
 * A linha "não identificada" é de propósito e não deve ser escondida. Quando a
 * rede manda só "Juazeiro do Norte", sem o estado, a plataforma não tem como
 * saber de onde é — e inventar colocaria entrega no estado errado sem ninguém
 * ver. Aparecer como não identificada mostra o tamanho do ponto cego.
 */
function LocalidadesPage() {
  const { projectId } = useSocialSession();
  const [corte, setCorte] = useState<Corte>("cidade");
  const [regiao, setRegiao] = useState<Regiao | typeof SEM_REGIAO | null>(null);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const dados = useQuery({
    queryKey: ["social", "localidades", projectId],
    queryFn: () => obterLocalidades({ data: { projectId: projectId ?? undefined } }),
  });

  const visiveis = useMemo(() => {
    if (!dados.data) return [];
    return buscarLocais(locaisDaRegiao(dados.data.locais, regiao), busca);
  }, [dados.data, regiao, busca]);

  const totais = dados.data?.totais;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alcance por localidade"
        description="Onde os anúncios entregaram, por cidade, estado e região. A base é a quebra por localidade que a rede devolve; quando ela não vem, a divisão é estimada e a linha fica marcada."
      />

      {dados.isPending ? (
        <LoadingBlock rows={6} />
      ) : !dados.data || dados.data.locais.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma entrega por localidade ainda"
          description="A lista é alimentada pela segmentação dos impulsionamentos. Quando o primeiro anúncio rodar com cidades definidas, cada uma aparece aqui com o alcance que recebeu."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Pessoas alcançadas"
              value={formatCompact(totais!.alcance)}
              hint={`${formatNumber(totais!.locais)} ${totais!.locais === 1 ? "localidade" : "localidades"}`}
              explica="Soma do alcance que a rede atribuiu a cada localidade. Pessoas em duas cidades diferentes contam duas vezes aqui, porque a rede reporta por lugar."
            />
            <StatCard
              label="Cidades"
              value={formatNumber(totais!.cidades)}
              hint={`${formatNumber(totais!.estados)} ${totais!.estados === 1 ? "estado" : "estados"} · ${formatNumber(totais!.regioes)} ${totais!.regioes === 1 ? "região" : "regiões"}`}
              explica="Localidades distintas que receberam alguma entrega. Nome repetido em grafias diferentes conta uma vez só."
            />
            <StatCard
              label="Investido"
              value={formatCurrency(totais!.investido)}
              hint={
                totais!.custoPorMil === null
                  ? "sem custo por mil"
                  : `${formatCurrency(totais!.custoPorMil)} por mil`
              }
              explica="Verba dos impulsionamentos atribuída às localidades, e o custo para alcançar mil pessoas."
            />
            <StatCard
              label="Números medidos"
              value={`${formatNumber(totais!.medidas)} de ${formatNumber(totais!.locais)}`}
              hint={
                totais!.estimadas === 0
                  ? "nenhuma estimativa"
                  : `${formatNumber(totais!.estimadas)} por estimativa`
              }
              explica="Medido é quando a rede devolveu o resultado daquela cidade. Estimado é quando só veio o total do anúncio e a plataforma repartiu igualmente entre as cidades segmentadas."
            />
          </div>

          {totais!.semEstado > 0 ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {formatNumber(totais!.semEstado)}{" "}
                {totais!.semEstado === 1 ? "localidade veio" : "localidades vieram"} sem o estado no
                nome, e {totais!.semEstado === 1 ? "aparece" : "aparecem"} como “não identificada”.
                A plataforma não deduz o estado por conta própria: nomes de cidade se repetem entre
                estados, e o palpite errado colocaria entrega no lugar errado sem ninguém notar.
              </span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border p-1">
              {(Object.keys(ROTULO_DO_CORTE) as Corte[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCorte(id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    corte === id
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ROTULO_DO_CORTE[id]}
                </button>
              ))}
            </div>

            {corte === "cidade" ? (
              <>
                <label className="relative flex min-w-[14rem] flex-1 items-center">
                  <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                  <span className="sr-only">Buscar cidade ou estado</span>
                  <input
                    value={busca}
                    onChange={(evento) => setBusca(evento.target.value)}
                    placeholder="Buscar cidade ou estado…"
                    className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>

                <div className="flex flex-wrap gap-1.5">
                  <FiltroDeRegiao ativo={regiao === null} onClick={() => setRegiao(null)}>
                    Todas
                  </FiltroDeRegiao>
                  {REGIOES.filter((id) =>
                    dados.data.porRegiao.some((grupo) => grupo.chave === id),
                  ).map((id) => (
                    <FiltroDeRegiao
                      key={id}
                      ativo={regiao === id}
                      onClick={() => setRegiao(regiao === id ? null : id)}
                    >
                      {dados.data.porRegiao.find((grupo) => grupo.chave === id)?.nome ?? id}
                    </FiltroDeRegiao>
                  ))}
                  {dados.data.porRegiao.some((grupo) => grupo.chave === SEM_REGIAO) ? (
                    <FiltroDeRegiao
                      ativo={regiao === SEM_REGIAO}
                      onClick={() => setRegiao(regiao === SEM_REGIAO ? null : SEM_REGIAO)}
                    >
                      Não identificada
                    </FiltroDeRegiao>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          {corte === "cidade" ? (
            <SectionCard
              title="Cidades alcançadas"
              description="Da maior entrega para a menor. Clique numa linha para ver os anúncios que chegaram ali."
              icon={MapPin}
            >
              {visiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma localidade com esse filtro.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                  {visiveis.map((local) => (
                    <LinhaDaCidade
                      key={local.local}
                      local={local}
                      aberta={aberto === local.local}
                      onAbrir={() => setAberto(aberto === local.local ? null : local.local)}
                      projectId={projectId ?? undefined}
                    />
                  ))}
                  </ul>
                  {visiveis.some((local) => local.ufInferida) ? (
                    <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      * O estado não veio no nome e foi deduzido da lista de municípios paulistas.
                      Nomes de cidade se repetem entre estados, então vale como indicação, não como
                      informação da rede.
                    </p>
                  ) : null}
                </>
              )}
            </SectionCard>
          ) : (
            <SectionCard
              title={corte === "estado" ? "Por estado" : "Por região"}
              description={
                corte === "estado"
                  ? "A soma do que chegou em cada estado. O estado vem do nome que a rede informou."
                  : "A soma por região do país. É o corte que responde se a campanha está nacional de fato ou concentrada."
              }
              icon={MapPin}
            >
              <ul className="space-y-3">
                {(corte === "estado" ? dados.data.porUf : dados.data.porRegiao).map((grupo) => (
                  <li key={grupo.chave}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {grupo.nome}
                        {grupo.estimado ? (
                          <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">
                            tem estimativa
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatCompact(grupo.alcance)} · {formatPercent(grupo.fatia)} ·{" "}
                        {formatNumber(grupo.locais)}{" "}
                        {grupo.locais === 1 ? "localidade" : "localidades"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(1, grupo.fatia)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(grupo.investido)} investido
                      {grupo.custoPorMil === null
                        ? ""
                        : ` · ${formatCurrency(grupo.custoPorMil)} por mil`}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

function FiltroDeRegiao({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs transition-colors",
        ativo
          ? "border-accent bg-accent/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function LinhaDaCidade({
  local,
  aberta,
  onAbrir,
  projectId,
}: {
  local: LocalAlcancado;
  aberta: boolean;
  onAbrir: () => void;
  projectId?: string;
}) {
  return (
    <li className="py-3">
      <button
        type="button"
        onClick={onAbrir}
        aria-expanded={aberta}
        className="flex w-full flex-wrap items-baseline justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {local.cidade}
            {local.uf ? (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {local.uf}
                {local.ufInferida ? "*" : ""}
              </span>
            ) : (
              <span className="ml-1.5 text-xs font-normal text-amber-400">estado não informado</span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {formatNumber(local.publicacoes.length)}{" "}
            {local.publicacoes.length === 1 ? "publicação" : "publicações"} ·{" "}
            {formatCurrency(local.investido)}
            {local.custoPorMil === null
              ? ""
              : ` · ${formatCurrency(local.custoPorMil)} por mil`}
            {local.estimado ? " · número estimado" : ""}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-sm font-semibold tabular-nums">
            {formatCompact(local.alcance)}
          </span>
          <span className="block text-xs tabular-nums text-muted-foreground">
            {formatPercent(local.fatia)} do total
          </span>
        </span>
      </button>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", local.estimado ? "bg-amber-500/70" : "bg-accent")}
          style={{ width: `${Math.max(1, local.fatia)}%` }}
        />
      </div>

      {aberta ? <DetalheDaLocalidade local={local.local} projectId={projectId} /> : null}
    </li>
  );
}

function DetalheDaLocalidade({ local, projectId }: { local: string; projectId?: string }) {
  const detalhe = useQuery({
    queryKey: ["social", "localidade", projectId, local],
    queryFn: () => detalharLocalidade({ data: { projectId, local } }),
  });

  if (detalhe.isPending) return <LoadingBlock rows={2} />;
  if (detalhe.isError || !detalhe.data) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Não foi possível carregar o detalhe desta localidade agora.
      </p>
    );
  }

  const { entregas, municipio, penetracao } = detalhe.data;
  const ficha = municipio ? fichaDoMunicipio(municipio) : null;

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
      {penetracao !== null ? (
        <p className="text-sm">
          <span className="font-medium">{formatPercent(penetracao * 100)}</span>{" "}
          <span className="text-muted-foreground">
            da população do município — {formatNumber(municipio!.populacao ?? 0)} habitantes. Diz se
            o investimento foi denso ou espalhado.
          </span>
        </p>
      ) : null}

      {ficha ? (
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Ficha territorial</p>
          <p>
            {ficha.camada ? `${ficha.camada.nome} · ` : ""}
            {`presença ${
              NIVEIS_DE_PRESENCA.find((nivel) => nivel.id === ficha.presencaSugerida)?.nome ??
              ficha.presencaSugerida
            } · `}
            {ficha.eixos.length > 0
              ? `eixos: ${ficha.eixos.map((eixo) => eixo.nome).join(", ")}`
              : "sem eixo definido"}
          </p>
          <p className="flex items-start gap-1.5">
            <Info className="mt-0.5 size-3 shrink-0" />
            {RESSALVA_DO_IPS}
          </p>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-medium">O que chegou aqui</p>
        {entregas.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Nenhum impulsionamento desta conta consta com entrega nesta localidade.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {entregas.map((entrega) => (
              <li
                key={entrega.boostId}
                className="rounded-lg border border-border bg-background/60 p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {BOOST_OBJECTIVE_LABELS[entrega.objetivo]}
                    {entrega.estimado ? (
                      <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">
                        estimado
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCompact(entrega.alcance)} · {formatCurrency(entrega.investido)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDay(entrega.comecouEm.slice(0, 10))} a{" "}
                  {formatDay(entrega.terminaEm.slice(0, 10))} ·{" "}
                  {entrega.cidadesNoAnuncio === 1
                    ? "anúncio só para esta cidade"
                    : `dividido com ${formatNumber(entrega.cidadesNoAnuncio - 1)} ${
                        entrega.cidadesNoAnuncio - 1 === 1 ? "outra cidade" : "outras cidades"
                      }`}
                </p>
                {entrega.peca ? (
                  <Link
                    to="/social/publicacao/$postId"
                    params={{ postId: entrega.peca.id }}
                    className="mt-1.5 inline-block text-xs text-accent hover:underline"
                  >
                    {nomeDoFormato(entrega.peca.formato)}: {entrega.peca.trecho || "sem legenda"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
