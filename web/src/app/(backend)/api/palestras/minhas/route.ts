import { NextRequest, NextResponse } from "next/server";
import { listarPorAutor } from "@/backend/services/palestras";
import { zodErrorHandler, getUserFromRequest } from "@/utils/api/server";
import type { StatusPalestra } from "@/generated/prisma";

const STATUS_VALIDOS = ["RASCUNHO", "PUBLICADA", "ARQUIVADA"];

// GET /api/palestras/minhas?status=PUBLICADA -> (EXIGE login)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const statusBruto = searchParams.get("status");

    // status invalido na URL e simplesmente ignorado, nao vira erro
    const status = STATUS_VALIDOS.includes(statusBruto ?? "")
      ? (statusBruto as StatusPalestra)
      : undefined;

    // o autorId vem da SESSAO, nunca da query string
    const palestras = await listarPorAutor(user.id, status);
    return NextResponse.json(palestras);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return zodErrorHandler(error);
  }
}