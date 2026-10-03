# PRD — Núcleo de publicação, métricas e integrações sociais

Para replicar em outro projeto o que já funciona no Social Hub da campanha.

> **Como ler este documento.** A parte 1 explica o que existe hoje e o que é
> reaproveitável. A parte 2 é o PRD propriamente dito. A parte 3 lista o que
> ainda não existe em lugar nenhum e precisa ser construído.
>
> As partes marcadas **[A DEFINIR]** dependem de informação sobre o outro
> projeto que ainda não tenho.

---

# Parte 1 — O que existe hoje, e o que cabe

## 1.1 A medida do que foi escrito

| Camada | Linhas | Reaproveitável? |
| --- | ---: | --- |
| Núcleo de publicação e métricas | 3.585 | **Sim, direto** |
| OAuth Meta + cofre de credenciais | 1.431 | **Sim, direto** |
| Geografia e território de campanha | 3.349 | Não — é eleitoral |

A divisão não é arbitrária: o núcleo trata de *conta, publicação, métrica e
conversa*, que qualquer operação de redes sociais tem. A outra camada trata de
*município, IPS, eixo de atuação e camada de expansão*, que só uma campanha
eleitoral estadual tem.

## 1.2 O que o núcleo faz

**Modelo de domínio** (`types.ts`, 454 linhas)
Conta, publicação, métricas, impulsionamento, caixa de entrada, usuário, papel,
evento de agenda. É o vocabulário sobre o qual todo o resto se apoia.

**Regras por rede** (`networks.ts`, 302 linhas)
Cada rede tem limites diferentes — itens no carrossel, duração de vídeo,
proporção, tamanho de arquivo, tamanho da legenda. A validação acontece **antes**
de publicar, com erro bloqueante separado de aviso.

**Fluxo de aprovação** (`agenda.ts`, 500 linhas)
Ideia → rascunho → aguardando aprovação → aprovado → agendado → publicado, com
devolução para ajustes e registro de quem aprovou. Inclui o calendário com
semáforo (vermelho precisa aprovar, amarelo aprovada não publicada, verde
publicada) e as regras de reagendar e cancelar.

**Análise de conteúdo** (`conteudo.ts` + `horarios.ts`, 1.006 linhas)
Desempenho peça a peça, corte por formato, mapa de calor dia × horário, melhores
horários no geral e por tipo de conteúdo. Com uma regra dura: **amostra pequena
não vira recomendação** — continua visível, marcada como insuficiente.

**Atenção e conversa** (`atencao.ts`, 175 linhas)
Alcance, impressões, frequência (impressões ÷ alcance) e o estado da caixa de
entrada. Com a explicação de cada métrica na tela, porque alcance e impressões
são palavras que quase ninguém distingue.

**Relacionamento** (`relacionamento.ts` + `rastreio.ts`, 404 linhas)
Caixa de entrada unificada, atribuição de responsável, resposta em lote, e o
vínculo entre cada comentário e a publicação que o originou.

**Fuso horário** (`fuso.ts` + `instagram-csv.ts`, 584 linhas)
A Meta exporta em horário do Pacífico; São Paulo é +4h em agosto. Quatro horas
mudam o dia da semana e o bloco do dia — e jogariam toda a análise de horário
para o lado errado. O módulo guarda os quatro campos: horário de origem, fuso da
fonte, fuso de destino e horário normalizado.

**OAuth e segurança** (1.431 linhas)
Autorização oficial da Meta, tokens cifrados em AES-256-GCM, `state` anti-CSRF,
e o endpoint de exclusão de dados com verificação de assinatura HMAC-SHA256.

## 1.3 O que NÃO cabe no outro projeto

- Os 645 municípios de São Paulo com IPS, população e IDHM
- O mapa com círculos proporcionais e camadas de expansão
- Os sete eixos de atuação territorial e o Top 100
- O recorte de público por gênero e faixa etária voltado a eleitorado

**Exceção:** se o outro projeto também precisar de recorte geográfico, a
*mecânica* do mapa serve — o que muda é a base de dados por trás dela.

## 1.4 O veredito

**O núcleo cabe.** Ele foi escrito como módulos puros, sem dependência de
framework na camada de domínio, e com o estado atrás de uma única porta
(`snapshot.server.ts`) que já troca entre arquivo JSON e Postgres sem nenhuma
função de servidor mudar.

**O que precisa ser decidido** está marcado [A DEFINIR] abaixo.

---

# Parte 2 — PRD

## 2.1 Objetivo

Uma plataforma que centraliza a operação de redes sociais: planejar, aprovar,
publicar, medir e responder — a partir de um painel só, com os números vindos
direto das redes.

## 2.2 Escopo

**Dentro:** camada social, orgânico e pago.
**Fora:** e-commerce, catálogo, carrinho, qualquer fluxo de venda.

## 2.3 [A DEFINIR] Perguntas que mudam o desenho

Preciso destas respostas antes de fechar o PRD:

1. **Que projeto é?** Uma marca, um cliente, vários clientes? (A conta
   "Saber Ensinar" apareceu conectada ao Windsor — é ele?)
2. **Quantas contas e quantas redes?**
3. **Quem usa?** Uma pessoa, uma equipe com papéis, ou clientes acessando
   cada um o seu?
4. **Multi-cliente?** Se sim, o isolamento por projeto já existe — mas muda
   cobrança, permissão e onboarding.
5. **O que importa medir?** Numa campanha é alcance e mobilização. Em negócio
   costuma ser conversão, custo por lead, receita — métricas que **não existem**
   hoje no modelo.

## 2.4 Funcionalidades — o que vem pronto

| # | Funcionalidade | Estado |
| --- | --- | --- |
| F1 | Conectar contas por OAuth oficial | **Pronto** |
| F2 | Validação por rede antes de publicar | **Pronto** |
| F3 | Fluxo de aprovação em 6 fases | **Pronto** |
| F4 | Calendário com semáforo de aprovação | **Pronto** |
| F5 | Painel com alcance, impressões, frequência | **Pronto** |
| F6 | Análise de horários e formatos | **Pronto** |
| F7 | Caixa de entrada unificada | **Pronto** |
| F8 | Rastreio comentário → publicação | **Pronto** |
| F9 | Relatórios em PDF sem dependência externa | **Pronto** |
| F10 | Papéis e permissões | **Pronto** |
| F11 | Histórico auditável | **Pronto** |
| F12 | Importação de CSV com fuso normalizado | **Pronto** (sem tela) |
| F13 | Exclusão de dados (exigência Meta) | **Pronto** |

## 2.5 Funcionalidades — o que precisa ser construído

| # | Funcionalidade | Esforço | Por quê |
| --- | --- | --- | --- |
| N1 | **Webhooks de entrada** | Médio | Ver 2.6 |
| N2 | Sincronização automática (job periódico) | Médio | Hoje é por botão |
| N3 | Publicação efetiva nas redes | Baixo¹ | ¹Código pronto, depende de App Review |
| N4 | Métricas de conversão e receita | Médio | Não existe no modelo |
| N5 | Multi-cliente com cobrança | Alto | Se for o caso |

## 2.6 Webhooks — o desenho

Você pediu webhook explicitamente. Vale separar três coisas que costumam ser
confundidas:

### Webhooks da Meta (entrada)

A Meta envia eventos quando algo acontece na conta: comentário novo, mensagem
direta, menção, mudança no perfil.

**O que muda:** hoje a caixa de entrada só se atualiza quando alguém clica em
sincronizar. Com webhook, a mensagem chega sozinha, em segundos.

**Como funciona:**

```
Meta  ──POST──►  /api/meta/webhook  ──►  valida assinatura  ──►  grava
                                           (X-Hub-Signature-256)
```

**Três exigências que não são opcionais:**

1. **Verificação do endpoint.** A Meta manda um `GET` com `hub.challenge` e
   espera o valor de volta, junto com um `hub.verify_token` que você define.
   Sem isso ela não assina a inscrição.

2. **Assinatura de cada evento.** Todo `POST` vem com o cabeçalho
   `X-Hub-Signature-256`, um HMAC-SHA256 do corpo com o app secret. **Sem
   conferir, qualquer pessoa que descubra o endereço injeta mensagens falsas
   na caixa de entrada** — e o endereço é público por obrigação. É a mesma
   regra que já está implementada no endpoint de exclusão de dados, e o código
   de lá serve de modelo direto.

3. **Resposta em menos de 20 segundos.** A Meta reenvia o que demora e desativa
   a inscrição depois de falhas seguidas. O handler precisa **gravar e
   responder**, deixando o processamento para depois. Processar dentro do
   handler é o erro clássico aqui.

### Webhooks de saída (opcional)

A plataforma avisando outros sistemas: "peça aprovada", "publicação saiu",
"mensagem sem resposta há 24h". Útil para ligar com CRM, Slack ou automação.

**[A DEFINIR]** Só vale construir se houver sistema do outro lado.

### O que webhook NÃO resolve

**Métricas históricas.** A Meta não manda alcance por webhook. Número continua
vindo por consulta — por isso N2 (job periódico) é necessário mesmo com N1.

## 2.7 Integrações

| Origem | Via | Estado |
| --- | --- | --- |
| Instagram e Facebook | OAuth direto (Graph API) | Código pronto |
| Meta Ads | Windsor.ai **ou** Graph API | Windsor já conectado |
| Google Ads, GA4, YouTube | Windsor.ai | A conectar |
| CSV de exportação | Upload | Módulo pronto, falta tela |

**Decisão de arquitetura:** Windsor.ai dá acesso a 350+ fontes sem App Review
por fonte, mas é dependência paga e os dados passam por terceiro. OAuth direto
é mais trabalho e exige revisão da Meta, mas os dados vêm sem intermediário.

**Recomendação:** Windsor para **leitura** de várias fontes; OAuth direto para
**escrita** (publicar, responder). É o melhor dos dois, e é o que o código já
suporta.

## 2.8 Requisitos não-funcionais — as regras que não se negociam

Estas não são preferências. Cada uma existe porque o contrário já deu problema:

1. **Nunca pedir senha de rede social.** A Meta proíbe e bloqueia a conta. Só
   OAuth.
2. **Token cifrado em repouso**, nunca devolvido ao navegador, nunca em log.
3. **Toda assinatura de webhook conferida** antes de qualquer efeito.
4. **Segredo nunca no repositório.** Só variável de ambiente.
5. **A plataforma recusa subir sem configuração de produção.** Sem banco ela
   entra em modo demonstração, e em demonstração qualquer senha entra — num
   endereço público isso é a operação inteira aberta.
6. **Número estimado nunca tem a mesma cara de número medido.** Quando a
   plataforma reparte um total por conta própria, a tela diz que repartiu.
7. **Amostra pequena não vira recomendação.** Continua visível, marcada.

## 2.9 Stack

TanStack Start (SSR) · React · TypeScript · Tailwind · Recharts · Postgres ·
Node 20+. Testes com o runner nativo do Node, sem dependência: 506 testes hoje.

---

# Parte 3 — Como replicar

## 3.1 Três caminhos

**A. Copiar o núcleo** — clonar, apagar a camada de campanha, adaptar.
*Rápido. Os dois projetos divergem com o tempo.*

**B. Extrair biblioteca compartilhada** — o núcleo vira pacote, os dois
consomem.
*Correção feita uma vez vale nos dois. Exige disciplina de versão.*

**C. Multi-cliente no mesmo sistema** — o isolamento por projeto já existe.
*Mais barato de operar. Só serve se for a mesma operação.*

**Recomendação:** **A**, a menos que você pretenda fazer um terceiro. Dois
projetos não pagam o custo de manter uma biblioteca; três, sim.

## 3.2 Ordem sugerida

1. Responder as perguntas de 2.3
2. Clonar o núcleo sem a camada de campanha
3. Conectar as contas (OAuth ou Windsor)
4. Ajustar as métricas ao que o projeto mede
5. Webhooks (N1) — depois que houver conta conectada
6. Sincronização automática (N2)

## 3.3 O que vai doer

- **App Review da Meta** leva semanas e exige verificação do negócio,
  política de privacidade publicada e vídeo de cada permissão em uso.
- **Publicar automaticamente** só funciona depois disso. Até lá: planejar e
  aprovar na plataforma, publicar à mão, importar as métricas de volta.
- **Limite de plano no Windsor.** O plano Free cobre 1 conta.

---

*Social Hub — Ampliação Marketing Digital. Base: commit `dad9731`, 506 testes.*
