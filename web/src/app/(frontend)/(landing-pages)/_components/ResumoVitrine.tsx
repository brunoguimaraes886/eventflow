type Props = { total: number; duracaoMedia: number };

export function ResumoVitrine({ total, duracaoMedia }: Props) {
  return (
    <div className="mb-8 flex gap-8 rounded-lg border bg-gray-50 p-6">
      <div>
        <p className="text-3xl font-semibold text-gray-900">{total}</p>
        <p className="text-sm text-gray-600">
          {total === 1 ? "palestra publicada" : "palestras publicadas"}
        </p>
      </div>
      <div>
        <p className="text-3xl font-semibold text-gray-900">{duracaoMedia} min</p>
        <p className="text-sm text-gray-600">duração média</p>
      </div>
    </div>
  );
}