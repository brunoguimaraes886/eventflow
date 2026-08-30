import Link from "next/link";

import type { Palestra } from "@/generated/prisma";

export function CardPalestra({ palestra }: { palestra: Palestra }) {
  return (
    <Link
      href={`/palestras/${palestra.id}`}
      className="flex flex-col gap-3 rounded-lg border p-6 shadow-sm transition hover:shadow-md"
    >
      <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">
        {palestra.tema}
      </span>
      <h2 className="text-xl font-semibold text-gray-900">{palestra.titulo}</h2>
      <p className="line-clamp-2 text-sm text-gray-600">{palestra.descricao}</p>
      <p className="text-xs text-gray-500">
        {palestra.autorNome} &middot; {palestra.duracao} min
      </p>
    </Link>
  );
}