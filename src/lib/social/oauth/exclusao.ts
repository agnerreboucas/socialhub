/**
 * O pedido de exclusão de dados que a Meta envia.
 *
 * A Meta exige, para aprovar o aplicativo, um endereço que ela chama quando uma
 * pessoa remove o app da conta dela e pede que os dados sejam apagados. Sem ele
 * a revisão não passa — e é a exigência mais fácil de descobrir tarde, porque
 * nada no desenvolvimento do dia a dia a exercita.
 *
 * O pedido chega como `signed_request`: duas partes separadas por ponto, em
 * base64url. A primeira é a assinatura HMAC-SHA256; a segunda, o conteúdo.
 *
 * **A assinatura é o ponto inteiro.** Sem conferi-la, qualquer pessoa que
 * descubra o endereço apaga os dados de qualquer usuário mandando um POST — e o
 * endereço é público por obrigação. A conferência é o que separa um callback de
 * uma porta aberta.
 *
 * Módulo puro: a verificação recebe a função de HMAC de fora, para o teste rodar
 * sem depender do `node:crypto` e para o servidor injetar a implementação real.
 */

export type PedidoDeExclusao = {
  /** O identificador da pessoa dentro do aplicativo. */
  usuarioId: string;
  /** Quando a Meta emitiu o pedido, em segundos desde 1970. */
  emitidoEm: number | null;
};

export type ResultadoDaVerificacao =
  | { ok: true; pedido: PedidoDeExclusao }
  | { ok: false; motivo: string };

/** base64url → texto, sem depender de Buffer para poder rodar em qualquer lugar. */
export function deBase64Url(valor: string): string {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return typeof atob === "function"
    ? decodeURIComponent(
        atob(preenchido)
          .split("")
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      )
    : Buffer.from(preenchido, "base64").toString("utf8");
}

/**
 * Confere a assinatura e devolve quem pediu a exclusão.
 *
 * `assinar` recebe o conteúdo cru (a segunda parte, ainda em base64url) e
 * devolve a assinatura esperada, também em base64url. A comparação é feita aqui
 * para que a regra de "não confie sem assinatura" viva num lugar só.
 */
export function verificarPedido(
  signedRequest: string,
  assinar: (conteudo: string) => string,
): ResultadoDaVerificacao {
  const partes = signedRequest.split(".");
  if (partes.length !== 2) {
    return { ok: false, motivo: "O pedido não tem o formato assinatura.conteúdo." };
  }

  const [assinaturaRecebida, conteudo] = partes;
  if (!assinaturaRecebida || !conteudo) {
    return { ok: false, motivo: "O pedido veio com assinatura ou conteúdo vazio." };
  }

  // Normaliza antes de comparar: a Meta manda base64url sem preenchimento, e
  // uma implementação de HMAC pode devolver com "=" no fim. Comparar as duas
  // formas cruas recusaria pedidos legítimos.
  const normalizar = (valor: string) =>
    valor.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (normalizar(assinar(conteudo)) !== normalizar(assinaturaRecebida)) {
    return { ok: false, motivo: "A assinatura não confere." };
  }

  let dados: Record<string, unknown>;
  try {
    dados = JSON.parse(deBase64Url(conteudo)) as Record<string, unknown>;
  } catch {
    return { ok: false, motivo: "O conteúdo do pedido não é um JSON válido." };
  }

  // A Meta usa HMAC-SHA256; recusar outro algoritmo evita o ataque em que
  // alguém propõe um algoritmo fraco e a verificação aceita.
  const algoritmo = String(dados.algorithm ?? "");
  if (algoritmo.toUpperCase().replace(/[-\s]/g, "") !== "HMACSHA256") {
    return { ok: false, motivo: `Algoritmo não suportado: ${algoritmo || "(ausente)"}.` };
  }

  const usuarioId = typeof dados.user_id === "string" ? dados.user_id : "";
  if (!usuarioId) {
    return { ok: false, motivo: "O pedido não identifica o usuário." };
  }

  return {
    ok: true,
    pedido: {
      usuarioId,
      emitidoEm: typeof dados.issued_at === "number" ? dados.issued_at : null,
    },
  };
}

/**
 * O código que a pessoa usa para acompanhar o pedido.
 *
 * Derivado do identificador e do instante, e não sorteado, para que o mesmo
 * pedido produza sempre o mesmo código — quem consultar duas vezes vê a mesma
 * coisa. Não é segredo: é um número de protocolo.
 */
export function codigoDeConfirmacao(pedido: PedidoDeExclusao): string {
  const semente = `${pedido.usuarioId}-${pedido.emitidoEm ?? 0}`;
  let hash = 0;
  for (let indice = 0; indice < semente.length; indice += 1) {
    hash = (hash * 31 + semente.charCodeAt(indice)) | 0;
  }
  return `EX${Math.abs(hash).toString(36).toUpperCase().padStart(8, "0").slice(0, 8)}`;
}

/** A resposta que a Meta espera: para onde olhar e com que código. */
export function respostaParaMeta(
  urlDeStatus: string,
  codigo: string,
): { url: string; confirmation_code: string } {
  return { url: `${urlDeStatus}?codigo=${encodeURIComponent(codigo)}`, confirmation_code: codigo };
}
