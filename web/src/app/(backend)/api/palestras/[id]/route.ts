import { NextRequest, NextResponse } from "next/server";
import {
  atualizarPalestraSchema,
  objectIdSchema,
} from "@/backend/schemas/palestras.schema";
import {
  atualizarPalestra,
  buscarPalestraPorId,
  contarAtivasDoAutor,
  removerPalestra,
} from "@/backend/services/palestras";
import {
  validBody,
  returnInvalidDataErrors,
  zodErrorHandler,
  getUserFromRequest,
} from "@/utils/api/server";

const LIMITE_ATIVAS = 3;

type Contexto = { params: Promise<{ id: string }> };

// GET /api/palestras/[id] -> detalhe (PUBLICO, RF04)
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    const { id } = await params;

    const idValido = objectIdSchema.safeParse(id);
    if (!idValido.success) return returnInvalidDataErrors(idValido.error);

    const palestra = await buscarPalestraPorId(id);

    // removida OU inexistente -> 404 para o publico
    if (!palestra || palestra.removidoEm) {
      return NextResponse.json({ error: "Palestra nao encontrada" }, { status: 404 });
    }

    return NextResponse.json(palestra);
  } catch (error) {
    return zodErrorHandler(error);
  }
}

// PATCH /api/palestras/[id] -> atualiza (EXIGE login + ser dono)
export async function PATCH(request: NextRequest, { params }: Contexto) {
  try {
    // 1) o id da URL
    const { id } = await params;

    const idValido = objectIdSchema.safeParse(id);
    if (!idValido.success) return returnInvalidDataErrors(idValido.error);

    // 2) autenticacao -> 401
    const user = await getUserFromRequest(request);
    if (user instanceof NextResponse) return user;

    // 3) existencia -> 404 (ANTES da permissao: se nao existe, nao ha dono a comparar)
    const palestra = await buscarPalestraPorId(id);
    if (!palestra || palestra.removidoEm) {
      return NextResponse.json({ error: "Palestra nao encontrada" }, { status: 404 });
    }

    // 4) OWNERSHIP -> 403. Criterio de aceitacao no 2.
    if (palestra.autorId !== user.id) {
      return NextResponse.json(
        { error: "Voce so pode editar as suas palestras" },
        { status: 403 },
      );
    }

    // 5) validacao do corpo -> 400
    const body = await validBody(request);
    const validationResult = atualizarPalestraSchema.safeParse(body);
    if (!validationResult.success) {
      return returnInvalidDataErrors(validationResult.error);
    }

    // 5.5) RN03 tambem no PATCH: desarquivar faz a palestra voltar a ser ativa,
    // e isso pode estourar o limite. So checa quando a transicao e de ARQUIVADA
    // para um status ativo — nos demais casos a contagem nao muda.
    const novoStatus = validationResult.data.status;
    const vaiReativar =
      palestra.status === "ARQUIVADA" &&
      novoStatus !== undefined &&
      novoStatus !== "ARQUIVADA";

    if (vaiReativar) {
      const ativas = await contarAtivasDoAutor(user.id);
      if (ativas >= LIMITE_ATIVAS) {
        return NextResponse.json(
          { error: `Limite de ${LIMITE_ATIVAS} palestras ativas atingido` },
          { status: 409 },
        );
      }
    }

    // 6) so agora altera
    const atualizada = await atualizarPalestra(id, validationResult.data);
    return NextResponse.json(atualizada);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return zodErrorHandler(error);
  }
}

// DELETE /api/palestras/[id] -> soft delete (EXIGE login + ser dono)
export async function DELETE(request: NextRequest, { params }: Contexto) {
  try {
    const { id } = await params;

    const idValido = objectIdSchema.safeParse(id);
    if (!idValido.success) return returnInvalidDataErrors(idValido.error);

    const user = await getUserFromRequest(request);
    if (user instanceof NextResponse) return user;

    const palestra = await buscarPalestraPorId(id);
    if (!palestra || palestra.removidoEm) {
      return NextResponse.json({ error: "Palestra nao encontrada" }, { status: 404 });
    }

    if (palestra.autorId !== user.id) {
      return NextResponse.json(
        { error: "Voce so pode remover as suas palestras" },
        { status: 403 },
      );
    }

    // o verbo e DELETE, mas por baixo e um update que preenche removidoEm
    const removida = await removerPalestra(id);
    return NextResponse.json(removida);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return zodErrorHandler(error);
  }
}