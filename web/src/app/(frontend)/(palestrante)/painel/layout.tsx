import Link from "next/link";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-4 border-b pb-3 text-sm">
        <Link href="/painel" className="text-gray-700 hover:text-blue-600">
          Minhas palestras
        </Link>
        <Link href="/painel/perfil" className="text-gray-700 hover:text-blue-600">
          Meu perfil
        </Link>
      </nav>
      {children}
    </div>
  );
}