import { z } from "zod";

export const criarPalestraSchema = z.object({
  titulo: z.string().trim().min(5, "Título deve ter pelo menos 5 caracteres").max(120),
  tema: z.string().min(2, "Tema é obrigatório").trim(),
  descricao: z.string().min(20, "Descreva a palestra em pelo menos 20 caracteres").trim(),
  duracao: z.number().int().min(5, "Mínimo de 5 minutos").max(240, "Máximo de 240 minutos"),
});

// atualização: todos os campos opcionais + o status, que só o dono controla
export const atualizarPalestraSchema = criarPalestraSchema
  .partial()
  .extend({ status: z.enum(["RASCUNHO", "PUBLICADA", "ARQUIVADA"]).optional() });

// id do MongoDB é ObjectId: 24 caracteres hexadecimais
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID inválido");

export type CriarPalestraInput = z.infer<typeof criarPalestraSchema>;
export type AtualizarPalestraInput = z.infer<typeof atualizarPalestraSchema>;