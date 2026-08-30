# EventFlow

Plataforma de gestão de palestras com duas faces: uma **vitrine pública**, onde qualquer visitante navega pelas palestras publicadas sem precisar de conta, e uma **área privada do palestrante**, onde quem tem conta cadastra, edita, arquiva e remove as próprias palestras.

Entregável do treinamento 26.1 do NTEC — Poli Júnior.

**Stack:** Next.js 16 (App Router) · TypeScript · Prisma + MongoDB · Better Auth · Tailwind CSS · Zod · Vitest + Playwright · pnpm workspaces

---

## Sumário

1. [O que o site faz](#1-o-que-o-site-faz)
2. [Como rodar localmente](#2-como-rodar-localmente)
3. [Modelagem de dados](#3-modelagem-de-dados)
4. [Decisões técnicas](#4-decisões-técnicas)
5. [Arquitetura do código](#5-arquitetura-do-código)
6. [Fora do escopo e limitações conhecidas](#6-fora-do-escopo-e-limitações-conhecidas)
7. [Rastreabilidade do PRD](#7-rastreabilidade-do-prd)

---

## 1. O que o site faz

### Visão geral

O EventFlow resolve um problema simples de um evento: reunir num só lugar as palestras propostas, deixando a curadoria do conteúdo com quem vai palestrar e a navegação aberta para quem vai assistir.

Existem dois públicos, e a separação entre eles é a espinha dorsal do sistema:

| Público | O que pode fazer | Precisa de conta? |
| --- | --- | --- |
| **Visitante** | Navegar pela vitrine, filtrar por tema, ver o resumo numérico, abrir o detalhe de uma palestra publicada | Não |
| **Palestrante** | Tudo o que o visitante faz, mais: cadastrar palestras, editar e arquivar as próprias, gerenciar e remover o próprio perfil | Sim |

Não existe papel de administrador. O PRD não pede um, e cada palestrante enxerga e manipula apenas o que é dele.

### Fluxo 1 — Cadastro

1. O visitante abre `/cadastro` e informa **nome, e-mail, senha e bio**.
2. O formulário faz uma validação de conveniência no navegador (nome com pelo menos 3 caracteres, senha com pelo menos 8) só para dar resposta rápida. **A validação que vale é a do servidor.**
3. O envio chama `authClient.signUp.email()`, do Better Auth. O Better Auth cria o documento em `user`, grava a senha com hash na coleção `account` (**nunca em texto puro**) e já abre a sessão.
4. Se o e-mail já existir, o Better Auth devolve erro e a tela mostra a mensagem de conflito — o campo `email` é `@unique` no schema.
5. A **bio** não faz parte do modelo do Better Auth, então ela é salva num segundo passo: um `PATCH /api/users/me` logo após a criação da conta, que já viaja com o cookie de sessão recém-criado.
6. O usuário é redirecionado para `/painel`.

### Fluxo 2 — Login e sessão

1. Em `/login`, e-mail e senha vão para `authClient.signIn.email()`.
2. Credenciais inválidas recebem uma **mensagem genérica** ("e-mail ou senha inválidos"). Dizer qual dos dois está errado entregaria a informação de que aquele e-mail existe na base.
3. Com sucesso, o Better Auth grava o cookie `better-auth.session_token` no navegador. Esse cookie é o que sustenta toda a sessão: ele viaja automaticamente em toda requisição para o mesmo domínio, então **nenhum `fetch` do frontend precisa montar cabeçalho de autenticação**.
4. A navegação é protegida por `web/src/proxy.ts`, que intercepta as requisições antes da página carregar: quem não está logado e tenta abrir `/painel` é mandado para `/login`; quem já está logado e tenta abrir `/login` ou `/cadastro` é mandado para dentro.
5. O logout está no header (`authClient.signOut()`), seguido de `router.refresh()` — necessário porque as páginas são Server Components e o React não sabe sozinho que a sessão mudou.

> **Ponto de atenção, e é pergunta de entrevista:** o `proxy.ts` protege a *navegação*, não a *API*. Ele impede que a tela apareça; não impede que alguém dispare a requisição direto pelo Bruno ou pelo `curl`. A proteção que vale é a checagem dentro de cada `route.ts`. As duas se somam e nenhuma substitui a outra.

### Fluxo 3 — Submissão de palestra

1. Logado, o palestrante abre `/painel/palestras/nova` e preenche **título, tema, descrição e duração em minutos**.
2. O `POST /api/palestras` executa, nesta ordem:
   1. **Autenticação** — `getUserFromRequest()`. Sem sessão, `401` e a requisição morre aqui.
   2. **Corpo válido** — `validBody()` garante que o JSON não está malformado, senão `400`.
   3. **Formato dos dados** — `criarPalestraSchema.safeParse()` (Zod). Falhou, `400` com a mensagem do campo que quebrou.
   4. **Regra de negócio** — `contarAtivasDoAutor()`. Se já houver 3 palestras ativas, `409`.
   5. **Autoria** — `autorId` e `autorNome` são preenchidos **a partir da sessão**, nunca do corpo da requisição.
3. A palestra nasce como `RASCUNHO` (é o `@default` do schema) e por isso **não aparece na vitrine** até o autor publicá-la.
4. Para publicar, o palestrante edita a palestra e troca o status para `PUBLICADA`. Aí ela entra na vitrine pública.
5. Para abrir espaço quando o limite de 3 estiver cheio, ele **arquiva** uma palestra: `ARQUIVADA` não conta para o limite e o registro continua acessível no painel.

> A ordem das checagens não é arbitrária. Autenticação antes de qualquer coisa, existência antes de permissão. Comparar `palestra.autorId` antes de saber se `palestra` existe estoura ao ler propriedade de `null`.

### Mapa de telas

```
/                              vitrine pública (lista + filtro por tema + resumo)
/palestras/[id]                detalhe público de uma palestra publicada
/login                         entrar
/cadastro                      criar conta
/painel                        minhas palestras (com filtro por status)
/painel/palestras/nova         criar palestra
/painel/palestras/[id]         editar palestra (só a própria)
/painel/perfil                 editar / remover o próprio perfil
```

### Mapa da API

| Método e rota | Público? | O que faz | Respostas |
| --- | --- | --- | --- |
| `GET /api/palestras` | Sim | Vitrine: só `PUBLICADA` e não removida. Aceita `?tema=` e `?busca=` | `200` |
| `GET /api/palestras/resumo` | Sim | `{ total, duracaoMedia }` da vitrine | `200` |
| `GET /api/palestras/[id]` | Sim | Detalhe. Removida ou inexistente vira `404` | `200`, `400`, `404` |
| `POST /api/palestras` | **Não** | Cria palestra. Autor vem da sessão | `201`, `400`, `401`, `409` |
| `PATCH /api/palestras/[id]` | **Não** | Edita. Exige ser o dono | `200`, `400`, `401`, `403`, `404`, `409` |
| `DELETE /api/palestras/[id]` | **Não** | Remoção reversível. Exige ser o dono | `200`, `400`, `401`, `403`, `404` |
| `GET /api/palestras/minhas` | **Não** | Palestras do usuário da sessão. Aceita `?status=` | `200`, `401` |
| `GET /api/users/me` | **Não** | Meu perfil | `200`, `401`, `404` |
| `PATCH /api/users/me` | **Não** | Edita meu nome e minha bio | `200`, `400`, `401` |
| `DELETE /api/users/me` | **Não** | Remoção reversível da minha conta | `200`, `401` |
| `POST /api/users` | Sim | Cadastro (delega ao Better Auth) | `201`, `400`, `409` |
| `/api/auth/*` | — | Handler do Better Auth (sign-in, sign-out, sessão) | — |

O `409` do `PATCH` acontece num caso específico: desarquivar uma palestra quando o autor já tem 3 ativas. Ver [4.2](#42-os-três-status-e-o-que-cada-um-significa).

---

## 2. Como rodar localmente

### Pré-requisitos

- **Node.js 20+**
- **pnpm 9+** (`npm install -g pnpm`)
- Um cluster **MongoDB** com string de conexão em mãos. O free tier M0 do Atlas basta. O Prisma exige um **replica set** para transações — o Atlas já entrega assim; MongoDB local standalone não serve sem configuração extra.

### Passo a passo

```bash
# 1. Clone e entre no repositório
git clone <url-do-repositorio>
cd <pasta-do-repositorio>

# 2. Instale as dependências de todo o monorepo, a partir da raiz
pnpm install

# 3. Configure o ambiente (ver a seção abaixo)
cd web
cp .env.example .env
# abra o .env e preencha os valores

# 4. Gere o Prisma Client a partir do schema
pnpm prisma generate

# 5. Crie as coleções e os índices no banco
pnpm prisma db push

# 6. Suba o servidor de desenvolvimento
pnpm dev
```

A aplicação sobe em `http://localhost:3000`.

> **Sobre o passo 4:** o `web/package.json` tem um `postinstall` que já roda `prisma generate`. O comando explícito está aqui porque ele é obrigatório sempre que o `schema.prisma` muda — e nesse momento o `pnpm install` já rodou faz tempo. Rodar duas vezes não causa problema.

> **`generate` × `db push`, que é confusão clássica:** `generate` atualiza o **código** (regera o client tipado em `web/src/generated/prisma`). `db push` atualiza o **banco** (sincroniza coleções e índices com o schema). Alterou o `schema.prisma`? Rode os dois.

### Variáveis de ambiente

Crie `web/.env` a partir de `web/.env.example`. **Este arquivo nunca é commitado** — ele está no `.gitignore` e os valores são segredos.

**Obrigatórias:**

| Nome | Para que serve |
| --- | --- |
| `DATABASE_URL` | String de conexão do MongoDB, incluindo o nome do banco |
| `BETTER_AUTH_URL` | URL base da aplicação. Em desenvolvimento, `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Segredo usado para assinar os cookies de sessão. Gere com `openssl rand -base64 32` |

**Opcionais, herdadas do template e não usadas no EventFlow:**

| Nome | Situação |
| --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio de e-mail (recuperação de senha). O código está comentado em `web/src/lib/email/` — fora do escopo do PRD |
| `GOOGLE_ID`, `GOOGLE_SECRET` | Login social do Google. Comentado em `web/src/auth.ts` — fora do escopo (PRD, seção 5) |

Sem essas opcionais o projeto sobe e funciona normalmente.

### Sobre o seed

**Não há script de seed.** O projeto não precisa de um: todos os dados nascem do fluxo real de uso, e é justamente pelo fluxo real que o entregável é avaliado.

Para popular o banco em desenvolvimento, o caminho é criar uma conta em `/cadastro` e cadastrar palestras pelo painel — ou disparar as requisições da collection do Bruno (ver abaixo), que já vêm com corpos de exemplo prontos.

Para inspecionar o que está gravado, sem precisar do Atlas no navegador:

```bash
cd web
pnpm prisma studio
```

O Prisma Studio é também a forma de **provar o soft delete**: remova uma palestra pela tela, veja que ela sumiu da lista, e confirme no Studio que o documento continua lá, agora com `removidoEm` preenchido.

### Testes

```bash
cd web
pnpm test          # testes de integração (Vitest)
pnpm test:watch    # em modo observação
pnpm test:e2e      # testes ponta a ponta (Playwright)
pnpm lint          # ESLint com correção automática
pnpm lint:check    # ESLint sem escrever nada
pnpm build         # build de produção
```

Os testes de integração vivem em `web/tests/integration/` e verificam o comportamento das rotas com os services mockados: entra uma requisição, sai um status e um corpo. Os testes ponta a ponta ficam em `web/tests/e2e/` e simulam um usuário real no navegador.

**Husky** roda essas verificações sozinho:

| Hook | Quando | O que roda |
| --- | --- | --- |
| `pre-commit` | A cada `git commit` | `pnpm --filter web test` se houver alteração em `web/` |
| `pre-push` | A cada `git push` | `pnpm --filter web lint`; e, se a branch for `main`, também `test:e2e` e `build` |

Commit bloqueado não é bug — é a rede de proteção avisando. A saída correta é ler o erro e corrigir a causa, nunca `--no-verify`.

### Testando a API no Bruno

A collection fica em `bruno/`. Abra-a no [Bruno](https://www.usebruno.com/), selecione o ambiente **Dev** e preencha a variável secreta `sessionValue` com o valor do cookie `better-auth.session_token` (copie do DevTools do navegador, aba Application → Cookies, depois de fazer login).

A collection cobre: cadastro, login, listagem pública, filtro por tema, resumo, criação, detalhe, atualização, remoção, minhas palestras e as três operações de perfil. A requisição de criação tem um script pós-resposta que guarda o `id` retornado na variável `palestraId`, então as requisições seguintes de detalhe, atualização e remoção já apontam para a palestra recém-criada.

**Para testar o caso não autenticado**, não basta desabilitar o header `Cookie` da collection: o Bruno mantém um *cookie jar* próprio, independente dos headers configurados. É preciso limpar os cookies do Bruno (ou usar uma janela limpa) para de fato simular uma requisição sem sessão e ver o `401`.

---

## 3. Modelagem de dados

### As duas coleções que importam

```prisma
model User {
  id            String    @id @map("_id")   // string, não ObjectId — exigência do Better Auth
  name          String
  email         String    @unique
  emailVerified Boolean?
  image         String?
  role          Role      @default(USER)
  createdAt     DateTime
  updatedAt     DateTime
  sessions      Session[]
  accounts      Account[]

  bio        String?     // adicionado para o EventFlow
  removidoEm DateTime?   // adicionado para o EventFlow — soft delete

  @@map("user")
}

model Palestra {
  id           String         @id @default(auto()) @map("_id") @db.ObjectId
  titulo       String
  tema         String
  descricao    String
  duracao      Int                                  // em minutos
  status       StatusPalestra @default(RASCUNHO)
  autorId      String                               // vem da SESSÃO, não é @relation
  autorNome    String                               // cópia denormalizada
  removidoEm   DateTime?                            // ausente = ativa (soft delete)
  criadoEm     DateTime       @default(now())
  atualizadoEm DateTime       @updatedAt

  @@map("palestra")
}

enum StatusPalestra { RASCUNHO PUBLICADA ARQUIVADA }
```

Além dessas duas, o Better Auth gerencia três coleções de infraestrutura que **não são tocadas manualmente**: `session` (sessões ativas), `account` (credenciais, incluindo o hash da senha) e `verification` (tokens de verificação).

### Os dois cadastros são independentes

Este é o ponto central da modelagem e o que o PRD pede explicitamente (RN08).

**Não existe chave estrangeira entre `User` e `Palestra`.** Não há `@relation` no Prisma, não há `include`, não há join. `Palestra.autorId` é uma `String` comum — o Prisma não sabe que aquilo é o id de um usuário, e o MongoDB tampouco.

Consequências práticas, que valem entender antes da entrevista:

- **O banco não impede inconsistência.** Se um `autorId` apontar para um usuário que não existe, nada reclama. É a aplicação que garante a coerência, não o banco.
- **Apagar um usuário não apaga as palestras dele em cascata.** Não existe `onDelete: Cascade` aqui — e é por isso que a remoção de perfil precisa cuidar das palestras explicitamente (ver [4.5](#45-o-que-acontece-com-as-palestras-quando-o-perfil-é-removido)).
- **Buscar as palestras de um autor é uma consulta separada**, filtrando por `autorId`. Não é uma navegação de relação.

### A ligação é feita pela sessão de autenticação

Se não há chave estrangeira, o que liga um palestrante às suas palestras?

**O cookie de sessão.** O encadeamento é este:

```
navegador                 backend                          banco
─────────                 ───────                          ─────
cookie                →   auth.api.getSession(request)  →  coleção session
better-auth.session_token                                        ↓
                                                            session.userId
                                                                 ↓
                          getUserFromRequest() devolve
                          { id, name, role, ... }
                                 ↓
                          route.ts usa esse id:
                          • na criação:  autorId = user.id
                          • na listagem: where { autorId: user.id }
                          • na edição:   if (palestra.autorId !== user.id) → 403
```

Em nenhum momento o `autorId` vem da URL, da query string ou do corpo da requisição. Ele **sempre** é extraído da sessão pelo servidor.

O motivo é direto: se o `autorId` viesse do corpo, bastaria trocar um campo no Bruno para criar uma palestra em nome de outra pessoa. Se viesse da query string, bastaria trocar um número na URL para listar as palestras de qualquer um. A sessão é a única fonte da qual o cliente não consegue mentir, porque ela é resolvida no servidor a partir de um cookie assinado.

### O que "ativa" significa

Uma palestra é **ativa** quando:

```
removidoEm ausente   E   status ∈ { RASCUNHO, PUBLICADA }
```

Ou seja: não foi removida e não foi arquivada. Essa é a definição literal da RN03 e é exatamente o `where` de `contarAtivasDoAutor()`. O limite de 3 se aplica a esse conjunto.

---

## 4. Decisões técnicas

O PRD dá liberdade em vários pontos. Estas são as escolhas feitas e o raciocínio por trás de cada uma.

### 4.1 Nomes de campo em português

`titulo`, `tema`, `descricao`, `duracao`, `status`, `autorId`, `autorNome`, `removidoEm`, `criadoEm`, `atualizadoEm`.

O modelo `Palestra` é **inteiramente em português**. O motivo é coerência com o vocabulário do domínio: o PRD, o Roteiro e a conversa com o cliente falam de "palestra", "tema", "duração". Traduzir para `title`, `topic`, `duration` só introduz um dicionário mental entre o que se conversa e o que está no código.

O modelo `User` ficou **em inglês** (`name`, `email`, `bio`), com duas exceções em português (`bio` é neutro; `removidoEm` foi adicionado por mim). Isso não é inconsistência por descuido — é uma fronteira deliberada:

- Os campos de `User` marcados como intocáveis no schema são **contrato do Better Auth**. Renomear `name` para `nome` quebraria a biblioteca, que espera esses nomes exatos.
- Os campos que eu adicionei ao `User` seguem a convenção do meu domínio (`removidoEm`), porque são meus.

A regra que segui: **dentro de um mesmo modelo autoral, um idioma só.** O que não vale é `titulo` ao lado de `createdAt` no mesmo modelo escrito por mim.

O `id` do `User` é `String` e não `ObjectId` — isso é imposição do Better Auth e está sinalizado com comentário no schema. Já o `id` de `Palestra` é `@db.ObjectId`, o tipo nativo do MongoDB, e por isso a validação de id de palestra usa uma regex de 24 caracteres hexadecimais (`objectIdSchema`) enquanto a de usuário usa outro formato.

### 4.2 Os três status e o que cada um significa

| Status | Aparece na vitrine? | Conta para o limite de 3? | Papel no fluxo |
| --- | --- | --- | --- |
| `RASCUNHO` | Não | **Sim** | Estado inicial de toda palestra. É onde ela fica enquanto está sendo escrita. Visível só no painel do autor |
| `PUBLICADA` | **Sim** | **Sim** | Palestra pronta e visível ao público. O que aparece em `/` e em `/palestras/[id]` |
| `ARQUIVADA` | Não | Não | Palestra retirada de circulação sem ser apagada. É a **válvula de escape do limite** |

O ciclo típico é `RASCUNHO → PUBLICADA → ARQUIVADA`, mas as transições são livres: uma palestra arquivada pode voltar a `RASCUNHO` ou `PUBLICADA`.

Toda palestra nasce em `RASCUNHO` por `@default` no schema, e por isso **o seletor de status não aparece na tela de criação** — oferecer uma escolha que o backend ignora seria mentir para o usuário. O seletor só existe na edição.

`ARQUIVADA` é a decisão de design mais importante das três. Sem ela, um palestrante com 3 palestras publicadas ficaria travado: ou apagaria uma (perdendo o registro) ou não poderia propor nada novo. Arquivar libera uma vaga preservando o histórico.

**E é isso que cria um caso de borda que o backend precisa cobrir:** desarquivar uma palestra a transforma de volta em ativa, e isso pode estourar o limite. O `POST` sozinho não segura essa porta. Por isso o `PATCH /api/palestras/[id]` também checa o limite — mas só quando a transição é de `ARQUIVADA` para um status ativo, porque nos demais casos a contagem não muda:

```ts
const vaiReativar =
  palestra.status === "ARQUIVADA" &&
  novoStatus !== undefined &&
  novoStatus !== "ARQUIVADA";

if (vaiReativar) {
  const ativas = await contarAtivasDoAutor(user.id);
  if (ativas >= LIMITE_ATIVAS) return NextResponse.json({ ... }, { status: 409 });
}
```

Essa checagem não estava na primeira versão do código. Ela foi acrescentada depois de eu perceber, testando pelo Bruno, que era possível burlar o limite de 3: criar 3, arquivar uma, criar a quarta, e então **reativar a arquivada** — chegando a 4 ativas sem que nenhuma requisição individual parecesse ilegal. O limite estava no `POST` mas não no `PATCH`.

### 4.3 A faixa de duração (5 a 240 minutos) e onde ela é validada

O PRD diz apenas "duração estimada", sem faixa. Adotei **5 a 240 minutos, número inteiro**: 5 minutos é o piso de qualquer coisa que se chame palestra (abaixo disso é recado), e 240 minutos é o teto de um workshop de meio período. É a faixa do exemplo do Roteiro e é razoável para o domínio.

**Onde ela é validada:**

| Camada | Arquivo | O que faz | É a lei? |
| --- | --- | --- | --- |
| **Schema Zod** | `web/src/app/(backend)/schemas/palestras.schema.ts` | `z.number().int().min(5).max(240)` | **Sim** |
| Input HTML | `FormularioPalestra.tsx` | `type="number" min={5} max={240}` | Não |

O Zod é a única validação que conta. Os atributos `min` e `max` do input são conveniência: dão feedback imediato e evitam uma ida ao servidor à toa. Mas eles vivem no navegador, e **tudo que vive no navegador o usuário controla** — dá para editar o HTML no DevTools, dá para disparar a requisição pelo Bruno sem nunca abrir a tela.

Isso é uma instância do princípio geral: *never trust the client*. Vale para a duração, vale para o limite de 3, vale para o `autorId`.

Um detalhe de implementação que gera bug silencioso: `<input type="number">` devolve **string**, e o schema espera `z.number()`. Sem `Number(duracao)` antes de enviar, o backend responde `400` com uma mensagem de tipo que parece não fazer sentido.

O `.int()` é deliberado: `duracao` é `Int` no Prisma, e aceitar `45.5` minutos no Zod só levaria o erro para uma camada mais funda, onde ele seria mais difícil de diagnosticar.

### 4.4 A escolha de `/api/users/me` e por que o id vem da sessão

O perfil próprio é manipulado em **`/api/users/me`** — `GET`, `PATCH` e `DELETE` — e não em `/api/users/[id]`.

**A rota não recebe id.** Ela o obtém da sessão:

```ts
const user = await getUserFromRequest(request);
if (user instanceof NextResponse) return user;   // 401
const atualizado = await atualizarPerfil(user.id, validationResult.data);
```

O ganho é **segurança por construção**, e a diferença é qualitativa, não de grau:

- Com `/api/users/[id]`, o id é uma **entrada do usuário**. Ele pode ser qualquer coisa, então a rota precisa comparar o id da URL com o da sessão e devolver `403` quando não baterem. É uma proteção que **funciona porque alguém lembrou de escrevê-la** — e que some se alguém refatorar sem prestar atenção.
- Com `/api/users/me`, **não existe id para adulterar**. Não há comparação a fazer porque não há duas fontes a conciliar. A vulnerabilidade não é bloqueada; ela não tem por onde existir.

A URL também comunica melhor a intenção: `/me` diz que o recurso é *sempre* o do autenticado. `/users/507f1f77...` sugere que você poderia estar lidando com qualquer usuário, o que não é verdade neste sistema.

`/api/perfil` seria uma alternativa igualmente defensável. Fiquei com `/users/me` por ser a convenção REST mais difundida para "o recurso do requisitante" e por manter o recurso no plural, como o padrão do núcleo pede.

**A rota `/api/users/[id]` continua existindo** — ela veio do template e é gated por role (`blockForbiddenRequests`), com a regra de que um usuário `USER` só pode operar sobre o próprio id. Ver [seção 6](#6-fora-do-escopo-e-limitações-conhecidas) para a ressalva sobre ela.

O mesmo raciocínio se aplica a `GET /api/palestras/minhas`: o `autorId` do filtro vem da sessão, nunca da query string. Se viesse da URL, `?autorId=<id-de-outro>` listaria as palestras alheias — incluindo os rascunhos.

### 4.5 O que acontece com as palestras quando o perfil é removido

Quando o palestrante remove a própria conta (`DELETE /api/users/me`), **as palestras dele também são marcadas como removidas, na mesma operação**:

```ts
export async function removerPerfil(userId: string) {
  const agora = new Date();

  // 1. as palestras primeiro
  await prisma.palestra.updateMany({
    where: { autorId: userId, removidoEm: { isSet: false } },
    data:  { removidoEm: agora },
  });

  // 2. depois o próprio perfil — soft delete, nunca delete
  return prisma.user.update({
    where: { id: userId },
    data:  { removidoEm: agora },
    select: { id: true, removidoEm: true },
  });
}
```

**Por que isso é necessário:** como não existe `@relation` entre `User` e `Palestra` ([seção 3](#os-dois-cadastros-são-independentes)), o banco não faz cascata nenhuma. Se a aplicação não cuidasse disso explicitamente, as palestras continuariam publicadas na vitrine com o nome de alguém que não existe mais no sistema — palestras órfãs. A ausência de chave estrangeira é uma escolha de modelagem; a contrapartida é que a coerência vira responsabilidade do código.

**Por que soft delete e não delete de verdade:** RN04 exige remoção reversível. Nenhum documento sai do banco. O que muda é o campo `removidoEm`, que passa de ausente para uma data — e é essa data que esconde o registro de todas as listagens. Restaurar é voltar o campo ao estado anterior. Auditoria e histórico ficam intactos.

**A consequência é que toda listagem precisa filtrar por `removidoEm`.** Esquecer esse filtro em uma única consulta faz registros "removidos" reaparecerem na tela. Por isso ele está em `listarPublicadas`, `listarPorAutor`, `contarAtivasDoAutor` e `resumoDaVitrine` — e por isso `buscarPalestraPorId` **deliberadamente não filtra**: essa função devolve o registro cru, e quem decide responder `404` (por não existir, por estar removida, ou por não ser do dono) é a route, porque a decisão depende de quem está pedindo.

**Detalhe do MongoDB que custou tempo e é boa resposta de entrevista:** o filtro correto é `removidoEm: { isSet: false }`, **não** `removidoEm: null`. Quando o Prisma cria um documento sem preencher um campo opcional, o campo simplesmente **não existe** no documento — não é "existe e vale null". `removidoEm: null` procura por documentos onde o campo está presente com valor nulo, e não encontra nenhuma palestra recém-criada. O sintoma é uma vitrine vazia com o banco cheio, sem erro nenhum no console.

### 4.6 Por que a edição de e-mail ficou fora do escopo

O campo de e-mail aparece na tela de perfil, mas **desabilitado**, com um texto explicando que ele não pode ser alterado. Não foi esquecimento — foi decisão, por três razões:

1. **O e-mail é a credencial de login, não um dado de perfil.** Nome e bio são informação descritiva: trocar não afeta o acesso. E-mail é como o usuário prova quem é. Colocar os três no mesmo formulário trata coisas de naturezas diferentes como se fossem iguais.

2. **Ele tem índice único (`@unique`).** Uma troca pode colidir com um e-mail já cadastrado, o que exige tratar `409` na tela, distinguir o conflito dos outros erros de validação e decidir o que fazer com o formulário parcialmente preenchido. É um fluxo de erro inteiro, e o PRD não pede.

3. **O fluxo correto envolve verificação em duas pontas.** Trocar e-mail sem confirmar é um vetor de sequestro de conta: quem tivesse acesso momentâneo à sessão trocaria o e-mail e assumiria o controle. O caminho seguro é o do Better Auth (`changeEmail` com `sendChangeEmailVerification`) — mandar um link de confirmação **para o e-mail atual**, para que o dono legítimo aprove a mudança. Isso exige provedor de e-mail configurado, e o envio de e-mail está fora do escopo do PRD (o código do Resend está comentado no repositório).

Pela mesma lógica, o `patchSchema` do template usa `.omit({ email, password, confirmPassword })` seguido de `.strict()`: enviar `email` no corpo do `PATCH` não é ignorado silenciosamente — dá **erro**. Ignorar em silêncio seria pior: o usuário acharia que a mudança foi aceita.

Senha segue a mesma regra: só muda por rota dedicada do Better Auth (`/api/users/[id]/password`), que exige a senha atual e cuida do hash.

### 4.7 Ajustes no template

O projeto parte do `polijrorg/monorepo-base`, que traz estrutura, utilitários e testes de um projeto anterior. O que foi ajustado ou removido:

**Teste E2E `web/tests/e2e/example.spec.ts`.** O teste do template clica em "Embarque agora" e espera um `<h2>` com "Aprenda se divertindo!" — texto de outro produto. No EventFlow, a home é a vitrine de palestras e nenhum desses elementos existe, então o teste falharia sempre. Como o `pre-push` roda `test:e2e` quando a branch é `main`, um teste quebrado bloquearia a entrega inteira. **Foi reescrito** para navegar da vitrine até `/cadastro` pelo link real do header, verificando o que o EventFlow de fato renderiza. A opção de simplesmente deletar existia, mas eliminaria a única cobertura E2E do projeto.

**Coleção `materias` do Bruno.** Herdada de um projeto anterior sobre matérias de estudo, sem correspondência nenhuma no EventFlow. **Removida**, junto com as requisições que dependiam dela. Manter requisições que só devolvem `404` polui a collection e confunde quem for testar.

**`proxy.ts`.** A lista `authRequired` do template apontava para rotas de outro produto (`/aprender`, `/dashboard`, `/settings`). **Substituída** pelas rotas reais do painel. O bloco `adminRequired` foi mantido inerte porque o EventFlow não tem administrador (PRD, seção 4) — nenhuma rota `/admin/**` existe no projeto, então a regra nunca dispara.

**`PasswordRequirement.tsx`.** Componente do template que mostra os requisitos de senha com ícone de check ou X. **Mantido e integrado** ao formulário de cadastro, em vez de deletado: ele já resolvia bem o feedback visual de senha, e as funções auxiliares que ele consome (`hasUppercase`, `hasNumber`, `hasMinLength`) já existiam em `utils/validations`. Reaproveitar era mais barato que reescrever e mais honesto que apagar código que funciona.

**Login social do Google.** Continua comentado em `auth.ts`, como o guia determina — está fora do escopo (PRD, seção 5).

Nada disso foi contornado com `--no-verify`. Os hooks do Husky são a rede de proteção; pulá-los derrota o propósito.

### 4.8 Arquitetura em três camadas: route → service → schema

Não é decisão minha — é RNF02, padrão do núcleo — mas a separação é a espinha do backend e vale registrar o que cada camada faz e o que ela **não** faz.

```
requisição HTTP
      ↓
route.ts    ── conhece HTTP. Lê a requisição, resolve a sessão, decide status code.
      ↓        NÃO acessa o banco.
schema.ts   ── conhece formato. Valida a entrada com Zod e devolve dados tipados.
      ↓        NÃO conhece HTTP nem banco.
service.ts  ── conhece o banco. Recebe dados já validados e devolve dados.
      ↓        NÃO lê requisição, NÃO devolve status code, NÃO conhece sessão.
   Prisma
```

A regra dura: **`prisma.` só aparece em `services/`, nunca em um `route.ts`.**

O retorno prático apareceu na vitrine. A página `/` é um Server Component e chama `listarPublicadas()` e `resumoDaVitrine()` **direto**, sem passar por HTTP:

```ts
const [palestras, resumo, todas] = await Promise.all([
  listarPublicadas({ tema }),
  resumoDaVitrine(),
  listarPublicadas({}),
]);
```

Isso é código de servidor chamando código de servidor. Um `fetch("/api/palestras")` aqui seria a aplicação fazendo uma requisição HTTP para si mesma — serialização, ida à rede, desserialização — para buscar dados que já estão a uma chamada de função de distância. A mesma lógica serve a API e as páginas porque ela não sabe qual das duas está chamando.

Um detalhe de tipagem que sustenta isso: `criarPalestra` recebe `CriarPalestraInput & { autorId: string; autorNome: string }`. A interseção é deliberada — `CriarPalestraInput` são os campos que o usuário envia e o Zod validou; `autorId` e `autorNome` **não estão no schema Zod de propósito**, porque não podem vir do corpo. O tipo torna impossível chamar a função sem fornecer o autor, e o único lugar que tem o autor é a route, que o tirou da sessão.

### 4.9 A checagem de propriedade acontece em dois lugares, de propósito

Editar uma palestra exige duas coisas: estar logado (autenticação) e ser o dono (autorização). A checagem de dono aparece **duas vezes**, e isso não é duplicação por descuido:

| Onde | O que impede |
| --- | --- |
| `/painel/palestras/[id]/page.tsx` | Que o **formulário apareça** para quem não é dono |
| `PATCH /api/palestras/[id]` | Que a **alteração aconteça** |

Alguém pode disparar o `PATCH` direto pelo Bruno sem nunca abrir a tela. As duas se somam, nenhuma substitui a outra.

A tela responde **`notFound()` (404), não uma mensagem de "você não é o dono"**. Dizer "esta palestra não é sua" confirmaria que aquele id existe. Um `404` não revela nada — mesma lógica da mensagem genérica no login. Já a API responde `403`, porque ali o consumidor é um cliente autenticado e o código de status precisa ser semanticamente correto para quem está integrando.

A duplicação entre `PATCH` e `DELETE` na route também é intencional. As quatro primeiras etapas (validar id, autenticar, buscar, checar dono) são idênticas e poderiam virar um helper. Mantive explícito porque torna cada handler legível isoladamente — quem revisa consegue verificar a checagem sem navegar entre arquivos.

### 4.10 `autorNome` é uma cópia denormalizada

`Palestra` guarda `autorId` **e** `autorNome`. O nome está duplicado: ele já existe em `User.name`.

Foi escolha. A vitrine precisa exibir o nome do palestrante em cada card, e sem a cópia cada listagem exigiria uma segunda consulta à coleção `user` para resolver os nomes — sem `@relation`, sem `include`, sem join, isso seria uma consulta manual por autor ou um `findMany` extra e um mapeamento em memória.

**O custo:** se o palestrante mudar o nome no perfil, as palestras já criadas continuam com o nome antigo. Isso é aceitável no escopo do PRD — a troca de nome é rara e a divergência é cosmética, não semântica. Se virasse problema, a correção seria um `updateMany` em `palestra` dentro de `atualizarPerfil`, no mesmo padrão de `removerPerfil`.

Já a **bio** não foi copiada: ela aparece só na página de detalhe, uma palestra por vez, então a segunda consulta (`buscarPerfil(palestra.autorId)`) custa pouco e evita duplicar um texto longo em todo documento.

### 4.11 Tema é texto livre; o filtro se monta sozinho

O PRD não define lista fechada de temas. `tema` é `String` no schema, e o filtro da vitrine é construído a partir dos temas que **existem no banco**:

```ts
const temas = [...new Set(todas.map((p) => p.tema))].sort();
```

Um `Set` elimina repetições, o spread devolve um array, `.sort()` ordena. Sem `for` — RNF06. A vantagem é que o filtro nunca fica desatualizado nem oferece um tema sem nenhuma palestra.

Um `enum` seria igualmente defensável e traria consistência de escrita ("Arquitetura" vs "arquitetura"). Fiquei com texto livre porque o PRD não fecha a lista e porque um enum exigiria migração a cada tema novo. O formulário de criação mitiga o risco de divergência oferecendo uma lista de sugestões.

### 4.12 A vitrine ordena por mais recentes

`orderBy: { criadoEm: "desc" }`. É o comportamento esperado de uma vitrine — o que chegou por último aparece primeiro — e é o exemplo do Roteiro. Alternativas (ordenar por duração, por tema, por título) exigiriam justificativa; essa não exige.

### 4.13 `duracaoMedia` é calculada na aplicação, com `reduce`

O resumo da vitrine traz `total` e `duracaoMedia`. O cálculo:

```ts
const palestras = await prisma.palestra.findMany({
  where: { status: "PUBLICADA", removidoEm: { isSet: false } },
  select: { duracao: true },        // só o campo necessário, não o documento inteiro
});

const somaDuracoes = palestras.reduce((soma, p) => soma + p.duracao, 0);
const duracaoMedia = palestras.length > 0 ? somaDuracoes / palestras.length : 0;

return { total: palestras.length, duracaoMedia: Math.round(duracaoMedia) };
```

Três decisões pequenas aqui:

- **`select` em vez do documento inteiro.** Trazer `descricao` de todas as palestras para somar durações é desperdício de banda e memória.
- **`reduce` em vez de `for`.** RNF06 proíbe `for` em transformação de array. `reduce` percorre acumulando: começa em `0` e soma cada duração.
- **A guarda `palestras.length > 0`.** Sem ela, uma vitrine vazia dividiria por zero e devolveria `NaN`, que serializa em JSON como `null` e quebra a tela sem erro no servidor.

Um `aggregate` do MongoDB faria a média no banco e seria mais eficiente em escala. Nesse volume, a diferença é irrelevante e o código em TypeScript é mais legível e mais fácil de testar.

### 4.14 Sem `any`, e o que entra no lugar

RNF05 proíbe `any`. Os substitutos usados:

- **`z.infer<typeof schema>`** para os tipos de entrada. O tipo é derivado do schema Zod, então schema e tipo não podem divergir — mudar a validação atualiza o tipo automaticamente.
- **`catch (error: unknown)` com `instanceof Error`** no tratamento de erro. `any` desliga o compilador; `unknown` obriga a provar o tipo antes de usar.
- **Genérico `<T>`** nas actions do frontend, para que `criarPalestra` devolva `Palestra` tipada em vez de `any`, preservando o autocomplete.
- **`user instanceof NextResponse`** como discriminante. `getUserFromRequest` devolve *ou* o usuário *ou* a resposta `401` já pronta; o `instanceof` estreita o tipo e o TypeScript entende que, depois do `if`, `user` é o usuário.

Os tipos do Prisma são importados de **`@/generated/prisma`**, não de `@prisma/client` — o `schema.prisma` tem `output = "../src/generated/prisma"`, então o client fica dentro de `src/`. Importar do lugar errado compila em alguns casos e falha em outros, com mensagem que não ajuda.

---

## 5. Arquitetura do código

```
.
├── bruno/                          collection de testes de API
├── web/
│   ├── docs/                       padrões do núcleo (API, Better Auth, frontend)
│   ├── prisma/schema.prisma        modelagem
│   ├── tests/
│   │   ├── integration/            Vitest — rotas com services mockados
│   │   └── e2e/                    Playwright — navegador real
│   └── src/
│       ├── auth.ts                 configuração do Better Auth
│       ├── proxy.ts                proteção de rotas na navegação
│       ├── generated/prisma/       client gerado (não versionado)
│       ├── app/
│       │   ├── (backend)/
│       │   │   ├── api/            route handlers
│       │   │   ├── schemas/        validação Zod
│       │   │   └── services/       único lugar com `prisma.`
│       │   └── (frontend)/
│       │       ├── (landing-pages)/   vitrine pública
│       │       ├── (auth)/            login e cadastro
│       │       └── (palestrante)/     área privada (/painel)
│       ├── components/             componentes reutilizáveis em todo o site
│       ├── lib/                    auth-client, utilitários
│       └── utils/api/server/       validBody, getUserFromRequest, handlers de erro
└── pnpm-workspace.yaml
```

Convenções de frontend seguidas (`web/docs/FRONTEND.md`):

- Componente reutilizável em qualquer lugar → `src/components/`.
- Componente que só faz sentido numa página → `{rota}/_components/`, com `index.ts` de barril. A pasta com `_` é ignorada pelo roteador do Next.
- Chamadas ao backend → `{rota}/_actions/`, **nunca** `services` (esse nome é do backend).
- Route groups `(auth)`, `(landing-pages)`, `(palestrante)` organizam sem aparecer na URL.
- `page.tsx` é Server Component fino: busca os dados e delega a renderização. `"use client"` só onde há estado ou evento.

---

## 6. Fora do escopo e limitações conhecidas

Registrado por honestidade — reconhecer o que não foi feito vale mais do que fingir completude.

**Fora do escopo, por decisão do PRD:**

- Login social (Google) — código presente e comentado em `auth.ts`.
- Envio de e-mail e recuperação de senha por link — código presente e comentado em `lib/email/`. As rotas `/api/password/forgot` e `/api/password/reset` existem mas dependem do provedor não configurado.
- Edição de e-mail — ver [4.6](#46-por-que-a-edição-de-e-mail-ficou-fora-do-escopo).
- Papel de administrador — o `enum Role` existe (herança do template) e todo usuário é criado como `USER`. Nenhuma tela ou rota administrativa foi construída.
- Aplicativo mobile — o workspace `mobile/` existe no monorepo e não faz parte deste entregável.

**Limitações conhecidas:**

- **Duas semânticas de remoção de usuário convivem.** `DELETE /api/users/me` faz soft delete (RN04). `DELETE /api/users/[id]`, herdada do template, faz **hard delete** via `prisma.user.delete()` e é gated por role. O fluxo do EventFlow usa exclusivamente `/me`; a rota do template permanece porque outras partes do padrão do núcleo dependem dela.
- **`User.removidoEm` não é filtrado no login.** O soft delete do perfil esconde as palestras da vitrine, mas o Better Auth não conhece esse campo e não bloqueia a autenticação de uma conta marcada como removida. Bloquear exigiria interceptar o fluxo de login do Better Auth, o que o PRD não pede.
- **Não há paginação na vitrine.** `listarPublicadas` devolve tudo. No volume esperado do entregável isso é irrelevante; em produção, seria o primeiro item a mudar.
- **A busca por título usa `contains` sem índice de texto.** Funciona, mas faz varredura de coleção.

---

## 7. Rastreabilidade do PRD

| ID | Requisito | Onde está |
| --- | --- | --- |
| RF01 | Vitrine só com publicadas | `listarPublicadas` + `GET /api/palestras` + `/` |
| RF02 | Filtro por tema | `?tema=` + `FiltroTema` |
| RF03 | Resumo com total e média | `resumoDaVitrine` + `ResumoVitrine` |
| RF04 | Detalhe público | `GET /api/palestras/[id]` + `/palestras/[id]` |
| RF05 | Cadastro com nome, e-mail, senha, bio | `/cadastro` + `User.bio` |
| RF06 | Login | `/login` |
| RF07 | Logout | `Header` |
| RF08 | Sessão mantida | Better Auth + `proxy.ts` |
| RF09 | Palestrante vê e filtra as próprias | `listarPorAutor` + `/painel` |
| RF10 | Cadastra palestra | `POST /api/palestras` + `/painel/palestras/nova` |
| RF11 | Edita a própria | `PATCH /api/palestras/[id]` + `/painel/palestras/[id]` |
| RF12 | Remove (reversível) a própria | `DELETE /api/palestras/[id]` |
| RF13 | Edita o próprio perfil | `PATCH /api/users/me` + `/painel/perfil` |
| RF14 | Remove (reversível) o próprio perfil | `DELETE /api/users/me` |
| RF15 | Mensagens claras de erro e sucesso | actions + `react-hot-toast` |
| RN01 | Só o dono vê, edita e remove | `403` nas routes + `notFound()` nas telas |
| RN02 | Validação e permissão no backend | Zod + checagens nas routes |
| RN03 | Limite de 3 ativas, no servidor | `contarAtivasDoAutor` + `409` no `POST` e no `PATCH` |
| RN04 | Remoção reversível | `removidoEm` + `update`, nunca `delete` |
| RN05 | Senha nunca em texto puro | Better Auth (hash na coleção `account`) |
| RN06 | Três estágios de status | `enum StatusPalestra` |
| RN07 | Autoria pela sessão | `autorId = user.id` em `POST /api/palestras` |
| RN08 | Cadastros independentes | `autorId` sem `@relation` |
| RN09 | E-mail único | `@unique` + tratamento de `409` |
| RNF01 | Stack do `monorepo-base` | — |
| RNF02 | route → service → schema | `(backend)/` |
| RNF03 | MongoDB via Prisma | `schema.prisma` |
| RNF04 | Better Auth | `auth.ts` |
| RNF05 | Nenhum `any` | `z.infer`, `unknown`, genéricos |
| RNF06 | Nenhum `for` de transformação | `map`, `reduce`, `Set` |
| RNF07 | Layout organizado e responsivo | Tailwind + `Header` |

---

## Convenções de contribuição

Commits seguem [Conventional Commits](https://www.conventionalcommits.org/): `tipo(escopo): descrição no imperativo, minúscula, sem ponto final`.

```
feat(palestras): adiciona rota de criacao de palestra
fix(palestras): valida limite de ativas tambem no patch
docs: documenta setup, modelagem e decisoes tecnicas
```

Fluxo de branches: `dev` → `feat/*` ou `fix/*` → Pull Request → merge em `dev`. Merge de `dev` para `main` quando a entrega fecha. **Nunca commite direto na `main`.**
