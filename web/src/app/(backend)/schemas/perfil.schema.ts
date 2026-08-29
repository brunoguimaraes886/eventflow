import { z } from "zod";

export const atualizarPerfilSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(80).trim().optional(),
  bio: z.string().max(500, "Bio muito longa").trim().optional(),
});

export type AtualizarPerfilInput = z.infer<typeof atualizarPerfilSchema>;