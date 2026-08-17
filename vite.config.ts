// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Onde este build está rodando.
 *
 * O pacote do Lovable só liga o nitro sozinho quando reconhece o próprio
 * sandbox — fora dele, `npm run build` gerava só os arquivos do navegador e
 * **nenhum servidor**, com um aviso no meio do log. Foi exatamente esse o erro
 * na Hostinger: o build "passou" e a implantação não achou pasta de saída
 * nenhuma para publicar.
 *
 * As duas variáveis são as mesmas que o pacote consulta internamente.
 */
const noSandboxDoLovable =
  process.env.LOVABLE_SANDBOX === "1" || !!process.env.DEV_SERVER__PROJECT_PATH;

/**
 * Alvo de implantação.
 *
 * Dentro do sandbox do Lovable: `undefined`, e o fluxo de lá segue intacto,
 * exatamente como era.
 *
 * Fora dele (Hostinger, um servidor próprio, uma máquina de build): o padrão é
 * `node-server`, para que um `npm run build` cru já produza um servidor que
 * roda. `NITRO_PRESET` continua vencendo, para quem quiser outro alvo.
 *
 * Por que Node e não Cloudflare Workers, que é o padrão do pacote: esta
 * aplicação usa scrypt e cifra do `node:crypto`, fala com o Postgres pelo
 * driver `pg` (que abre conexão TCP) e lê o estado inteiro uma vez na subida.
 * Nada disso cabe num isolate por requisição sem reescrever a camada de dados.
 */
const preset = process.env.NITRO_PRESET ?? (noSandboxDoLovable ? undefined : "node-server");

/**
 * A pasta de saída continua sendo `dist`, que é para onde o vite escreve e para
 * onde o bundle do servidor aponta por caminho relativo. Quem move o resultado
 * para `.output` — a convenção do nitro, que é onde a hospedagem procura — é o
 * `scripts/preparar-saida.mjs`, depois do build.
 */
export default defineConfig({
  nitro: preset ? { preset } : undefined,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
