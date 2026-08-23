import { createHmac } from "node:crypto";

import { getMetaConfig } from "@/lib/config.server";
import { codigoDeConfirmacao, respostaParaMeta, verificarPedido } from "./exclusao";

/**
 * O endereço que a Meta chama quando alguém pede a exclusão dos dados.
 *
 * É exigência para aprovar o aplicativo, e é a que mais passa despercebida:
 * nada no uso diário a exercita, então ela só aparece como pendência na revisão,
 * semanas depois.
 *
 * **Responde sempre com o código de protocolo, nunca com o que foi apagado.**
 * O endereço é público por obrigação — a Meta precisa alcançá-lo sem sessão —, e
 * uma resposta que contasse o que existe na base viraria consulta aberta: manda
 * um pedido, lê a resposta, descobre se aquela pessoa está cadastrada.
 *
 * O que **não** está aqui, e é honesto registrar: o apagamento em si. Hoje a
 * plataforma guarda o token cifrado da conta conectada e as métricas dela;
 * quando houver dados de pessoas identificáveis vindos da Meta, este handler é
 * o lugar de removê-los, e o `console` abaixo é o gancho. Fingir que apaga o
 * que não se guarda seria pior do que dizer que ainda não há o que apagar.
 */
export async function responderExclusaoDeDados(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ erro: "Use POST." }, 405);
  }

  const config = getMetaConfig();
  if (!config.appSecret) {
    // Sem o segredo não há como conferir assinatura, e conferir é o ponto
    // inteiro. Recusar é a única resposta correta — aceitar seria abrir a porta.
    console.error("Exclusão de dados: META_APP_SECRET não está configurada.");
    return json({ erro: "Integração com a Meta não configurada." }, 503);
  }

  const assinado = await lerSignedRequest(request);
  if (!assinado) {
    return json({ erro: "Faltou o signed_request." }, 400);
  }

  const resultado = verificarPedido(assinado, (conteudo) =>
    createHmac("sha256", config.appSecret!).update(conteudo).digest("base64url"),
  );

  if (!resultado.ok) {
    // O motivo vai para o log e não para a resposta: quem manda pedido forjado
    // não precisa saber em que ponto foi pego.
    console.error(`Exclusão de dados recusada: ${resultado.motivo}`);
    return json({ erro: "Pedido inválido." }, 400);
  }

  const codigo = codigoDeConfirmacao(resultado.pedido);
  console.log(
    `Exclusão de dados pedida pelo usuário ${resultado.pedido.usuarioId} — protocolo ${codigo}.`,
  );

  const base = origemDaRequisicao(request, config.redirectUri);
  return json(respostaParaMeta(`${base}/exclusao-de-dados`, codigo), 200);
}

async function lerSignedRequest(request: Request): Promise<string | null> {
  const tipo = request.headers.get("content-type") ?? "";

  // A Meta manda como formulário; aceitar JSON também facilita testar à mão sem
  // mudar nada no servidor.
  if (tipo.includes("application/json")) {
    const corpo = (await request.json().catch(() => null)) as { signed_request?: string } | null;
    return corpo?.signed_request ?? null;
  }

  const formulario = await request.formData().catch(() => null);
  const valor = formulario?.get("signed_request");
  return typeof valor === "string" ? valor : null;
}

/**
 * De onde a resposta deve apontar.
 *
 * Prefere a origem do `META_REDIRECT_URI`, que é o endereço que já foi
 * cadastrado na Meta e conferido; cai para o da própria requisição quando ela
 * não está configurada, para o endpoint continuar respondendo algo útil.
 */
function origemDaRequisicao(request: Request, redirectUri: string | undefined): string {
  if (redirectUri) {
    try {
      return new URL(redirectUri).origin;
    } catch {
      // Configuração malformada não deve derrubar o pedido.
    }
  }
  return new URL(request.url).origin;
}

function json(corpo: unknown, status: number): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
