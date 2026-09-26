import { getUsuario } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/app-shell"

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuario()
  const supabase = await createClient()
  const [nuevas, vencidas] = await Promise.all([
    supabase.from("entradas").select("id", { count: "exact", head: true }).eq("estado", "nueva"),
    supabase.from("tareas").select("id", { count: "exact", head: true }).is("completada_at", null).lt("vence_at", new Date().toISOString()),
  ])
  return (
    <AppShell datos={{ usuario: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }, nuevas: nuevas.count ?? 0, vencidas: vencidas.count ?? 0 }}>
      {children}
    </AppShell>
  )
}
