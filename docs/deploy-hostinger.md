# Subir o Social Hub na Hostinger

O passo a passo desta instalação, na ordem em que se faz. Para o raciocínio por
trás de cada escolha — por que Node e não estático, por que estas variáveis —
veja [hospedagem.md](./hospedagem.md).

Repositório: `agnerreboucas/socialhub`, branch `main`.

## Antes de tudo: o plano precisa rodar Node

Esta é a única checagem que, se for pulada, faz todo o resto ser perdido. O
Social Hub **não é um site estático**: ele autentica gente, guarda estado e fala
com um banco. Precisa de um processo Node de pé.

Na Hostinger isso quer dizer **VPS** ou o plano de **aplicações Node.js** — não
a Hospedagem Compartilhada, que serve arquivo e roda PHP. Se o painel só oferece
gerenciador de arquivos e PHP, é o plano errado, e nenhum ajuste de código
resolve.

## 1. Criar o banco

Postgres, na própria Hostinger ou em qualquer serviço gerenciado. Guarde a URL
de conexão — ela tem o formato:

```
postgresql://usuario:senha@host:5432/banco?sslmode=require
```

`sslmode=require` em serviço gerenciado; `sslmode=disable` se o Postgres estiver
na mesma máquina.

> A URL de conexão é uma credencial. Ela vai no painel da Hostinger, em variável
> de ambiente — nunca num arquivo do repositório, nunca colada numa conversa.

## 2. Configurar a aplicação

No painel da Hostinger, apontando para o repositório:

| Campo             | Valor                     |
| ----------------- | ------------------------- |
| Repositório       | `agnerreboucas/socialhub` |
| Branch            | `main`                    |
| Comando de build  | `npm ci && npm run build` |
| Comando de início | `npm start`               |
| Versão do Node    | 20 ou mais nova           |

O `npm run build` compila e deixa o servidor pronto em `.output/server/index.mjs`;
o `npm start` sobe exatamente esse arquivo. Não é preciso configurar pasta de
saída — o build já entrega onde o start procura.

## 3. As variáveis de ambiente

Três são obrigatórias. **Sem qualquer uma delas a aplicação recusa subir**, e
recusa com a mensagem dizendo qual falta — é de propósito: subir pela metade,
com sessão insegura ou sem administrador, é pior do que não subir.

| Variável         | Como obter                                                            |
| ---------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`   | A URL do passo 1.                                                     |
| `SESSION_SECRET` | `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_EMAIL`    | O e-mail de quem administra. Vira o primeiro usuário.                 |

Opcionais, para depois:

| Variável                                        | Para quê                                            |
| ----------------------------------------------- | --------------------------------------------------- |
| `PORT`                                          | Porta. Padrão 3000; a Hostinger costuma definir.    |
| `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` | Conectar Instagram e Facebook por OAuth.      |
| `SOCIAL_CRYPTO_KEY`                             | Cifra os tokens das redes. `openssl rand -base64 32`. Obrigatória se usar o OAuth acima. |
| `WINDSOR_API_KEY`                               | Números de mídia paga.                              |

Trocar o `SESSION_SECRET` desconecta todo mundo. Isso é útil de propósito no dia
em que for preciso encerrar todas as sessões de uma vez.

## 4. Primeira subida e a senha

O primeiro boot cria o projeto e o usuário administrador com o `ADMIN_EMAIL`,
**sem senha** — ninguém entra ainda. Para definir:

```bash
npm run senha
```

Rode no terminal do servidor, com as variáveis de ambiente carregadas. Ele
pergunta a senha e grava o hash.

Depois disso, reinicie a aplicação e entre.

> A senha é digitada no terminal, não passada como argumento: argumento de
> comando fica no histórico do shell e aparece na lista de processos.

## 5. Conferir

Nesta ordem, porque cada uma isola uma camada diferente:

1. **A aplicação responde?** Abra a URL. Deve cair na tela de entrada.
2. **O banco está ligado?** Entre com o `ADMIN_EMAIL` e a senha do passo 4. Se a
   entrada funciona, o banco está lendo e escrevendo.
3. **Os outros aplicativos abrem?** No menu ao lado da marca, troque para Rádio.
4. **Os números aparecem?** No Painel, o bloco "Horários, mídia e público" deve
   mostrar as publicações reais do Instagram.

Se a aplicação sobe mas nada persiste entre reinícios, a `DATABASE_URL` não está
chegando: sem ela a plataforma cai em modo demonstração, com dados semeados em
memória.

## O que ainda depende de você

- **Trocar a senha `@EleitaEm2026`.** Ela está em commits já publicados dos
  repositórios `retail-wave-ai` e `ampliacao-social`. Este repositório nasceu
  sem esse histórico, mas o que já foi ao GitHub não volta atrás.
- **Informar o total de seguidores.** A exportação de conteúdo do Instagram diz
  quantos seguidores cada publicação gerou, não quantos a conta tem. O número
  fica em zero até alguém preencher — um zero visível é melhor do que um número
  plausível e falso.
