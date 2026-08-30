import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { buscarPerfil } from "@/backend/services/perfil";
import { FormularioPerfil } from "../_components";

export default async function PerfilPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const perfil = await buscarPerfil(session.user.id);
  if (!perfil) redirect("/login");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Meu perfil</h1>
      <FormularioPerfil
        perfil={{ name: perfil.name, email: perfil.email, bio: perfil.bio }}
      />
    </div>
  );
}