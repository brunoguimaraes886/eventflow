import type { AtualizarPerfilInput } from "@/backend/schemas/perfil.schema";
import { lerResposta } from "./palestras";

// Ajuste os campos ao que a sua rota GET /api/users/me realmente devolve.
export type PerfilResposta = {
  id: string;
  name: string;
  email: string;
  bio: string | null;
};

export async function atualizarPerfil(
  dados: AtualizarPerfilInput,
): Promise<PerfilResposta> {
  const res = await fetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return lerResposta<PerfilResposta>(res, "Erro ao atualizar perfil");
}

export async function removerPerfil(): Promise<PerfilResposta> {
  const res = await fetch("/api/users/me", { method: "DELETE" });
  return lerResposta<PerfilResposta>(res, "Erro ao remover conta");
}