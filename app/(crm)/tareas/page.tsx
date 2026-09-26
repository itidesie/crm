import Link from "next/link"
import { PartyPopper, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { TareaFila } from "@/components/contacto-acciones"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { cn } from "@/lib/utils"

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
      <PageHeader seccion="Operaciones" titulo="Tareas" descripcion="Seguimiento pendiente. Las de solicitudes y mensajes nuevos se crean solas al llegar por la web." />
      <div className="fade-up mb-5 inline-flex flex-wrap gap-1 rounded-2xl bg-foreground/[0.06] p-1" style={{ "--i": 1 } as React.CSSProperties}>
        {VISTAS.map(([v, l]) => (
          <Link key={v} href={`/tareas?vista=${v}`} data-testid={`vista-${v}`} aria-current={vista === v ? "page" : undefined}
            className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200", vista === v ? "bg-card text-foreground shadow-[0_1px_2px_oklch(0.2_0.03_265/0.14),0_0_0_1px_oklch(0.2_0.03_265/0.06)]" : "text-muted-foreground hover:text-foreground")}>{l}</Link>
        ))}
      </div>
      <div className="surface fade-up divide-y divide-border/70 px-6 py-2" data-testid="lista-tareas" style={{ "--i": 2 } as React.CSSProperties}>
        {(data ?? []).map((t: any) => (
          <div key={t.id} className="group flex items-center gap-3">
            <div className="flex-1"><TareaFila tarea={t} puedeEditar={puedeEscribir(usuario.rol)} /></div>
            {vista !== "mias" && t.asignado?.nombre && <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:inline-flex"><AvatarIniciales nombre={t.asignado.nombre} size="xs" />{t.asignado.nombre.split(" ")[0]}</span>}
            {t.contacto && (
              <Link href={`/contactos/${t.contacto.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.08] py-1 pr-2.5 pl-1 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white">
                <AvatarIniciales nombre={t.contacto.nombre} email={t.contacto.email_principal} size="xs" />
                <span className="max-w-36 truncate">{t.contacto.nombre ?? t.contacto.email_principal}</span><ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </div>
        ))}
        {(data ?? []).length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><PartyPopper className="size-6" /></span>
            <div className="font-display text-lg font-semibold">Todo al día</div>
            <p className="text-sm text-muted-foreground">No hay tareas en esta vista.</p>
          </div>
        )}
      </div>
    </>
  )
}
