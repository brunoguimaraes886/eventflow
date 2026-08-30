import { notFound } from "next/navigation";

import { buscarPalestraPorId } from "@/backend/services/palestras";
import { buscarPerfil } from "@/backend/services/perfil";

type Props = { params: Promise<{ id: string }> };

export default async function DetalhePalestraPage({ params }: Props) {
  const { id } = await params;

  const palestra = await buscarPalestraPorId(id);

  // inexistente, removida ou não publicada -> 404 para o público
  if (!palestra || palestra.removidoEm || palestra.status !== "PUBLICADA") {
    notFound();
  }

  const autor = await buscarPerfil(palestra.autorId);

  return (
    <article className="flex flex-col gap-6">
      <div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">
          {palestra.tema}
        </span>
        <h1 className="mt-3 text-3xl font-semibold text-gray-900">{palestra.titulo}</h1>
        <p className="mt-1 text-sm text-gray-500">{palestra.duracao} minutos</p>
      </div>

      <p className="whitespace-pre-line text-gray-700">{palestra.descricao}</p>

      <div className="rounded-lg border bg-gray-50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Palestrante
        </h2>
        <p className="mt-2 text-lg font-medium text-gray-900">{palestra.autorNome}</p>
        {autor?.bio ? <p className="mt-2 text-sm text-gray-600">{autor.bio}</p> : null}
      </div>
    </article>
  );
}