import prisma from "@/backend/services/db";
import type {
  CriarPalestraInput,
  AtualizarPalestraInput,
} from "@/backend/schemas/palestras.schema";
import type { StatusPalestra } from "@/generated/prisma";

/**
 * Camada de SERVICE.
 *
 * Regra do núcleo: `prisma.` só aparece aqui, nunca num `route.ts`.
 * Este arquivo não sabe o que é HTTP — não lê requisição, não devolve
 * status code, não conhece sessão. Ele recebe dados já validados e
 * devolve dados. Quem traduz isso para a web é a route.
 */

// ─────────────────────────────────────────────────────────────
// 1. Vitrine pública (RF01, RF02)
// ─────────────────────────────────────────────────────────────
export async function listarPublicadas({ tema, busca }: {
  tema?: string;
  busca?: string;
}) {
  return prisma.palestra.findMany({
    where: {
      status: "PUBLICADA",
      // RN04: o soft delete obriga TODA listagem a filtrar isto.
      // Esquecer aqui faz palestras "removidas" reaparecerem na tela.
      removidoEm: { isSet: false },
      // `undefined` faz o Prisma ignorar o campo. É assim que o filtro
      // fica opcional sem precisar montar o objeto `where` condicionalmente.
      tema: tema ?? undefined,
      titulo: busca ? { contains: busca, mode: "insensitive" } : undefined,
    },
    orderBy: { criadoEm: "desc" },
  });
}

// ─────────────────────────────────────────────────────────────
// 2. Contagem de palestras ativas de um autor (RN03)
// ─────────────────────────────────────────────────────────────
export async function contarAtivasDoAutor(autorId: string) {
  return prisma.palestra.count({
    where: {
      autorId,
      removidoEm: { isSet: false },
      // "Ativa" = ocupa uma das 3 vagas. ARQUIVADA não ocupa,
      // por isso o `in` lista só os dois primeiros estágios.
      status: { in: ["RASCUNHO", "PUBLICADA"] },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Remoção reversível — soft delete (RN04)
// ─────────────────────────────────────────────────────────────
export async function removerPalestra(id: string) {
  // É um `update`, nunca um `delete`. O registro continua no banco;
  // o que muda é a data em `removidoEm`, que passa a escondê-lo
  // das listagens. Para restaurar, basta voltar o campo para null.
  return prisma.palestra.update({
    where: { id },
    data: { removidoEm: new Date() },
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Criar palestra (RF10, RN07)
// ─────────────────────────────────────────────────────────────
export async function criarPalestra(
  dados: CriarPalestraInput & { autorId: string; autorNome: string },
) {
  // O tipo é uma interseção (`&`) de propósito: `CriarPalestraInput`
  // são os campos que o usuário envia e o Zod validou; `autorId` e
  // `autorNome` NÃO estão no schema Zod porque não podem vir do corpo
  // da requisição. A route os extrai da sessão e passa por aqui.
  // É isso que impede alguém de criar palestra no nome de outra pessoa.
  //
  // `status` e `criadoEm` não aparecem: o schema.prisma tem @default
  // para os dois (RASCUNHO e now()).
  return prisma.palestra.create({ data: dados });
}

// ─────────────────────────────────────────────────────────────
// 5. Buscar uma palestra pelo id (RF04, RF11)
// ─────────────────────────────────────────────────────────────
export async function buscarPalestraPorId(id: string) {
  // Sem filtro de `removidoEm` aqui, de propósito: esta função devolve
  // o registro cru. Quem decide responder 404 (por não existir, ou por
  // estar removida, ou por não ser do dono) é a route, porque essa
  // decisão depende de quem está pedindo.
  return prisma.palestra.findUnique({ where: { id } });
}

// ─────────────────────────────────────────────────────────────
// 6. Listar palestras do próprio palestrante (RF09)
// ─────────────────────────────────────────────────────────────
export async function listarPorAutor(autorId: string, status?: StatusPalestra) {
  return prisma.palestra.findMany({
    where: {
      // Vem da SESSÃO, nunca da query string. Se viesse da URL,
      // qualquer um listaria as palestras de qualquer outro.
      autorId,
      removidoEm: { isSet: false },
      // Filtro opcional por status — mesma técnica do `tema` acima.
      status: status ?? undefined,
    },
    orderBy: { criadoEm: "desc" },
  });
}

// ─────────────────────────────────────────────────────────────
// 7. Atualizar palestra (RF11)
// ─────────────────────────────────────────────────────────────
export async function atualizarPalestra(
  id: string,
  dados: AtualizarPalestraInput,
) {
  // `AtualizarPalestraInput` tem todos os campos opcionais (`.partial()`
  // no schema Zod), o que é o comportamento correto de um PATCH: só
  // os campos enviados são alterados.
  //
  // A checagem de dono NÃO está aqui. Ela é da route, que compara o
  // `autorId` do registro com o id da sessão antes de chamar esta função.
  return prisma.palestra.update({ where: { id }, data: dados });
}

// ─────────────────────────────────────────────────────────────
// 8. Resumo numérico da vitrine (RF03)
// ─────────────────────────────────────────────────────────────
export async function resumoDaVitrine() {
  const palestras = await prisma.palestra.findMany({
    where: { status: "PUBLICADA", removidoEm: { isSet: false } },
    // `select` traz só o campo necessário em vez do documento inteiro.
    select: { duracao: true },
  });

  // RNF06 proíbe `for` em transformação de array. `reduce` percorre a
  // lista acumulando um valor: começa em 0 e vai somando cada duração.
  const somaDuracoes = palestras.reduce((soma, p) => soma + p.duracao, 0);

  // A guarda do divisor evita NaN quando a vitrine está vazia.
  const duracaoMedia =
    palestras.length > 0 ? somaDuracoes / palestras.length : 0;

  return {
    total: palestras.length,
    duracaoMedia: Math.round(duracaoMedia),
  };
}