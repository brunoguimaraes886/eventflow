import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Página não encontrada</h1>
      <p className="text-gray-600">O conteúdo que você procura não existe ou foi removido.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Voltar para a vitrine
      </Link>
    </div>
  );
}