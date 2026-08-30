"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";
import type { Palestra } from "@/generated/prisma";
import { removerPalestra } from "../_actions/palestras";

const CORES_STATUS: Record<string, string> = {
  RASCUNHO: "bg-gray-100 text-gray-700",
  PUBLICADA: "bg-green-100 text-green-800",
  ARQUIVADA: "bg-amber-100 text-amber-800",
};

export function CardMinhaPalestra({ palestra }: { palestra: Palestra }) {
  const router = useRouter();
  const [removendo, setRemovendo] = useState(false);

  async function handleRemover() {
    if (!confirm(`Remover "${palestra.titulo}"? A palestra sai da vitrine.`)) return;

    setRemovendo(true);
    try {
      await removerPalestra(palestra.id);
      toast.success("Palestra removida");
      router.refresh();
    } catch (error: unknown) {
      const mensagem = error instanceof Error ? error.message : "Erro ao remover";
      toast.error(mensagem);
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{palestra.titulo}</h2>
        <span className={`rounded-full px-3 py-1 text-xs ${CORES_STATUS[palestra.status]}`}>
          {palestra.status}
        </span>
      </div>

      <p className="text-sm text-gray-600">
        {palestra.tema} &middot; {palestra.duracao} min
      </p>

      <div className="flex gap-2">
        <Link
          href={`/painel/palestras/${palestra.id}`}
          className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <Pencil className="h-4 w-4" /> Editar
        </Link>
        <button
          onClick={handleRemover}
          disabled={removendo}
          className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" /> {removendo ? "Removendo..." : "Remover"}
        </button>
      </div>
    </div>
  );
}