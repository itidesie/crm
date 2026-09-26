import { getUsuario } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/sidebar"

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuario()
  const supabase = await createClient()
  const { count } = await supabase.from("entradas").select("id", { count: "exact", head: true }).eq("estado", "nueva")
  return (
    <div className="min-h-screen">
      <Sidebar usuario={usuario} nuevas={count ?? 0} />
      <main className="ml-60 min-h-screen">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
