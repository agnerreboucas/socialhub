import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { erroEngolidoPeloH3 } from "./lib/erro-engolido";
import { renderErrorPage } from "./lib/error-page";
import { exigirProducaoConfigurada } from "./lib/producao.server";

/**
 * A conferência de produção roda na carga do módulo, antes da primeira
 * requisição.
 *
 * Aqui e não dentro do `fetch` de propósito: falhar na subida aparece no log de
 * implantação da hospedagem, que é onde alguém está olhando naquele minuto.
 * Falhar na primeira requisição apareceria como uma página de erro para um
 * visitante — e a plataforma teria ficado no ar, aberta, até alguém tentar
 * entrar.
 */
exigirProducaoConfigurada();

/**
 * O estado é carregado na subida, e não na primeira requisição.
 *
 * O módulo do store resolve a leitura do banco no topo dele; até alguém chamar
 * uma função de servidor, ele nem é importado. Numa implantação nova isso
 * significa banco vazio até a primeira visita — e `npm run senha` falhando com
 * "nenhum usuário com esse e-mail" para quem seguiu o passo a passo na ordem
 * certa.
 *
 * Carregando aqui, a instalação existe assim que o processo sobe: dá para
 * definir a senha antes de abrir a plataforma pela primeira vez. Se o banco
 * estiver fora do ar, o erro aparece no log da implantação em vez de aparecer
 * para um visitante.
 */
await import("./lib/social/store.server").catch((erro) => {
  console.error("Não foi possível preparar o estado da plataforma na subida.", erro);
  throw erro;
});

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

/**
 * O h3 engole um `throw` de dentro do handler e devolve um 500 comum, em JSON.
 * Um `try/catch` aqui fora nunca dispara para esses casos — por isso a
 * inspeção da resposta.
 *
 * A marca é `"unhandled":true`. **Só ela**, e isso é uma correção: a versão
 * anterior exigia também `"message":"HTTPError"`, e uma implantação real
 * devolveu `{"error":true,"status":500,"unhandled":true}` — sem o `message`.
 * O resultado é que o visitante recebia o JSON cru na cara, que não diz nada a
 * ninguém, em vez da página de erro que explica o que fazer. Casar pelo campo
 * que sempre existe é o que torna isto confiável entre versões do h3.
 *
 * O corpo original vai para o log junto: quando o capturador de erro não pegou
 * a exceção, aquele JSON é a única pista que sobra de por que a página caiu.
 */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.clone().text() : "";
  if (!erroEngolidoPeloH3(response.status, contentType, body)) return response;

  console.error(
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
    `\ncorpo devolvido pelo h3: ${body}`,
  );
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Antes de qualquer coisa: o teste de saúde não pode depender do
      // roteador nem da renderização. Se a aplicação estiver com problema
      // justamente aí, é quando o provedor mais precisa da resposta.
      if (new URL(request.url).pathname === "/api/saude") {
        const { respostaDeSaude } = await import("./lib/saude.server");
        return await respostaDeSaude();
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
