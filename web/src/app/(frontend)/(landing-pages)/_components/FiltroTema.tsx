"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FiltroTema({ temas }: { temas: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const temaAtual = searchParams.get("tema") ?? "";

  function handleChange(tema: string) {
    // monta a query string nova preservando o que já existia
    const params = new URLSearchParams(searchParams.toString());
    if (tema) {
      params.set("tema", tema);
    } else {
      params.delete("tema");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-600">Tema:</span>
      <button
        onClick={() => handleChange("")}
        className={`rounded-full px-3 py-1 text-sm ${
          temaAtual === "" ? "bg-blue-600 text-white" : "border text-gray-700"
        }`}
      >
        Todos
      </button>
      {temas.map((tema) => (
        <button
          key={tema}
          onClick={() => handleChange(tema)}
          className={`rounded-full px-3 py-1 text-sm ${
            temaAtual === tema ? "bg-blue-600 text-white" : "border text-gray-700"
          }`}
        >
          {tema}
        </button>
      ))}
    </div>
  );
}