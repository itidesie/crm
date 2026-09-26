import Link from "next/link"
import { Inbox, Clock, AlertTriangle, ListChecks, ArrowUpRight, ArrowRight, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { getUsuario } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { TipoIcono } from "@/components/tipo-icono"
import { TIPOS_ENTRADA } from "@/lib/tipos"
import { hace } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function InicioPage() {
  const usuario = await getUsuario()
  const supabase = await createClient()
  const ahora = new Date()
  const hace24h = new Date(ahora.getTime() - 24 * 3600 * 1000).toISOString()
  const hace14d = new Date(ahora.getTime() - 14 * 24 * 3600 * 1000)
  hace14d.setHours(0, 0, 0, 0)

  const [nuevas, sinAtender, vencidas, misPendientes, etapas, opps, recientes, serie, contactos, ultimas24] = await Promise.all([
    supabase.from("entradas").select("id", { count: "exact", head: true }).eq("estado", "nueva"),
    supabase.from("entradas").select("id", { count: "exact", head: true }).eq("estado", "nueva").lt("recibido_at", hace24h),
    supabase.from("tareas").select("id", { count: "exact", head: true }).is("completada_at", null).lt("vence_at", ahora.toISOString()),
    supabase.from("tareas").select("id", { count: "exact", head: true }).is("completada_at", null).eq("asignado_a", usuario.id),
    supabase.from("etapas").select("id, nombre, orden, tipo, pipelines!inner(codigo)").eq("pipelines.codigo", "admision").order("orden"),
    supabase.from("oportunidades").select("etapa_id, pipelines!inner(codigo)").eq("pipelines.codigo", "admision"),
    supabase.from("v_bandeja").select("id, tipo, contacto_nombre, contacto_email, recibido_at, estado, contacto_id, programa").order("recibido_at", { ascending: false }).limit(7),
    supabase.from("entradas").select("recibido_at").gte("recibido_at", hace14d.toISOString()).limit(2000),
    supabase.from("contactos").select("id", { count: "exact", head: true }),
    supabase.from("entradas").select("id", { count: "exact", head: true }).gte("recibido_at", hace24h),
  ])

  const porEtapa = new Map<string, number>()
  for (const o of opps.data ?? []) porEtapa.set(o.etapa_id, (porEtapa.get(o.etapa_id) ?? 0) + 1)
  const totalOpps = opps.data?.length ?? 0
  const maxEtapa = Math.max(1, ...(etapas.data ?? []).map((e) => porEtapa.get(e.id) ?? 0))

  // Serie de 14 días
  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hace14d); d.setDate(d.getDate() + i)
    return { d, clave: format(d, "yyyy-MM-dd"), n: 0 }
  })
  for (const r of serie.data ?? []) { const c = format(new Date(r.recibido_at), "yyyy-MM-dd"); const x = dias.find((y) => y.clave === c); if (x) x.n++ }
  const maxDia = Math.max(1, ...dias.map((d) => d.n))
  const totalSerie = dias.reduce((a, d) => a + d.n, 0)
  const hoy = format(ahora, "yyyy-MM-dd")

  const cNuevas = nuevas.count ?? 0, cVencidas = vencidas.count ?? 0
  const tarjetas = [
    { titulo: "Entradas nuevas", valor: cNuevas, icon: Inbox, href: "/bandeja?estado=nueva", tono: "text-blue-600", brillo: "bg-blue-500/20", nota: "Pendientes de gestionar" },
    { titulo: "Sin atender (+24 h)", valor: sinAtender.count ?? 0, icon: Clock, href: "/bandeja?estado=nueva", tono: "text-amber-600", brillo: "bg-amber-500/25", nota: "Llevan más de un día esperando" },
    { titulo: "Tareas vencidas", valor: cVencidas, icon: AlertTriangle, href: "/tareas?vista=vencidas", tono: "text-red-600", brillo: "bg-red-500/20", nota: "Requieren atención hoy" },
    { titulo: "Mis tareas pendientes", valor: misPendientes.count ?? 0, icon: ListChecks, href: "/tareas", tono: "text-emerald-600", brillo: "bg-emerald-500/20", nota: "Asignadas a ti" },
  ]

  return (
    <>
      {/* Portada */}
      <section className="fade-up relative mb-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,oklch(0.24_0.06_264),oklch(0.16_0.045_270)_55%,oklch(0.2_0.09_262))] p-7 text-white shadow-[0_30px_60px_-30px_oklch(0.2_0.08_264/0.8)] sm:p-10">
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -top-32 right-[8%] size-96 rounded-full bg-primary/45 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-10 size-80 rounded-full bg-[#ffba08]/15 blur-[90px]" />
        {/* Cubos isométricos decorativos (guiño al BIM) */}
        <svg aria-hidden viewBox="0 0 240 240" className="float-slow pointer-events-none absolute -top-4 right-4 hidden size-64 opacity-90 md:block" fill="none">
          <defs><linearGradient id="c1" x1="50" y1="30" x2="190" y2="190" gradientUnits="userSpaceOnUse"><stop stopColor="#4da0ff" stopOpacity=".55" /><stop offset="1" stopColor="#006cff" stopOpacity=".12" /></linearGradient></defs>
          <g stroke="white" strokeOpacity=".5" strokeWidth="1.2" strokeLinejoin="round">
            <path d="M120 30 190 70v80l-70 40-70-40V70l70-40Z" fill="url(#c1)" />
            <path d="M50 70l70 40 70-40M120 110v80" />
            <path d="M120 30v80L50 70l70-40Z" fill="white" fillOpacity=".12" />
          </g>
        </svg>
        <div className="relative max-w-2xl">
          <div className="eyebrow mb-5 flex items-center gap-2 text-[#8fc0ff]"><Sparkles className="size-3.5" />{format(ahora, "EEEE, d 'de' MMMM", { locale: es })}</div>
          <h1 className="font-display text-[clamp(2.4rem,1.6rem+3vw,4.2rem)] leading-[0.98] font-bold tracking-[-0.032em]">Hola, {usuario.nombre.split(" ")[0]}</h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-white/70">
            {cNuevas > 0
              ? <>Hay <strong className="font-semibold text-white">{cNuevas} {cNuevas === 1 ? "entrada nueva" : "entradas nuevas"}</strong> esperando</>
              : <>La bandeja está al día</>}
            {cVencidas > 0 ? <> y <strong className="font-semibold text-[#ffb4b4]">{cVencidas} {cVencidas === 1 ? "tarea vencida" : "tareas vencidas"}</strong>.</> : <>. Sin tareas vencidas.</>}
            {" "}En las últimas 24 h han llegado <strong className="font-semibold text-white">{ultimas24.count ?? 0}</strong> por la web.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/bandeja" className="group inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-ink shadow-[0_10px_30px_-10px_rgb(255_255_255/0.5)] transition hover:-translate-y-0.5">
              Abrir bandeja <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/tareas" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15">Mis tareas</Link>
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-8 border-t border-white/10 pt-6 sm:absolute sm:right-10 sm:bottom-8 sm:mt-0 sm:border-0 sm:pt-0">
          <div><div className="num text-3xl font-bold">{contactos.count ?? 0}</div><div className="eyebrow mt-1 text-[0.58rem] text-white/50">Contactos</div></div>
          <div><div className="num text-3xl font-bold">{totalOpps}</div><div className="eyebrow mt-1 text-[0.58rem] text-white/50">Admisiones abiertas</div></div>
        </div>
      </section>

      {/* Indicadores */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ titulo, valor, icon: Icon, href, tono, brillo, nota }, i) => (
          <Link key={titulo} href={href} style={{ "--i": i + 2 } as React.CSSProperties} className="fade-up group">
            <div className="surface surface-lift relative h-full overflow-hidden p-5">
              <div aria-hidden className={`pointer-events-none absolute -top-10 -right-10 size-32 rounded-full ${brillo} blur-2xl`} />
              <div className="relative flex items-start justify-between">
                <span className={`flex size-10 items-center justify-center rounded-xl ${tono}`} style={{ backgroundColor: "color-mix(in oklab, currentColor 12%, transparent)" }}><Icon className="size-5" /></span>
                <ArrowUpRight className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
              <div className="num relative mt-6 text-[3.25rem] leading-none font-bold" data-testid={`contador-${titulo}`}>{valor}</div>
              <div className="relative mt-2 text-sm font-semibold">{titulo}</div>
              <div className="relative text-xs text-muted-foreground">{nota}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          {/* Actividad 14 días */}
          <section className="surface fade-up p-6" style={{ "--i": 6 } as React.CSSProperties}>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">Actividad de la web</h2>
                <p className="text-sm text-muted-foreground">Entradas recibidas en los últimos 14 días</p>
              </div>
              <div className="text-right"><div className="num text-3xl leading-none font-bold">{totalSerie}</div><div className="eyebrow mt-1 text-[0.58rem] text-muted-foreground">Total</div></div>
            </div>
            <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label={`Entradas por día: ${dias.map((d) => d.n).join(", ")}`}>
              {dias.map((d, i) => {
                const h = Math.max(4, (d.n / maxDia) * 100)
                const esHoy = d.clave === hoy
                return (
                  <div key={d.clave} className="group/b flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="num text-[0.7rem] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover/b:opacity-100">{d.n}</span>
                    <div style={{ height: `${h}%`, "--i": i } as React.CSSProperties} title={`${format(d.d, "d MMM", { locale: es })}: ${d.n}`}
                      className={`bar-grow w-full rounded-t-lg transition-[filter] duration-300 group-hover/b:brightness-110 ${esHoy ? "bg-gradient-to-t from-primary-deep to-[#3a8dff] shadow-[0_0_24px_-2px_rgb(0_108_255/0.6)]" : d.n === 0 ? "bg-foreground/[0.07]" : "bg-gradient-to-t from-primary/35 to-primary/70"}`} />
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex gap-1.5 sm:gap-2">
              {dias.map((d) => <span key={d.clave} className={`eyebrow flex-1 text-center text-[0.5rem] tracking-normal ${d.clave === hoy ? "text-primary" : "text-muted-foreground/70"}`}>{format(d.d, "d", { locale: es })}</span>)}
            </div>
          </section>

          {/* Embudo de admisión */}
          <section className="surface fade-up p-6" style={{ "--i": 7 } as React.CSSProperties}>
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="font-display text-lg font-semibold tracking-tight">Admisiones por estado</h2><p className="text-sm text-muted-foreground">{totalOpps} oportunidades en el pipeline</p></div>
              <Link href="/admision" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Ver pipeline <ArrowRight className="size-4" /></Link>
            </div>
            <div className="space-y-3">
              {(etapas.data ?? []).map((e, i) => {
                const n = porEtapa.get(e.id) ?? 0
                return (
                  <div key={e.id} className="flex items-center gap-3 text-sm">
                    <div className="w-44 shrink-0 truncate text-muted-foreground">{e.nombre}</div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                      <div style={{ width: `${(n / maxEtapa) * 100}%`, "--i": i } as React.CSSProperties}
                        className={`fill-x h-full rounded-full ${e.tipo === "ganada" ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : e.tipo === "perdida" ? "bg-gradient-to-r from-slate-300 to-slate-400" : "bg-gradient-to-r from-[#5aa9ff] to-primary"}`} />
                    </div>
                    <div className="num w-6 text-right text-base font-semibold" data-testid={`etapa-${e.nombre}`}>{n}</div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Últimas entradas */}
        <section className="surface fade-up p-2 xl:col-span-2" style={{ "--i": 8 } as React.CSSProperties}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div><h2 className="font-display text-lg font-semibold tracking-tight">Últimas entradas</h2><p className="text-sm text-muted-foreground">Lo que acaba de llegar</p></div>
            <Link href="/bandeja" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Bandeja <ArrowRight className="size-4" /></Link>
          </div>
          <div>
            {(recientes.data ?? []).map((e) => (
              <Link key={e.id} href={`/contactos/${e.contacto_id}`} className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-primary/[0.06]">
                <TipoIcono tipo={e.tipo} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{e.contacto_nombre ?? e.contacto_email}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{TIPOS_ENTRADA[e.tipo]?.label ?? e.tipo}</span>{e.programa && <><span className="opacity-40">·</span><span>{e.programa}</span></>}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-xs text-muted-foreground">{hace(e.recibido_at)}</span>
                  {e.estado === "nueva" && <Badge variant="info">Nueva</Badge>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
