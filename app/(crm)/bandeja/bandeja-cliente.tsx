"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Search, ChevronLeft, ChevronRight, Radio, X, Mail, Phone, CalendarDays, ArrowUpRight, Inbox } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { TipoIcono } from "@/components/tipo-icono"
import { EntradaDetalle } from "@/components/entrada-detalle"
import { createClient } from "@/lib/supabase/client"
import { ESTADOS_ENTRADA, TIPOS_ENTRADA, resumenEntrada, type Entrada, type UsuarioLista } from "@/lib/tipos"
import { fechaHora, hace } from "@/lib/format"
import { cn } from "@/lib/utils"
import { asignarEntrada, cambiarEstadoEntrada, marcarLeida } from "../acciones"

interface Filtros { tipo: string; estado: string; leida: string; desde: string; hasta: string; q: string }
const TODOS = "todos"
const CHIPS_ESTADO = [["", "Todas"], ["nueva", "Nuevas"], ["en_gestion", "En gestión"], ["gestionada", "Gestionadas"], ["descartada", "Descartadas"]] as const

export function BandejaCliente({ filas, total, pagina, porPagina, filtros, usuarios, puedeEscribir }: {
  filas: Entrada[]; total: number; pagina: number; porPagina: number; filtros: Filtros; usuarios: UsuarioLista[]; puedeEscribir: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pendiente, iniciar] = useTransition()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState(filtros.q)
  const [enVivo, setEnVivo] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entrada = filas.find((f) => f.id === abierta) ?? null

  const navegar = useCallback((cambios: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(cambios)) (v && v !== TODOS ? p.set(k, v) : p.delete(k))
    if (!("pagina" in cambios)) p.delete("pagina")
    router.push(`${pathname}?${p.toString()}`)
  }, [router, pathname, sp])

  // ── Tiempo real: cualquier cambio en crm.entradas refresca la lista (con los filtros actuales) ──
  useEffect(() => {
    const supabase = createClient()
    const refrescar = () => {
      if (temporizador.current) clearTimeout(temporizador.current)
      temporizador.current = setTimeout(() => router.refresh(), 300)
    }
    supabase.auth.getSession().then(({ data }) => { if (data.session) supabase.realtime.setAuth(data.session.access_token) })
    const canal = supabase
      .channel("bandeja-entradas")
      .on("postgres_changes", { event: "*", schema: "crm", table: "entradas" }, (cambio) => {
        if (cambio.eventType === "INSERT") toast.info("Nueva entrada en la bandeja", { description: "Acaba de llegar por la web." })
        refrescar()
      })
      .subscribe((estado) => setEnVivo(estado === "SUBSCRIBED"))
    // Latido: incorpora al CRM lo que llegue a la web sin esperar al cron (idempotente y barato).
    const latido = setInterval(() => { supabase.rpc("procesar_entradas") }, 15000)
    return () => { clearInterval(latido); if (temporizador.current) clearTimeout(temporizador.current); supabase.removeChannel(canal) }
  }, [router])

  useEffect(() => setBusqueda(filtros.q), [filtros.q])

  const accion = (fn: () => Promise<{ ok: boolean; error?: string }>, exito?: string) =>
    iniciar(async () => { const r = await fn(); if (!r.ok) toast.error(r.error); else if (exito) toast.success(exito); router.refresh() })

  const abrir = (e: Entrada) => {
    setAbierta(e.id)
    if (puedeEscribir && !e.leida_at) accion(() => marcarLeida(e.id, true))
  }

  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const hayFiltros = !!(filtros.tipo || filtros.estado || filtros.leida || filtros.desde || filtros.hasta || filtros.q)

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="glass fade-up sticky top-3 z-20 space-y-3 rounded-3xl p-3.5 lg:top-4" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-2.5">
          <form className="relative min-w-64 flex-1" onSubmit={(e) => { e.preventDefault(); navegar({ q: busqueda }) }}>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, email o teléfono…" className="h-11 pl-10" data-testid="buscar" />
          </form>
          <Select value={filtros.tipo || TODOS} onValueChange={(v) => navegar({ tipo: v })}>
            <SelectTrigger className="h-11 w-full sm:w-44" data-testid="filtro-tipo"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent><SelectItem value={TODOS}>Todos los tipos</SelectItem>
              {Object.entries(TIPOS_ENTRADA).filter(([k]) => k !== "cita").map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filtros.leida || TODOS} onValueChange={(v) => navegar({ leida: v })}>
            <SelectTrigger className="h-11 w-full sm:w-44"><SelectValue placeholder="Lectura" /></SelectTrigger>
            <SelectContent><SelectItem value={TODOS}>Leídas y no leídas</SelectItem><SelectItem value="no">No leídas</SelectItem><SelectItem value="si">Leídas</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap gap-1 rounded-xl bg-foreground/[0.06] p-1" role="group" aria-label="Estado" data-testid="filtro-estado">
            {CHIPS_ESTADO.map(([v, l]) => (
              <button key={v} type="button" onClick={() => navegar({ estado: v })} aria-pressed={filtros.estado === v}
                className={cn("h-8 rounded-lg px-3 text-[0.8rem] font-semibold transition-all duration-200", filtros.estado === v ? "bg-card text-foreground shadow-[0_1px_2px_oklch(0.2_0.03_265/0.14),0_0_0_1px_oklch(0.2_0.03_265/0.06)]" : "text-muted-foreground hover:text-foreground")}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <CalendarDays className="size-4 text-muted-foreground" />
            <Input type="date" value={filtros.desde} onChange={(e) => navegar({ desde: e.target.value })} className="h-9 min-w-0 flex-1 text-xs sm:w-[9.5rem] sm:flex-none" aria-label="Desde" />
            <span className="text-muted-foreground">→</span>
            <Input type="date" value={filtros.hasta} onChange={(e) => navegar({ hasta: e.target.value })} className="h-9 min-w-0 flex-1 text-xs sm:w-[9.5rem] sm:flex-none" aria-label="Hasta" />
          </div>
          {hayFiltros && <Button variant="ghost" size="sm" onClick={() => { setBusqueda(""); router.push(pathname) }}><X /> Limpiar filtros</Button>}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-muted-foreground" data-testid="total-entradas"><strong className="num text-base font-semibold text-foreground">{total}</strong> {total === 1 ? "entrada" : "entradas"}</span>
            <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset", enVivo ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-foreground/[0.05] text-muted-foreground ring-foreground/10")}
              data-testid="estado-realtime" data-vivo={enVivo}>
              <span className="relative flex size-2"><span className={cn("absolute inline-flex size-full rounded-full", enVivo ? "animate-ping bg-emerald-400/70" : "")} /><span className={cn("relative inline-flex size-2 rounded-full", enVivo ? "bg-emerald-500" : "bg-muted-foreground/50")} /></span>
              <Radio className="size-3.5" /> {enVivo ? "En vivo" : "Conectando…"}
            </span>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className={cn("surface fade-up overflow-hidden transition-opacity", pendiente && "opacity-70")} style={{ "--i": 2 } as React.CSSProperties}>
        <ul className="divide-y divide-border/70" data-testid="lista-entradas">
          {filas.map((e) => {
            const noLeida = !e.leida_at
            return (
              <li key={e.id} data-testid="fila-entrada" data-leida={!!noLeida ? "false" : "true"} className="relative">
                <button type="button" onClick={() => abrir(e)}
                  className={cn("group relative flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors duration-200 hover:bg-primary/[0.045] focus-visible:bg-primary/[0.06]", noLeida && "bg-primary/[0.035]")}>
                  {noLeida && <span aria-hidden className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full bg-primary shadow-[0_0_12px_rgb(0_108_255/0.7)]" />}
                  <TipoIcono tipo={e.tipo} className="transition-transform duration-300 group-hover:scale-105" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {noLeida && <span className="pulse-dot size-2 shrink-0 rounded-full bg-primary" title="No leída" />}
                      <span className={cn("truncate text-[0.95rem]", noLeida ? "font-bold" : "font-semibold")}>{e.contacto_nombre ?? "(sin nombre)"}</span>
                      {e.no_contactar && <Badge variant="destructive">No contactar</Badge>}
                    </div>
                    <div className="truncate text-[0.82rem] text-muted-foreground">{e.contacto_email} <span className="opacity-40">·</span> {resumenEntrada(e.tipo, e.payload)}</div>
                  </div>
                  <div className="hidden w-24 shrink-0 md:block">{e.programa ? <span className="eyebrow rounded-lg bg-foreground/[0.05] px-2.5 py-1.5 text-[0.65rem] text-foreground/70">{e.programa}</span> : <span className="text-muted-foreground/50">—</span>}</div>
                  <div className="hidden w-28 shrink-0 sm:block"><Badge variant={ESTADOS_ENTRADA[e.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[e.estado]?.label ?? e.estado}</Badge></div>
                  <div className="w-24 shrink-0 text-right text-xs whitespace-nowrap sm:w-36 text-muted-foreground" title={fechaHora(e.recibido_at)}>{hace(e.recibido_at)}</div>
                  <ChevronRight className="hidden size-4 shrink-0 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-primary sm:block" />
                </button>
              </li>
            )
          })}
        </ul>
        {filas.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-foreground/[0.05] text-muted-foreground"><Inbox className="size-6" /></span>
            <div className="font-display text-lg font-semibold">No hay entradas con estos filtros</div>
            <p className="text-sm text-muted-foreground">Prueba a quitar algún filtro o a buscar otra cosa.</p>
          </div>
        )}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Página <strong className="num text-foreground">{pagina}</strong> de {paginas}</span>
          <Button variant="outline" size="icon" className="size-9" disabled={pagina <= 1} onClick={() => navegar({ pagina: String(pagina - 1) })} aria-label="Anterior"><ChevronLeft /></Button>
          <Button variant="outline" size="icon" className="size-9" disabled={pagina >= paginas} onClick={() => navegar({ pagina: String(pagina + 1) })} aria-label="Siguiente"><ChevronRight /></Button>
        </div>
      )}

      {/* Detalle */}
      <Sheet open={!!entrada} onOpenChange={(o) => !o && setAbierta(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {entrada && (
            <>
              <SheetHeader className="gap-4 p-6 pb-2">
                <div className="flex items-center gap-2 pr-10">
                  <Badge variant={TIPOS_ENTRADA[entrada.tipo]?.color ?? "muted"}>{TIPOS_ENTRADA[entrada.tipo]?.label}</Badge>
                  {entrada.no_contactar && <Badge variant="destructive">No contactar</Badge>}
                </div>
                <div className="flex items-center gap-4">
                  <AvatarIniciales nombre={entrada.contacto_nombre} email={entrada.contacto_email} size="lg" />
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{entrada.contacto_nombre ?? entrada.contacto_email}</SheetTitle>
                    <SheetDescription className="mt-1 flex flex-col gap-0.5 text-[0.82rem]">
                      <span className="flex items-center gap-1.5"><Mail className="size-3.5" />{entrada.contacto_email}</span>
                      {entrada.contacto_telefono && <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{entrada.contacto_telefono}</span>}
                    </SheetDescription>
                  </div>
                </div>
                <div className="eyebrow text-[0.62rem] text-muted-foreground">Recibida · {fechaHora(entrada.recibido_at)}</div>
              </SheetHeader>
              <div className="space-y-5 px-6 pb-6">
                <EntradaDetalle tipo={entrada.tipo} payload={entrada.payload} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><div className="eyebrow text-[0.6rem] text-muted-foreground">Estado</div>
                    <Select value={entrada.estado} disabled={!puedeEscribir || pendiente} onValueChange={(v) => accion(() => cambiarEstadoEntrada(entrada.id, v), "Estado actualizado")}>
                      <SelectTrigger className="w-full" data-testid="detalle-estado"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ESTADOS_ENTRADA).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><div className="eyebrow text-[0.6rem] text-muted-foreground">Asignada a</div>
                    <Select value={entrada.asignado_a ?? "nadie"} disabled={!puedeEscribir || pendiente}
                      onValueChange={(v) => accion(() => asignarEntrada(entrada.id, v === "nadie" ? null : v), "Asignación actualizada")}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nadie">Sin asignar</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild><Link href={`/contactos/${entrada.contacto_id}`}>Ver ficha del contacto <ArrowUpRight /></Link></Button>
                  {puedeEscribir && <Button variant="outline" disabled={pendiente} onClick={() => accion(() => marcarLeida(entrada.id, !entrada.leida_at))}>{entrada.leida_at ? "Marcar como no leída" : "Marcar como leída"}</Button>}
                </div>
                {!puedeEscribir && <p className="rounded-xl bg-foreground/[0.04] p-3 text-xs text-muted-foreground">Tu rol es de solo lectura: puedes consultar pero no modificar.</p>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
