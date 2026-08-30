"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        // mensagem genérica DE PROPÓSITO: não revela se o e-mail existe
        setErro("E-mail ou senha inválidos");
        return;
      }

      toast.success("Bem-vindo de volta");
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
          className="rounded-md border p-2"
        />
      </label>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-sm text-gray-600">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-blue-600 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}