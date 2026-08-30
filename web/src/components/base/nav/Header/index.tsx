"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { authClient } from "@/lib/auth-client";

export function Header() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Sessão encerrada");
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          EventFlow
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {isPending ? (
            // enquanto carrega, um espaço reservado: evita piscar o menu errado
            <span className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          ) : session?.user ? (
            <>
              <Link href="/painel" className="text-gray-700 hover:text-gray-900">
                Meu painel
              </Link>
              <Link href="/painel/perfil" className="text-gray-700 hover:text-gray-900">
                Meu perfil
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-md border px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-gray-900">
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
              >
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}