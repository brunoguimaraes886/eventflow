import { NextRequest, NextResponse } from "next/server";
import { atualizarPerfilSchema } from "@/backend/schemas/perfil.schema";
import { buscarPerfil, atualizarPerfil, removerPerfil } from "@/backend/services/perfil";
import {
  validBody,
  returnInvalidDataErrors,
  zodErrorHandler,
  getUserFromRequest,
} from "@/utils/api/server";

// GET /api/users/me -> dados do proprio perfil
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (user instanceof NextResponse) return user;

    const perfil = await buscarPerfil(user.id);
    if (!perfil) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(perfil);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return zodErrorHandler(error);
  }
}

// PATCH /api/users/me -> edita nome e bio (RF13)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (user instanceof NextResponse) return user;

    const body = await validBody(request);
    const validationResult = atualizarPerfilSchema.safeParse(body);
    if (!validationResult.success) {
      return returnInvalidDataErrors(validationResult.error);
    }

    // o id vem da SESSAO, nunca da URL nem do corpo
    const atualizado = await atualizarPerfil(user.id, validationResult.data);
    return NextResponse.json(atualizado);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return zodErrorHandler(error);
  }
}

// DELETE /api/users/me -> remocao reversivel da propria conta (RF14)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (user instanceof NextResponse) return user;

    const removido = await removerPerfil(user.id);
    return NextResponse.json(removido);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return zodErrorHandler(error);
  }
}