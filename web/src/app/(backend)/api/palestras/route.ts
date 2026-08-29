import { NextRequest, NextResponse } from "next/server";
import { criarPalestraSchema } from "@/backend/schemas/palestras.schema";
import {
  contarAtivasDoAutor,
  criarPalestra,
  listarPublicadas,
} from "@/backend/services/palestras";
import {
  validBody,
  returnInvalidDataErrors,
  zodErrorHandler,
  getUserFromRequest,
} from "@/utils/api/server";

const LIMITE_ATIVAS = 3;

// GET /api/palestras -> vitrine publica (NAO exige login)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const palestras = await listarPublicadas({
      tema: searchParams.get("tema") ?? undefined,
      busca: searchParams.get("busca") ?? undefined,
    });

    return NextResponse.json(palestras);
  } catch (error) {
    return zodErrorHandler(error);
  }
}

// POST /api/palestras -> cria palestra (EXIGE login)
export async function POST(request: NextRequest) {
  try {
    // 1) quem esta logado? Se nao houver sessao, isto JA e a resposta 401
    const user = await getUserFromRequest(request);
    if (user instanceof NextResponse) return user;

    // 2) o corpo e um JSON valido?
    const body = await validBody(request);

    // 3) os dados batem com o formato esperado?
    const validationResult = criarPalestraSchema.safeParse(body);
    if (!validationResult.success) {
      return returnInvalidDataErrors(validationResult.error);
    }

    // 4) RN03: o limite e verificado NO BACKEND, nao na tela
    const ativas = await contarAtivasDoAutor(user.id);
    if (ativas >= LIMITE_ATIVAS) {
      return NextResponse.json(
        { error: `Limite de ${LIMITE_ATIVAS} palestras ativas atingido` },
        { status: 409 },
      );
    }

    // 5) o autor vem da SESSAO, nunca do corpo da requisicao
    const palestra = await criarPalestra({
      ...validationResult.data,
      autorId: user.id,
      autorNome: user.name,
    });

    return NextResponse.json(palestra, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return zodErrorHandler(error);
  }
}