import type {
  CriarPalestraInput,
  AtualizarPalestraInput,
} from "@/backend/schemas/palestras.schema";
import type { Palestra } from "@/generated/prisma";

// Lê a resposta uma vez e transforma erro do backend em exceção com a
// mensagem original. É esta função que faz o 409 do limite chegar na tela.
export async function lerResposta<T>(
  res: Response,
  mensagemPadrao: string,
): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const errorMessage = typeof json.error === "string" 
      ? json.error 
      : (json.error?.message ?? mensagemPadrao);
    throw new Error(errorMessage);
  }
  return json as T;
}

export async function criarPalestra(
  dados: CriarPalestraInput,
): Promise<Palestra> {
  const res = await fetch("/api/palestras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return lerResposta<Palestra>(res, "Erro ao criar palestra");
}

export async function atualizarPalestra(
  id: string,
  dados: AtualizarPalestraInput,
): Promise<Palestra> {
  const res = await fetch(`/api/palestras/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  return lerResposta<Palestra>(res, "Erro ao atualizar palestra");
}

export async function removerPalestra(id: string): Promise<Palestra> {
  const res = await fetch(`/api/palestras/${id}`, { method: "DELETE" });
  return lerResposta<Palestra>(res, "Erro ao remover palestra");
}