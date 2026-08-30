"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { atualizarPerfil, removerPerfil } from "../_actions/perfil";

type Perfil = { name: string; email: string; bio: string | null };

export function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const [nome, setNome] = useState(perfil.name);
  const [bio, setBio] = useState(perfil.bio ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await atualizarPerfil({ name: nome.trim(), bio: bio.trim() });
      toast.success("Perfil atualizado");
      router.refresh();
    } catch (error: unknown) {
      const mensagem = error instanceof Error ? error.message : "Erro ao salvar";
      setErro(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    const confirmacao = prompt(
      "Isto remove a sua conta e todas as suas palestras. Digite REMOVER para confirmar.",
    );
    if (confirmacao !== "REMOVER") return;

    setRemovendo(true);
    try {
      // A ORDEM IMPORTA: primeiro remove, depois desloga.
      await removerPerfil();
      await authClient.signOut();
      toast.success("Conta removida");
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      const mensagem = error instanceof Error ? error.message : "Erro ao remover conta";
      toast.error(mensagem);
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="rounded-md border p-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">E-mail</span>
          <input
            value={perfil.email}
            disabled
            className="rounded-md border bg-gray-100 p-2 text-gray-500"
          />
          <span className="text-xs text-gray-500">
            O e-mail identifica a sua conta e não pode ser alterado aqui.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            className="rounded-md border p-2"
          />
        </label>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="rounded-lg border border-red-200 p-6">
        <h2 className="text-sm font-semibold text-red-800">Remover conta</h2>
        <p className="mt-1 text-sm text-gray-600">
          A remoção é reversível no banco, mas você perde o acesso imediatamente.
        </p>
        <button
          type="button"
          onClick={handleRemover}
          disabled={removendo}
          className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {removendo ? "Removendo..." : "Remover minha conta"}
        </button>
      </div>
    </div>
  );
}