"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, Loader2, Plus, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { actualizarContacto, añadirNota, completarTarea, crearOportunidad, crearTarea } from "@/app/(crm)/acciones"
import type { UsuarioLista } from "@/lib/tipos"
import { CANALES_ORIGEN } from "@/lib/canal-origen"
import { fechaCorta, vencida } from "@/lib/format"
import { cn } from "@/lib/utils"

type Res = { ok: boolean; error?: string }
function useAccion() {
  const [pendiente, iniciar] = useTransition()
  const ejecutar = (fn: () => Promise<Res>, exito: string, despues?: () => void) =>
    iniciar(async () => { const r = await fn(); if (r.ok) { toast.success(exito); despues?.() } else toast.error(r.error) })
  return { pendiente, ejecutar }
}

export function ContactoForm({ contacto, usuarios, puedeEditar }: {
  contacto: { id: string; nombre: string | null; telefono: string | null; pais: string | null; ciudad: string | null; propietario_id: string | null; no_contactar: boolean; canal_origen: string | null }
  usuarios: UsuarioLista[]; puedeEditar: boolean
}) {
  const [v, setV] = useState(contacto)
  const { pendiente, ejecutar } = useAccion()
  const set = (k: keyof typeof v, val: string | boolean | null) => setV((x) => ({ ...x, [k]: val }))
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); ejecutar(() => actualizarContacto(contacto.id, v), "Contacto actualizado") }}>
      <div className="space-y-1.5"><Label className="eyebrow text-[0.6rem] text-muted-foreground">Nombre</Label><Input value={v.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} disabled={!puedeEditar} data-testid="contacto-nombre" /></div>
      <div className="space-y-1.5"><Label className="eyebrow text-[0.6rem] text-muted-foreground">Teléfono</Label><Input value={v.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} disabled={!puedeEditar} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="eyebrow text-[0.6rem] text-muted-foreground">País</Label><Input value={v.pais ?? ""} onChange={(e) => set("pais", e.target.value)} disabled={!puedeEditar} /></div>
        <div className="space-y-1.5"><Label className="eyebrow text-[0.6rem] text-muted-foreground">Ciudad</Label><Input value={v.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} disabled={!puedeEditar} /></div>
      </div>
      <div className="space-y-1.5"><Label className="eyebrow text-[0.6rem] text-muted-foreground">Responsable</Label>
        <Select value={v.propietario_id ?? "nadie"} onValueChange={(x) => set("propietario_id", x === "nadie" ? null : x)} disabled={!puedeEditar}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="nadie">Sin asignar</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label className="eyebrow text-[0.6rem] text-muted-foreground">Canal de origen</Label>
        <Select value={v.canal_origen ?? "sin_canal"} onValueChange={(x) => set("canal_origen", x === "sin_canal" ? null : x)} disabled={!puedeEditar}>
          <SelectTrigger className="w-full" data-testid="canal-origen-trigger"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="sin_canal">Sin especificar</SelectItem>{Object.entries(CANALES_ORIGEN).map(([valor, c]) => <SelectItem key={valor} value={valor}>{c.label}</SelectItem>)}</SelectContent></Select></div>
      <div className={cn("flex items-center justify-between gap-3 rounded-2xl p-3.5 ring-1 ring-inset transition-colors", v.no_contactar ? "bg-red-50 ring-red-600/25" : "bg-foreground/[0.03] ring-foreground/[0.07]")}>
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl", v.no_contactar ? "bg-red-100 text-red-600" : "bg-foreground/[0.06] text-muted-foreground")}><Ban className="size-4" /></span>
          <div><Label htmlFor="nc" className="font-semibold">No contactar</Label><p className="text-xs text-muted-foreground">No enviar comunicaciones comerciales.</p></div>
        </div>
        <Switch id="nc" checked={v.no_contactar} onCheckedChange={(x) => set("no_contactar", x)} disabled={!puedeEditar} data-testid="switch-no-contactar" />
      </div>
      {puedeEditar && <Button type="submit" disabled={pendiente} className="w-full" data-testid="guardar-contacto">{pendiente && <Loader2 className="animate-spin" />} Guardar cambios</Button>}
    </form>
  )
}

export function NotaForm({ contactoId }: { contactoId: string }) {
  const [texto, setTexto] = useState("")
  const { pendiente, ejecutar } = useAccion()
  return (
    <form className="space-y-2.5" onSubmit={(e) => { e.preventDefault(); ejecutar(() => añadirNota(contactoId, texto), "Nota añadida", () => setTexto("")) }}>
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe una nota interna…" rows={3} data-testid="nota-texto" />
      <Button type="submit" size="sm" disabled={pendiente || !texto.trim()} data-testid="nota-guardar">{pendiente ? <Loader2 className="animate-spin" /> : <Plus />} Añadir nota</Button>
    </form>
  )
}

export function TareaForm({ contactoId, usuarios, yo }: { contactoId: string; usuarios: UsuarioLista[]; yo: string }) {
  const [titulo, setTitulo] = useState("")
  const [vence, setVence] = useState("")
  const [asignado, setAsignado] = useState(yo)
  const { pendiente, ejecutar } = useAccion()
  return (
    <form className="space-y-2.5 rounded-2xl bg-foreground/[0.03] p-3 ring-1 ring-foreground/[0.06] ring-inset" onSubmit={(e) => { e.preventDefault(); ejecutar(() => crearTarea(contactoId, titulo, vence || null, asignado === "nadie" ? null : asignado), "Tarea creada", () => { setTitulo(""); setVence("") }) }}>
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nueva tarea…" data-testid="tarea-titulo" />
      <div className="flex gap-2">
        <Input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className="min-w-0 flex-1 px-2.5 text-xs" aria-label="Vence" />
        <Select value={asignado} onValueChange={setAsignado}><SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="nadie">Sin asignar</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent></Select>
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pendiente || !titulo.trim()} data-testid="tarea-crear">{pendiente ? <Loader2 className="animate-spin" /> : <Plus />} Añadir tarea</Button>
    </form>
  )
}

export function TareaFila({ tarea, puedeEditar }: { tarea: { id: string; titulo: string; vence_at: string | null; completada_at: string | null; asignado?: { nombre: string } | null }; puedeEditar: boolean }) {
  const { pendiente, ejecutar } = useAccion()
  const hecha = !!tarea.completada_at
  const atrasada = !hecha && vencida(tarea.vence_at)
  return (
    <div className="flex items-start gap-3.5 py-2.5">
      <button type="button" disabled={!puedeEditar || pendiente} onClick={() => ejecutar(() => completarTarea(tarea.id, !hecha), hecha ? "Tarea reabierta" : "Tarea completada")}
        className={cn("mt-0.5 flex size-[1.3rem] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ease-[var(--ease-spring)] active:scale-90",
          hecha ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_4px_12px_-2px_rgb(16_185_129/0.6)]" : atrasada ? "border-red-400 hover:border-red-500 hover:bg-red-50" : "border-foreground/25 hover:border-primary hover:bg-primary/10", "disabled:opacity-50")}
        aria-label={hecha ? "Reabrir tarea" : "Completar tarea"} data-testid="tarea-check">
        {hecha && <Check className="size-3" strokeWidth={3.5} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium transition-colors", hecha && "text-muted-foreground line-through decoration-foreground/25")}>{tarea.titulo}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{tarea.asignado?.nombre ?? "Sin asignar"}</span>
          {tarea.vence_at && (
            <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold", atrasada ? "bg-red-50 text-red-700 ring-1 ring-red-600/20 ring-inset" : "bg-foreground/[0.05]")}>{atrasada ? "Venció " : "Vence "}{fechaCorta(tarea.vence_at)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function NuevaOportunidad({ contactoId }: { contactoId: string }) {
  const [abierto, setAbierto] = useState(false)
  const [pipeline, setPipeline] = useState<"admision" | "empleo">("admision")
  const [programa, setPrograma] = useState("MBIM")
  const { pendiente, ejecutar } = useAccion()
  if (!abierto) return <Button size="sm" variant="outline" onClick={() => setAbierto(true)}><Plus /> Nueva oportunidad</Button>
  return (
    <div className="space-y-2.5 rounded-2xl bg-foreground/[0.03] p-3 ring-1 ring-foreground/[0.06] ring-inset">
      <Select value={pipeline} onValueChange={(v) => setPipeline(v as "admision" | "empleo")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="admision">Admisión</SelectItem><SelectItem value="empleo">Empleo</SelectItem></SelectContent></Select>
      {pipeline === "admision" && (
        <Select value={programa} onValueChange={setPrograma}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{["MBIM", "MBBE", "EMBIM", "Online"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>)}
      <div className="flex gap-2">
        <Button size="sm" disabled={pendiente} onClick={() => ejecutar(() => crearOportunidad(contactoId, pipeline, pipeline === "admision" ? programa : null, pipeline === "admision" ? `Admisión ${programa}` : "Candidatura manual"), "Oportunidad creada", () => setAbierto(false))}>Crear</Button>
        <Button size="sm" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
      </div>
    </div>
  )
}
