import prisma from "@/backend/services/db";
import type { AtualizarPerfilInput } from "@/backend/schemas/perfil.schema";

export async function buscarPerfil(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    // select devolve so o necessario: mais leve e mais seguro.
    // Nunca exponha campos internos sem motivo.
    select: { id: true, name: true, email: true, bio: true },
  });
}

export async function atualizarPerfil(userId: string, dados: AtualizarPerfilInput) {
  return prisma.user.update({
    where: { id: userId },
    data: dados,
    select: { id: true, name: true, email: true, bio: true },
  });
}

export async function removerPerfil(userId: string) {
  const agora = new Date();

  // Decisao registrada no Anexo C: ao remover o perfil, as palestras da
  // pessoa tambem sao marcadas como removidas, para que a vitrine nao
  // fique com palestra de autor inexistente.
  await prisma.palestra.updateMany({
    where: { autorId: userId, removidoEm: null },
    data: { removidoEm: agora },
  });

  // soft delete do proprio usuario (RN04) - nunca um delete
  return prisma.user.update({
    where: { id: userId },
    data: { removidoEm: agora },
    select: { id: true, removidoEm: true },
  });
}