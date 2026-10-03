# Kit social — núcleo de publicação, análise e insights

Isto é o que você copia para o outro projeto para ter o módulo completo:
publicação, agendamento, calendário, Kanban, análise, insights e prévia do
Instagram.

São **21 módulos, ~6.600 linhas de código e 4.500 de teste, 348 testes passando
e nenhuma dependência de runtime.** Só TypeScript puro. Não importa React, nem banco, nem framework de
servidor, nem biblioteca de data. Roda igual em Next, Remix, TanStack Start,
Express ou num script de terminal.

```
cd kit-social
npm test        # 348 testes, sem instalar nada
npm run tipos   # tsc --noEmit
npm run exemplo # o kit inteiro rodando, com saída no terminal
```

**Comece pelo `npm run exemplo`.** Ele monta sete publicações na mão e passa por
todos os módulos, imprimindo o que cada um devolve — validação, corte da legenda,
calendário, Kanban, orgânico × pago, insights e localidades. É o mapa mais rápido
de "o que entra e o que sai" e está em `exemplo.ts`, pronto para copiar trechos.

---

## O que fazer, na ordem

### 1. Copie a pasta

```
cp -r kit-social/nucleo  <outro-projeto>/src/lib/social
```

### 2. Decida como o estado é guardado

**É a única decisão de arquitetura que o kit não toma para você.** Todos os
módulos são funções puras: recebem arrays, devolvem valores. Nenhum deles lê
banco, nenhum grava. Quem busca e grava é o seu projeto.

Você precisa de uma camada que entregue quatro listas:

| Lista | Tipo | Alimenta |
| --- | --- | --- |
| contas | `SocialAccount[]` | tudo |
| números diários | `DailyMetric[]` | análise, insights |
| publicações | `Post[]` | calendário, Kanban, prévia, conteúdo |
| impulsionamentos | `Boost[]` | orgânico × pago, localidades |
| conversas | `InboxItem[]` | relacionamento, atenção |

Tabela, Prisma, Drizzle, JSON em arquivo — o kit não se importa. O contrato é o
`types.ts`.

### 3. Ligue os módulos nas telas

Cada módulo abaixo é uma tela ou um pedaço de tela. Importe a função, passe as
listas, renderize o resultado.

### 4. Publicação real nas redes

O kit valida, agenda e organiza. **Ele não fala com a API da Meta** — isso é
`oauth/` e `banco/` no projeto original, e sai de fora porque é a parte que
depende das credenciais e do App Review do seu app, não de código reaproveitável.
Veja a seção "O que não vem" no fim.

---

## Os módulos, por tela

### Publicação e agendamento

**`networks.ts`** — limites e capacidades de cada rede (Instagram, Facebook,
TikTok, LinkedIn, YouTube, Threads) e a validação do rascunho contra elas.

```ts
import { NETWORKS, validateDraft, hasBlockingIssues, MIDIA_PADRAO } from "./social/networks.ts";

const problemas = validateDraft({ format, caption, media }, contasEscolhidas);
if (hasBlockingIssues(problemas)) return; // a rede recusaria
```

`validateDraft` devolve problemas com `severity: "erro" | "aviso"` por conta, já
com a mensagem pronta em português. É o que impede uma peça de 11 itens de ser
enviada para o Instagram, que aceita 10.

**`previa.ts`** — como a peça vai aparecer antes de existir.

```ts
import { cortarLegenda, avisosDaPrevia, gradeDoPerfil, pedacosDaLegenda } from "./social/previa.ts";

cortarLegenda(legenda);                               // onde o feed corta no "mais"
avisosDaPrevia({ legenda, media, formato });          // o que vai sair torto
pedacosDaLegenda(legenda);                            // pintar #tag e @menção de azul
gradeDoPerfil(posts);                                 // a grade do perfil, prévia da linha editorial
```

`avisosDaPrevia` responde "vai sair como você quer?", que é diferente de
`validateDraft`, que responde "a rede aceita?". Legenda cortada no meio da frase
e arte 9:16 no feed passam na validação e estragam a peça.

### Calendário

**`agenda.ts`** — o calendário e as regras de movimento.

```ts
import {
  distribuirPorDia, gradeDoMes, semanaDe, itensDoDia, resumirDia,
  marcaDaPeca, ROTULO_DA_MARCA, esperandoAprovacao,
  podeNaPeca, motivoParaNaoMexer, statusAoCancelar,
} from "./social/agenda.ts";

const porDia = distribuirPorDia(eventos, posts);   // Map<"AAAA-MM-DD", ItemDoDia[]>
gradeDoMes(2026, 9);                               // os dias da grade, inclusive as sobras do mês vizinho
marcaDaPeca(post);                                 // "aprovar" | "aguardando" | "publicada" | "rascunho"
```

As quatro marcas são as cores do calendário: 🔴 precisa aprovar, 🟡 aprovada e
não publicada, 🟢 publicada, cinza rascunho. `esperandoAprovacao(posts)` dá a
fila de aprovação direto.

`podeNaPeca(post, "cancelar")` e `motivoParaNaoMexer(post, acao)` existem para a
interface **desabilitar com explicação** em vez de deixar clicar e falhar.

### Kanban

Está no mesmo `agenda.ts`:

```ts
import { montarQuadro, podeMoverPara, motivoParaNaoAvancar } from "./social/agenda.ts";

const colunas = montarQuadro(posts);        // ColunaDoQuadro[] = { fase, posts }
podeMoverPara("rascunho", "publicado");     // false — não se pula aprovação
motivoParaNaoAvancar(post, "aprovado");     // a frase que explica por quê
```

`montarQuadro` devolve as seis colunas já na ordem do fluxo editorial. Cada uma
traz `fase` (um `PostStatus`) e os posts dela; o rótulo da coluna sai de
`FASE_LABELS` em `format.ts`:

| `fase` | Rótulo |
| --- | --- |
| `ideia` | Ideia |
| `rascunho` | Em produção |
| `aguardando_aprovacao` | Em revisão |
| `aprovado` | Aprovado |
| `agendado` | Agendado |
| `publicado` | Publicado |

Ligue num dnd-kit e o arrastar está pronto: `podeMoverPara` decide se o destino é
legal, e `motivoParaNaoAvancar` dá a mensagem quando não é — hoje ela cobre a
pauta que ainda não escolheu formato, que é o caso em que a peça não pode andar.

### Análise

**`analytics.ts`** — o recorte por período e o resumo.

```ts
import { slicePeriod, summarize, splitOrganicPaid, buildSeries, mergeSeries } from "./social/analytics.ts";

const periodo = slicePeriod(metricas, "30d");
summarize(periodo, "30d");       // totais + variação contra o período anterior
splitOrganicPaid(periodo);       // quanto do alcance foi comprado
buildSeries(periodo);            // pontos para o gráfico, com reamostragem
mergeSeries([a, b, c]);          // somar várias contas num histórico só
```

**`post-analytics.ts`** — desempenho por publicação: divisão por conta, curva dos
primeiros dias, taxa de engajamento.

**`organico-pago.ts`** — orgânico × pago **peça a peça**, que é a pergunta que
decide o próximo investimento.

```ts
import { recortarPecas, ordenarRecorte, totalizarRecorte, melhorOrganicaSemVerba } from "./social/organico-pago.ts";

const recorte = recortarPecas(posts, boosts, contas);
ordenarRecorte(recorte, "organico");
melhorOrganicaSemVerba(recorte);   // a peça que rendeu sozinha: candidata óbvia a impulsionar
```

> **A regra que importa:** o pago é **subtraído** do total, não somado. A rede
> reporta a publicação já incluindo o que o impulsionamento trouxe — é o mesmo
> post. Somar contaria o alcance comprado duas vezes. Quando o pago informado
> passa do total (acontece: a rede estima os dois por caminhos diferentes), o
> orgânico vai a zero e a peça sai com `inconsistente: true` para a tela poder
> dizer que ali o corte é aproximado.

**`atencao.ts`** — alcance, impressões, frequência e conversas.

```ts
import { medirAtencao, lerFrequencia, medirConversas, pecasQuePuxamConversa } from "./social/atencao.ts";

medirAtencao(alcance, impressoes);   // inclui a frequência: impressões ÷ alcance
lerFrequencia(2.8);                  // a frase que diz se isso é bom ou saturação
medirConversas(inbox);               // recebidas, respondidas, não respondidas
```

**`localidades.ts`** — alcance por cidade, estado e região.

```ts
import { alcancePorLocal, alcancePorRegiao, alcancePorUf, totalizarLocalidades } from "./social/localidades.ts";

const locais = alcancePorLocal(boosts);
alcancePorRegiao(locais);   // Norte, Nordeste, Centro-Oeste, Sudeste, Sul
```

Lê o estado do texto que a rede manda ("Salvador, BA" ou "Salvador, Bahia"). Se
vier só o nome da cidade, você pode injetar uma dedução:

```ts
alcancePorLocal(boosts, (cidade) => minhaTabela.get(cidade) ?? null);
```

O resultado sai com `ufInferida: true`, porque "Rio Claro" existe em São Paulo e
no Rio de Janeiro. Sem dedução, fica sem estado e a tela mostra "não
identificada" — **nunca chuta.** `totalizarLocalidades` conta quantas ficaram
assim, que é o tamanho do ponto cego.

**`publico.ts`** — perfil demográfico, pirâmide de idade e gênero, cidades.

### Insights

**`recomendacoes.ts`** — as observações que a plataforma faz sozinha.

```ts
import { recomendar, MINIMOS, resumirCanais } from "./social/recomendacoes.ts";

const insights = recomendar({
  contas,
  metricasPorConta,          // Map<accountId, DailyMetric[]>, já recortado ao período
  posts,
  period: "30d",
  interacoesPendentes,       // quantas conversas sem resposta
  pendenteMaisAntigaEm,      // ISO da mais antiga, ou null
  agoraMs: Date.now(),       // "agora" entra de fora: o módulo fica puro e testável
});
// Recomendacao[] com peso: "oportunidade" | "atencao" | "risco"

resumirCanais(contas, metricasPorConta, "30d");   // uma linha por rede
```

`MINIMOS` é o que torna isto confiável: cada recomendação tem um mínimo de
amostra abaixo do qual **não é emitida**. Uma plataforma que diz "poste às 19h"
com base em duas publicações ensina a pessoa a desconfiar dela.

**`horarios.ts`** — quando publicar.

```ts
import {
  mapaDeHorarios, melhoresHorarios, melhoresBlocos, horariosPorFormato,
  picoDoPublico, compararComOPublico, barrasDoQuadro, detalharFaixa,
} from "./social/horarios.ts";

mapaDeHorarios(pecas, { minimoDePecas: 2 });   // mapa de calor dia × faixa de 3h
melhoresHorarios(pecas, { quantidade: 3 });    // o ranking, só com amostra suficiente
melhoresBlocos(pecas);                         // o mesmo por faixa do dia
horariosPorFormato(pecas);                     // o melhor horário de cada formato

// Você posta quando eles estão online? Cruza o seu melhor horário com o pico
// de atividade do público.
const pico = picoDoPublico(audiencia.activityByHour);
compararComOPublico(melhoresHorarios(pecas)[0], pico);

barrasDoQuadro(pecas, { eixo: "hora", recorte, rede });  // 24 barras, hora a hora
detalharFaixa(pecas, chave, { rede });                   // clicar numa barra e ver o que tem dentro
```

`pecas` aqui é `PecaAvaliada[]` / `PecaNoTempo[]` — publicações já com dia da
semana e hora resolvidos no fuso da campanha. `conteudo.ts` monta essa lista a
partir de `Post[]`.

**`conteudo.ts`** — desempenho por formato e por tipo de conteúdo.

### Relacionamento

**`relacionamento.ts`** — comentários e mensagens de todas as redes numa caixa só,
com graus de relação (não seguidor → seguidor → engajado → defensor) e a regra do
envio em lote.

**`rastreio.ts`** — resume a publicação que originou uma conversa, para a caixa de
entrada mostrar o contexto.

### Apoio

| Módulo | Para quê |
| --- | --- |
| `types.ts` | o modelo inteiro. **Comece por aqui.** |
| `format.ts` | números, moeda, datas e rótulos em pt-BR |
| `fuso.ts` | fuso da campanha, sem biblioteca de data |
| `permissions.ts` | o que cada papel acessa |
| `importacao.ts` | planilha de histórico → `DailyMetric[]` |
| `instagram-csv.ts` | a exportação do Instagram → publicações |
| `ics.ts` | calendário `.ics` ↔ eventos |

---

## O que não vem, e por que

**A integração com a Meta** (`oauth/`, Graph API, criptografia de token). Não é
reaproveitável: depende do seu App ID, dos seus escopos e do seu App Review. O
que o kit garante é que, quando ela existir, os dados caem em `types.ts` e tudo
acima funciona sem mudar.

**O envio real da publicação.** O kit valida, agenda e organiza o fluxo. Mandar
para a rede é a parte que você constrói uma vez:

1. A publicação do Instagram tem **dois passos** na Graph API — criar o container
   de mídia, depois publicar. Exige conta profissional ligada a uma Página.
2. A permissão `instagram_content_publish` passa por **App Review da Meta**. É o
   gargalo real, e é humano, não técnico.
3. O **Facebook agenda sozinho**; o **Instagram não tem agendamento por API**. A
   fila precisa ser sua: um processo que acorda, olha o que venceu e publica.
   `montarQuadro` e `marcaDaPeca` já dizem o que está vencido.

**Não use agregador de métricas para publicar.** Windsor.ai e parecidos escrevem
post de imagem e comentário, e nada mais — sem carrossel, sem Reels, sem story,
sem agendamento. Servem para *ler* números de várias contas, não para publicar.

**A interface.** Os componentes do projeto original são TanStack Start + Tailwind
+ Recharts. Se o outro projeto usa o mesmo, dá para copiar; se não, o kit é
exatamente a parte que não precisa ser reescrita.

---

## Três regras que não se negociam

Estão aqui porque são as que custam caro quando quebram, e nenhuma delas é
opinião de estilo.

1. **Nunca peça a senha da rede social num formulário seu.** A Meta proíbe, e o
   caminho certo é o redirecionamento OAuth oficial. Um formulário de senha é
   motivo de banimento do app.
2. **Token guardado cifrado, nunca devolvido ao navegador, nunca no log.** Se o
   token aparece numa resposta HTTP ou num `console.log`, ele vazou.
3. **Toda assinatura de webhook é verificada antes de qualquer efeito.** O
   endereço é público; sem verificar a assinatura, qualquer pessoa manda um
   pedido de exclusão de dados com o ID de outra.

---

## Números

| | |
| --- | --- |
| Arquivos | 21 módulos + 17 arquivos de teste + `exemplo.ts` |
| Linhas | ~6.600 de código, ~4.500 de teste |
| Testes | 348, todos passando |
| Dependências de runtime | nenhuma |
| Dependências de desenvolvimento | nenhuma (usa `node --test`) |
