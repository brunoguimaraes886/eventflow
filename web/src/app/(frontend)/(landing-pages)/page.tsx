import { listarPublicadas, resumoDaVitrine } from "@/backend/services/palestras";

import { ResumoVitrine, FiltroTema, CardPalestra } from "./_components";

type Props = { searchParams: Promise<{ tema?: string }> };

export default async function VitrinePage({ searchParams }: Props) {
  // no Next 15+, searchParams também é Promise e precisa de await
  const { tema } = await searchParams;

  // chama o service DIRETO, sem passar pela API: isto é código de servidor.
  // É o reaproveitamento que a arquitetura em camadas viabiliza.
  const [palestras, resumo, todas] = await Promise.all([
    listarPublicadas({ tema }),
    resumoDaVitrine(),
    listarPublicadas({}),
  ]);

  // temas distintos, sem repetição e sem for (RNF06)
  const temas = [...new Set(todas.map((p) => p.tema))].sort();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold text-gray-900">Palestras</h1>

      <ResumoVitrine total={resumo.total} duracaoMedia={resumo.duracaoMedia} />
      <FiltroTema temas={temas} />

      {palestras.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-gray-500">
          Nenhuma palestra encontrada
          {tema ? ` no tema "${tema}"` : ""}.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {palestras.map((palestra) => (
            <CardPalestra key={palestra.id} palestra={palestra} />
          ))}
        </div>
      )}
    </div>
  );
}