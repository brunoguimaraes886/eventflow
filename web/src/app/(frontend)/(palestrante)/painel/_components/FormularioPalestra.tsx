"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Palestra } from "@/generated/prisma";
import { criarPalestra, atualizarPalestra } from "../_actions/palestras";

const TEMAS = ["Qualidade", "Arquitetura", "Carreira", "Dados", "Produto", "Segurança"];

export function FormularioPalestra({ palestra }: { palestra?: Palestra }) {
  const router = useRouter();
  const editando = Boolean(palestra);

  const [titulo, setTitulo] = useState(palestra?.titulo ?? "");
  const [tema, setTema] = useState(palestra?.tema ?? TEMAS[0]);
  const [descricao, setDescricao] = useState(palestra?.descricao ?? "");
  const [duracao, setDuracao] = useState(String(palestra?.duracao ?? 45));
  const [status, setStatus] = useState(palestra?.status ?? "RASCUNHO");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    // Number() porque o input devolve texto e o schema Zod espera número
    const dados = {
      titulo: titulo.trim(),
      tema,
      descricao: descricao.trim(),
      duracao: Number(duracao),
    };

    try {
      if (palestra) {
        await atualizarPalestra(palestra.id, { ...dados, status });
        toast.success("Palestra atualizada");
      } else {
        await criarPalestra(dados);
        toast.success("Palestra criada");
      }
      router.push("/painel");
      router.refresh();
    } catch (error: unknown) {
      // aqui chega a mensagem do backend, inclusive a do limite (RF15)
      const mensagem = error instanceof Error ? error.message : "Erro ao salvar";
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Título</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          className="rounded-md border p-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Tema</span>
        <select
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          className="rounded-md border p-2"
        >
          {TEMAS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Descrição</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={5}
          required
          className="rounded-md border p-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Duração (minutos)</span>
        <input
          type="number"
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
          min={5}
          max={240}
          required
          className="w-32 rounded-md border p-2"
        />
      </label>

      {editando && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Palestra["status"])}
            className="w-48 rounded-md border p-2"
          >
            <option value="RASCUNHO">Rascunho</option>
            <option value="PUBLICADA">Publicada</option>
            <option value="ARQUIVADA">Arquivada</option>
          </select>
        </label>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Criar palestra"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/painel")}
          className="rounded-md border px-4 py-2 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}