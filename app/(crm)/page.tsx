import Link from "next/link"
import { Inbox, Clock, AlertTriangle, ListChecks } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUsuario } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TIPOS_ENTRADA } from "@/lib/tipos"
import { hace } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function InicioPage() {
  const usuario = await getUsuario()
  const supabase = await createClient()
  const ahora = new Date()
  const hace24h = new Date(ahora.getTime() - 24 * 3600 * 1000).toISOString()

  const [nuevas, sinAtender, vencidas, misPendientes, etapas, opps, recientes] = await Promise.all([
    supabase.from("entradas").select("id", { count: "exact", head: true }).eq("estado", "nueva"),
    supabase.from("entradas").select("id", { count: "exact", head: true }).eq("estado", "nueva").lt("recibido_at", hace24h),
    supabase.from("tareas").select("id", { count: "exact", head: true }).is("completada_at", null).lt("vence_at", ahora.toISOString()),
    supabase.from("tareas").select("id", { count: "exact", head: true }).is("completada_at", null).eq("asignado_a", usuario.id),
    supabase.from("etapas").select("id, nombre, orden, tipo, pipelines!inner(codigo)").eq("pipelines.codigo", "admision").order("orden"),
    supabase.from("oportunidades").select("etapa_id, pipelines!inner(codigo)").eq("pipelines.codigo", "admision"),
    supabase.from("v_bandeja").select("id, tipo, contacto_nombre, contacto_email, recibido_at, estado, contacto_id").order("recibido_at", { ascending: false }).limit(8),
  ])

  const porEtapa = new Map<string, number>()
  for (const o of opps.data ?? []) porEtapa.set(o.etapa_id, (porEtapa.get(o.etapa_id) ?? 0) + 1)
  const totalOpps = opps.data?.length ?? 0

  const tarjetas = [
    { titulo: "Entradas nuevas", valor: nuevas.count ?? 0, icon: Inbox, href: "/bandeja?estado=nueva", tono: "text-primary bg-primary/10" },
    { titulo: "Sin atender (+24 h)", valor: sinAtender.count ?? 0, icon: Clock, href: "/bandeja?estado=nueva", tono: "text-amber-600 bg-amber-100" },
    { titulo: "Tareas vencidas", valor: vencidas.count ?? 0, icon: AlertTriangle, href: "/tareas?vista=vencidas", tono: "text-red-600 bg-red-100" },
    { titulo: "Mis tareas pendientes", valor: misPendientes.count ?? 0, icon: ListChecks, href: "/tareas", tono: "text-emerald-600 bg-emerald-100" },
  ]

  return (
    <>
      <PageHeader titulo={`Hola, ${usuario.nombre.split(" ")[0]}`} descripcion="Resumen de lo que ha entrado por la web y del trabajo pendiente." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ titulo, valor, icon: Icon, href, tono }) => (
          <Link key={titulo} href={href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 items-center justify-center rounded-lg ${tono}`}><Icon className="size-5" /></div>
                <div>
                  <div className="text-3xl font-semibold leading-none" data-testid={`contador-${titulo}`}>{valor}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{titulo}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Últimas entradas</CardTitle>
            <Link href="/bandeja" className="text-sm text-primary hover:underline">Ver bandeja</Link></CardHeader>
          <CardContent className="divide-y p-0">
            {(recientes.data ?? []).map((e) => (
              <Link key={e.id} href={`/contactos/${e.contacto_id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50">
                <Badge variant={TIPOS_ENTRADA[e.tipo]?.color ?? "muted"}>{TIPOS_ENTRADA[e.tipo]?.label ?? e.tipo}</Badge>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{e.contacto_nombre ?? e.contacto_email}</div>
                  <div className="truncate text-xs text-muted-foreground">{e.contacto_email}</div></div>
                <div className="text-xs text-muted-foreground">{hace(e.recibido_at)}</div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Admisiones por estado</CardTitle>
            <Link href="/admision" className="text-sm text-primary hover:underline">Ver pipeline</Link></CardHeader>
          <CardContent className="space-y-2.5">
            {(etapas.data ?? []).map((e) => {
              const n = porEtapa.get(e.id) ?? 0
              return (
                <div key={e.id} className="flex items-center gap-3 text-sm">
                  <div className="w-44 shrink-0 truncate text-muted-foreground">{e.nombre}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${e.tipo === "ganada" ? "bg-emerald-500" : e.tipo === "perdida" ? "bg-slate-400" : "bg-primary"}`}
                      style={{ width: `${totalOpps ? (n / totalOpps) * 100 : 0}%` }} />
                  </div>
                  <div className="w-6 text-right font-medium" data-testid={`etapa-${e.nombre}`}>{n}</div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
