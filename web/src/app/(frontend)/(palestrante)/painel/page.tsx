import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { listarPorAutor, contarAtivasDoAutor } from "@/backend/services/palestras";
import type { StatusPalestra } from "@/generated/prisma";
import { FiltroStatus, CardMinhaPalestra } from "./_components";

const LIMITE_ATIVAS = 3;
const STATUS_VALIDOS = ["RASCUNHO", "PUBLICADA", "ARQUIVADA"];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function PainelPage({ searchParams }: Props) {
  // sessão no servidor: o proxy.ts já barra, mas a página não confia nisso
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const { status: statusBruto } = await searchParams;
  const status = STATUS_VALIDOS.includes(statusBruto ?? "")
    ? (statusBruto as StatusPalestra)
    : undefined;

  const [palestras, ativas] = await Promise.all([
    listarPorAutor(session.user.id, status),
    contarAtivasDoAutor(session.user.id),
  ]);

  const atingiuLimite = ativas >= LIMITE_ATIVAS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Minhas palestras</h1>
          <p className="mt-1 text-sm text-gray-600">
            {ativas} de {LIMITE_ATIVAS} palestras ativas
          </p>
        </div>

        {!atingiuLimite && (
          <Link
            href="/painel/palestras/nova"
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Nova palestra
          </Link>
        )}
      </div>

      {atingiuLimite && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Você atingiu o limite de {LIMITE_ATIVAS} palestras ativas. Arquive ou remova
          uma para criar outra.
        </p>
      )}

      <FiltroStatus />

      {palestras.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-gray-500">
          Nenhuma palestra encontrada.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {palestras.map((palestra) => (
            <CardMinhaPalestra key={palestra.id} palestra={palestra} />
          ))}
        </div>
      )}
    </div>
  );
}