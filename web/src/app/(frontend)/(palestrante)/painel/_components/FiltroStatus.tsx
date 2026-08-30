"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPCOES = [
  { valor: "", rotulo: "Todas" },
  { valor: "RASCUNHO", rotulo: "Rascunhos" },
  { valor: "PUBLICADA", rotulo: "Publicadas" },
  { valor: "ARQUIVADA", rotulo: "Arquivadas" },
];

export function FiltroStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const atual = searchParams.get("status") ?? "";

  function selecionar(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set("status", valor);
    else params.delete("status");
    router.push(`/painel?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPCOES.map((opcao) => (
        <button
          key={opcao.valor || "todas"}
          onClick={() => selecionar(opcao.valor)}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            atual === opcao.valor
              ? "border-blue-600 bg-blue-600 text-white"
              : "hover:bg-gray-50"
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}