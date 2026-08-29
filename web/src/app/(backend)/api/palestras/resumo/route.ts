import { NextResponse } from "next/server";
import { resumoDaVitrine } from "@/backend/services/palestras";
import { zodErrorHandler } from "@/utils/api/server";

// GET /api/palestras/resumo -> { total, duracaoMedia } (PUBLICO)
export async function GET() {
  try {
    const resumo = await resumoDaVitrine();
    return NextResponse.json(resumo);
  } catch (error) {
    return zodErrorHandler(error);
  }
}