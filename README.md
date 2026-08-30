# EventFlow

## 1. O que o site faz e como funciona
O EventFlow é uma plataforma para organização de palestras.
- **Cadastro e Login**: Qualquer visitante pode se cadastrar como palestrante usando nome, e-mail, senha e uma bio. Com a conta criada, pode fazer login na plataforma.
- **Submissão de Palestra**: Uma vez logado, o palestrante acessa um painel onde pode criar novas palestras informando título, tema, descrição e duração. Há um limite de até 3 palestras ativas (rascunho ou publicadas) por usuário.
- **Vitrine**: A página inicial (vitrine) é pública e exibe todas as palestras publicadas no sistema, com opções para filtrar por tema.

## 2. Como rodar localmente

### Setup e execução
Para rodar o projeto localmente, tenha o Node.js e o pnpm instalados e siga os passos abaixo:

```bash
# Clone o repositório e acesse a pasta do projeto
git clone <link-do-repo>
cd eventflow

# Instale as dependências a partir da raiz
pnpm install

# Acesse a pasta web
cd web

# Gere o client do Prisma e atualize o schema no banco de dados
pnpm prisma generate
pnpm prisma db push

# Rode o servidor de desenvolvimento
pnpm dev
```

### Variáveis de ambiente
Crie um arquivo `.env` na pasta `web` com as seguintes variáveis de ambiente (nunca inclua valores ou segredos no repositório):
- `DATABASE_URL`: String de conexão com o MongoDB Atlas.
- `BETTER_AUTH_URL`: Endereço base da aplicação (em desenvolvimento: `http://localhost:3000`).
- `BETTER_AUTH_SECRET`: String aleatória para assinar os cookies de sessão.

## 3. Modelagem de Dados
O sistema utiliza dois modelos principais que operam de forma independente:
- **User**: Gerenciado pelo Better Auth (junto com `Session`, `Account` e `Verification`), armazena as credenciais e dados do palestrante (como nome e bio).
- **Palestra**: Armazena as informações submetidas pelo palestrante.

**Ligação entre as coleções**: Os dois cadastros são independentes e não há uma relação formal (chave estrangeira ou `@relation` do Prisma). A ligação entre eles é puramente lógica, feita **via sessão de autenticação**: quando uma palestra é criada, o `autorId` e `autorNome` são registrados no documento da palestra a partir da sessão ativa no momento da criação.

## 4. Decisões Técnicas
Aqui estão algumas escolhas arquiteturais e de implementação tomadas no projeto:

- **Nomes de campo em português**: Optei por usar nomes de campo em português (ex: `titulo`, `tema`, `duracao`, `removidoEm`) para manter a coerência com o vocabulário do PRD e do domínio do problema. 
- **Os três status**: O ciclo de vida de uma palestra passa por três estados:
  - `RASCUNHO`: Palestra recém-criada, em elaboração (ainda não aparece na vitrine).
  - `PUBLICADA`: Palestra visível para todos na vitrine pública.
  - `ARQUIVADA`: Palestra finalizada ou oculta pelo autor, não entra no limite de palestras ativas.
- **Faixa de duração (5 a 240 minutos)**: Definida no schema (Zod) e no input numérico do frontend, pois é um limite sensato para o tempo de uma palestra e reflete os exemplos.
- **A rota `/api/users/me`**: A edição e remoção do perfil próprio utiliza a rota `/me` (sem receber id pela URL) porque a identificação vem sempre e unicamente do cookie de sessão. Isso garante segurança por design (ninguém consegue passar o ID de outra pessoa) e reflete que o recurso manipulado é estritamente o do usuário autenticado.
- **Perfil removido**: Quando um palestrante exclui sua conta (soft delete), todas as suas palestras também recebem a data em `removidoEm` (soft delete). Isso foi feito para garantir que a vitrine não apresente palestras "órfãs" (sem autor existente) enquanto mantém o histórico real intacto.
- **Edição de e-mail fora do escopo**: O e-mail não é editável no formulário de perfil porque é a credencial de login com índice único no banco. Alterar isso envolveria refatoração na autenticação e um caso de tratamento de conflito (409) não requisitado pelo PRD. O campo na UI é explicitamente desabilitado.
- **Ajustes de template**: O diretório `materias` foi removido da collection do Bruno pois se tratava de sobra de um projeto anterior, e não fazia sentido mantê-lo.
