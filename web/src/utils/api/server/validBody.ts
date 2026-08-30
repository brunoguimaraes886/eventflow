import { NextRequest, NextResponse } from "next/server";

   
export async function validBody(request: NextRequest) {
  try {
    const body = await request.json();
    return body;
   
  } catch (e) {
    throw NextResponse.json(
      { error: 'Formato de dados inválido - JSON malformado' },
      { status: 400 }
    )
  }
}