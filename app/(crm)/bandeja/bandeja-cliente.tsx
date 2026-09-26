"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Search, ChevronLeft, ChevronRight, Radio } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EntradaDetalle } from "@/components/entrada-detalle"
import { createClient } from "@/lib/supabase/client"
import { ESTADOS_ENTRADA, TIPOS_ENTRADA, type Entrada, type UsuarioLista } from "@/lib/tipos"
import { fechaHora, hace } from "@/lib/format"
import { asignarEntrada, cambiarEstadoEntrada, marcarLeida } from "../acciones"

interface Filtros { tipo: string; estado: string; leida: string; desde: string; hasta: string; q: string }
const TODOS = "todos"

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <form className="relative min-w-64 flex-1" onSubmit={(e) => { e.preventDefault(); navegar({ q: busqueda }) }}>
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, email o teléfono…" className="pl-9" data-testid="buscar" />
        </form>
        <Select value={filtros.tipo || TODOS} onValueChange={(v) => navegar({ tipo: v })}>
          <SelectTrigger className="w-40" data-testid="filtro-tipo"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent><SelectItem value={TODOS}>Todos los tipos</SelectItem>
            {Object.entries(TIPOS_ENTRADA).filter(([k]) => k !== "cita").map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtros.estado || TODOS} onValueChange={(v) => navegar({ estado: v })}>
          <SelectTrigger className="w-36" data-testid="filtro-estado"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent><SelectItem value={TODOS}>Todos los estados</SelectItem>
            {Object.entries(ESTADOS_ENTRADA).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtros.leida || TODOS} onValueChange={(v) => navegar({ leida: v })}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Lectura" /></SelectTrigger>
          <SelectContent><SelectItem value={TODOS}>Leídas y no leídas</SelectItem><SelectItem value="no">No leídas</SelectItem><SelectItem value="si">Leídas</SelectItem></SelectContent>
        </Select>
        <Input type="date" value={filtros.desde} onChange={(e) => navegar({ desde: e.target.value })} className="w-38" aria-label="Desde" />
        <Input type="date" value={filtros.hasta} onChange={(e) => navegar({ hasta: e.target.value })} className="w-38" aria-label="Hasta" />
        {(filtros.tipo || filtros.estado || filtros.leida || filtros.desde || filtros.hasta || filtros.q) && (
          <Button variant="ghost" size="sm" onClick={() => { setBusqueda(""); router.push(pathname) }}>Limpiar</Button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span data-testid="total-entradas">{total} {total === 1 ? "entrada" : "entradas"}</span>
        <span className={`inline-flex items-center gap-1.5 ${enVivo ? "text-emerald-600" : ""}`} data-testid="estado-realtime" data-vivo={enVivo}>
          <Radio className="size-3.5" /> {enVivo ? "En vivo" : "Conectando…"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="w-6 py-2.5 pl-4" /><th className="px-3 py-2.5">Tipo</th><th className="px-3 py-2.5">Contacto</th><th className="px-3 py-2.5">Programa</th><th className="px-3 py-2.5">Estado</th><th className="px-3 py-2.5 pr-4 text-right">Recibida</th></tr>
          </thead>
          <tbody className="divide-y" data-testid="lista-entradas">
            {filas.map((e) => (
              <tr key={e.id} onClick={() => abrir(e)} data-testid="fila-entrada" data-leida={!!e.leida_at}
                className={`cursor-pointer hover:bg-muted/40 ${!e.leida_at ? "bg-primary/[0.03] font-medium" : ""}`}>
                <td className="py-3 pl-4">{!e.leida_at && <span className="block size-2 rounded-full bg-primary" title="No leída" />}</td>
                <td className="px-3 py-3"><Badge variant={TIPOS_ENTRADA[e.tipo]?.color ?? "muted"}>{TIPOS_ENTRADA[e.tipo]?.label ?? e.tipo}</Badge></td>
                <td className="px-3 py-3"><div>{e.contacto_nombre ?? "(sin nombre)"}</div><div className="text-xs font-normal text-muted-foreground">{e.contacto_email}</div></td>
                <td className="px-3 py-3 font-normal">{e.programa ?? "—"}</td>
                <td className="px-3 py-3"><Badge variant={ESTADOS_ENTRADA[e.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[e.estado]?.label ?? e.estado}</Badge></td>
                <td className="px-3 py-3 pr-4 text-right font-normal text-muted-foreground" title={fechaHora(e.recibido_at)}>{hace(e.recibido_at)}</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No hay entradas con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Página {pagina} de {paginas}</span>
          <Button variant="outline" size="icon" disabled={pagina <= 1} onClick={() => navegar({ pagina: String(pagina - 1) })}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" disabled={pagina >= paginas} onClick={() => navegar({ pagina: String(pagina + 1) })}><ChevronRight /></Button>
        </div>
      )}

      <Sheet open={!!entrada} onOpenChange={(o) => !o && setAbierta(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {entrada && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2"><Badge variant={TIPOS_ENTRADA[entrada.tipo]?.color ?? "muted"}>{TIPOS_ENTRADA[entrada.tipo]?.label}</Badge>
                  {entrada.no_contactar && <Badge variant="destructive">No contactar</Badge>}</div>
                <SheetTitle>{entrada.contacto_nombre ?? entrada.contacto_email}</SheetTitle>
                <SheetDescription>{entrada.contacto_email}{entrada.contacto_telefono ? ` · ${entrada.contacto_telefono}` : ""} · {fechaHora(entrada.recibido_at)}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <EntradaDetalle tipo={entrada.tipo} payload={entrada.payload} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><div className="text-xs font-medium text-muted-foreground">Estado</div>
                    <Select value={entrada.estado} disabled={!puedeEscribir || pendiente} onValueChange={(v) => accion(() => cambiarEstadoEntrada(entrada.id, v), "Estado actualizado")}>
                      <SelectTrigger className="w-full" data-testid="detalle-estado"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ESTADOS_ENTRADA).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><div className="text-xs font-medium text-muted-foreground">Asignada a</div>
                    <Select value={entrada.asignado_a ?? "nadie"} disabled={!puedeEscribir || pendiente}
                      onValueChange={(v) => accion(() => asignarEntrada(entrada.id, v === "nadie" ? null : v), "Asignación actualizada")}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nadie">Sin asignar</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild><Link href={`/contactos/${entrada.contacto_id}`}>Ver ficha del contacto</Link></Button>
                  {puedeEscribir && <Button variant="outline" disabled={pendiente} onClick={() => accion(() => marcarLeida(entrada.id, !entrada.leida_at))}>{entrada.leida_at ? "Marcar como no leída" : "Marcar como leída"}</Button>}
                </div>
                {!puedeEscribir && <p className="text-xs text-muted-foreground">Tu rol es de solo lectura: puedes consultar pero no modificar.</p>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
