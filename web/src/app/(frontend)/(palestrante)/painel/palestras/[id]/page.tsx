import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { buscarPalestraPorId } from "@/backend/services/palestras";
import { FormularioPalestra } from "../../_components";

type Props = { params: Promise<{ id: string }> };

export default async function EditarPalestraPage({ params }: Props) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const palestra = await buscarPalestraPorId(id);
  if (!palestra || palestra.removidoEm) notFound();

  // OWNERSHIP também na tela: não renderiza o formulário de outra pessoa.
  // Isto NÃO substitui o 403 da rota — soma-se a ele.
  if (palestra.autorId !== session.user.id) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Editar palestra</h1>
      <FormularioPalestra palestra={palestra} />
    </div>
  );
}