/**
 * Reconhece o 500 que o h3 devolve quando engole uma exceção do handler.
 *
 * Vive fora de `server.ts` para poder ser testado: o arquivo de entrada do
 * servidor executa a conferência de produção e carrega o estado no topo, então
 * importá-lo num teste subiria a plataforma inteira.
 *
 * A regra é casar por `"unhandled":true` e **só** por isso. A primeira versão
 * exigia também `"message":"HTTPError"`, e uma implantação real devolveu
 * `{"error":true,"status":500,"unhandled":true}` — sem o `message`. O visitante
 * recebeu o JSON cru em vez da página de erro. O campo que sempre aparece é o
 * `unhandled`; os outros variam com a versão do h3, e depender deles é escrever
 * um teste de versão disfarçado de teste de comportamento.
 */
export function erroEngolidoPeloH3(status: number, contentType: string, corpo: string): boolean {
  if (status < 500) return false;
  if (!contentType.includes("application/json")) return false;
  return corpo.includes('"unhandled":true');
}
