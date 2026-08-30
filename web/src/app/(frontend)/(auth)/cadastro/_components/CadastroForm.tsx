"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

export function CadastroForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [bio, setBio] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    // Validação de conveniência: resposta rápida ao usuário.
    // A validação que VALE continua sendo a do backend (RN02).
    if (nome.trim().length < 3) {
      setErro("Nome deve ter pelo menos 3 caracteres");
      return;
    }
    if (senha.length < 8) {
      setErro("Senha deve ter pelo menos 8 caracteres");
      return;
    }

    setEnviando(true);
    try {
      const { error } = await authClient.signUp.email({
        name: nome.trim(),
        email: email.trim(),
        password: senha,
      });

      if (error) {
        // e-mail duplicado cai aqui (RN09)
        setErro(error.message ?? "Não foi possível criar a conta");
        return;
      }

      // A bio não faz parte do Better Auth: salva num segundo passo.
      if (bio.trim()) {
        await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: bio.trim() }),
        });
      }

      toast.success("Conta criada com sucesso");
      router.push("/painel");
      router.refresh();
    } catch {
      setErro("Erro inesperado. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
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
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border p-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Senha</span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={8}
          className="rounded-md border p-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="rounded-md border p-2"
        />
      </label>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {enviando ? "Criando..." : "Criar conta"}
      </button>

      <p className="text-sm text-gray-600">
        Já tem conta?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}