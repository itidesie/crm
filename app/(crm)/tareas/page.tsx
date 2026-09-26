import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { TareaFila } from "@/components/contacto-acciones"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

const VISTAS = [["mias", "Mis tareas"], ["vencidas", "Vencidas"], ["todas", "Todas las pendientes"], ["hechas", "Completadas"]] as const

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista = "mias" } = await searchParams
  const usuario = await getUsuario()
  const supabase = await createClient()
  let consulta = supabase.from("tareas")
    .select("id, titulo, vence_at, completada_at, contacto:contactos(id, nombre, email_principal), asignado:usuarios!tareas_asignado_a_fkey(nombre)")
  if (vista === "hechas") consulta = consulta.not("completada_at", "is", null).order("completada_at", { ascending: false }).limit(50)
  else {
    consulta = consulta.is("completada_at", null).order("vence_at", { nullsFirst: false })
    if (vista === "mias") consulta = consulta.eq("asignado_a", usuario.id)
    if (vista === "vencidas") consulta = consulta.lt("vence_at", new Date().toISOString())
  }
  const { data } = await consulta

  return (
    <>
      <PageHeader titulo="Tareas" descripcion="Seguimiento pendiente. Las de solicitudes y mensajes nuevos se crean solas al llegar por la web." />
      <div className="mb-4 flex gap-1 rounded-lg border bg-card p-1 w-fit">
        {VISTAS.map(([v, l]) => <Link key={v} href={`/tareas?vista=${v}`} data-testid={`vista-${v}`} className={`rounded-md px-3 py-1.5 text-sm ${vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{l}</Link>)}
      </div>
      <div className="divide-y rounded-lg border bg-card px-5" data-testid="lista-tareas">
        {(data ?? []).map((t: any) => (
          <div key={t.id} className="flex items-center gap-3">
            <div className="flex-1"><TareaFila tarea={t} puedeEditar={puedeEscribir(usuario.rol)} /></div>
            {t.contacto && <Link href={`/contactos/${t.contacto.id}`} className="text-sm text-primary hover:underline">{t.contacto.nombre ?? t.contacto.email_principal}</Link>}
            {vista !== "mias" && t.asignado?.nombre && <Badge variant="muted">{t.asignado.nombre.split(" ")[0]}</Badge>}
          </div>
        ))}
        {(data ?? []).length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No hay tareas en esta vista. 🎉</p>}
      </div>
    </>
  )
}
