"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { toast } from "sonner"
import { LayoutGrid, List, Search, GripVertical, Lock } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { createClient } from "@/lib/supabase/client"
import { hace } from "@/lib/format"
import { cn } from "@/lib/utils"
import { asignarOportunidad, moverOportunidad } from "@/app/(crm)/acciones"
import type { Rol } from "@/lib/auth"

export interface Etapa { id: string; nombre: string; orden: number; tipo: "abierta" | "ganada" | "perdida" }
export interface Opp {
  id: string; titulo: string; programa: string | null; etapa_id: string; propietario_id: string | null; creado_at: string
  contacto: { id: string; nombre: string | null; email_principal: string } | null; propietario: { nombre: string } | null
}
interface Usuario { id: string; nombre: string }

// Color por programa (borde lateral de la tarjeta y chip)
const PROGRAMA: Record<string, { barra: string; chip: string }> = {
  MBIM: { barra: "bg-primary", chip: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  MBBE: { barra: "bg-cyan-500", chip: "bg-cyan-50 text-cyan-700 ring-cyan-600/20" },
  EMBIM: { barra: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-amber-600/25" },
  Online: { barra: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
}

function Tarjeta({ o, arrastrable, yo, flotando }: { o: Opp; arrastrable: boolean; yo: string; flotando?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: o.id, disabled: !arrastrable })
  const p = o.programa ? PROGRAMA[o.programa] : null
  const mia = o.propietario_id === yo
  return (
    <div ref={flotando ? undefined : setNodeRef} {...(flotando ? {} : { ...listeners, ...attributes })} data-testid="tarjeta-oportunidad" data-opp={o.id}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card p-3.5 pl-4 text-sm shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.07),0_1px_2px_oklch(0.2_0.03_265/0.05)] transition-[box-shadow,transform,opacity] duration-300",
        arrastrable ? "cursor-grab hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.1),0_12px_24px_-12px_oklch(0.3_0.15_262/0.35)] active:cursor-grabbing" : "opacity-90",
        isDragging && !flotando && "opacity-30",
        flotando && "rotate-[2.5deg] scale-[1.03] shadow-[0_0_0_1.5px_var(--primary),0_30px_50px_-16px_oklch(0.3_0.15_262/0.55)]",
      )}>
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", p?.barra ?? "bg-slate-300")} />
      <div className="flex items-start gap-2.5">
        <AvatarIniciales nombre={o.contacto?.nombre} email={o.contacto?.email_principal} size="sm" />
        <div className="min-w-0 flex-1">
          <Link href={`/contactos/${o.contacto?.id}`} className="block truncate font-semibold leading-tight hover:text-primary">
            {o.contacto?.nombre ?? o.contacto?.email_principal}
          </Link>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{o.contacto?.email_principal}</div>
        </div>
        {arrastrable ? <GripVertical className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:text-muted-foreground/70" /> : <Lock className="size-3.5 shrink-0 text-muted-foreground/40" />}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {o.programa && <span className={cn("eyebrow rounded-md px-2 py-1 text-[0.58rem] ring-1 ring-inset", p?.chip)}>{o.programa}</span>}
        {mia ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-[0.68rem] font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">Mía</span>
          : o.propietario ? <span className="rounded-md bg-foreground/[0.05] px-2 py-1 text-[0.68rem] font-semibold text-foreground/70">{o.propietario.nombre.split(" ")[0]}</span> : null}
        <span className="ml-auto text-[0.68rem] text-muted-foreground">{hace(o.creado_at)}</span>
      </div>
    </div>
  )
}

function Columna({ etapa, opps, children }: { etapa: Etapa; opps: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id })
  const punto = etapa.tipo === "ganada" ? "bg-emerald-500" : etapa.tipo === "perdida" ? "bg-slate-400" : "bg-primary"
  return (
    <div className="flex w-[17rem] shrink-0 flex-col" data-testid="columna-etapa" data-etapa={etapa.nombre}>
      <div className="mb-2.5 flex h-10 items-center gap-2 px-2">
        <span className={cn("size-2.5 rounded-full", punto)} />
        <span className="line-clamp-2 font-display text-[0.9rem] leading-tight font-semibold tracking-tight" title={etapa.nombre}>{etapa.nombre}</span>
        <span className="num ml-auto shrink-0 rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.08)]">{opps}</span>
      </div>
      <div ref={setNodeRef}
        className={cn("min-h-48 flex-1 space-y-2.5 rounded-3xl p-2.5 transition-all duration-300", isOver ? "bg-primary/10 shadow-[0_0_0_2px_var(--primary)_inset] shadow-primary/40" : "bg-foreground/[0.045]")}>
        {children}
        {opps === 0 && <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-foreground/15 text-xs text-muted-foreground/70">Suelta aquí</div>}
      </div>
    </div>
  )
}

export function PipelineBoard({ etapas, oportunidades, usuarios, yo, rol, conProgramas }: {
  etapas: Etapa[]; oportunidades: Opp[]; usuarios: Usuario[]; yo: string; rol: Rol; conProgramas: boolean
}) {
  const router = useRouter()
  const [opps, setOpps] = useState(oportunidades)
  const [vista, setVista] = useState<"kanban" | "lista">("kanban")
  const [programa, setPrograma] = useState("todos")
  const [soloMias, setSoloMias] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [activa, setActiva] = useState<Opp | null>(null)
  const [pendiente, iniciar] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => setOpps(oportunidades), [oportunidades])
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => { if (data.session) supabase.realtime.setAuth(data.session.access_token) })
    const canal = supabase.channel("pipeline").on("postgres_changes", { event: "*", schema: "crm", table: "oportunidades" }, () => router.refresh()).subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [router])

  const puedeMover = (o: Opp) => rol === "admin" || (rol === "comercial" && (!o.propietario_id || o.propietario_id === yo))

  const visibles = useMemo(() => opps.filter((o) =>
    (programa === "todos" || o.programa === programa) && (!soloMias || o.propietario_id === yo) &&
    (!busqueda.trim() || `${o.contacto?.nombre ?? ""} ${o.contacto?.email_principal ?? ""}`.toLowerCase().includes(busqueda.trim().toLowerCase()))), [opps, programa, soloMias, busqueda, yo])

  const mover = (o: Opp, etapaId: string) => {
    if (o.etapa_id === etapaId) return
    const antes = opps
    setOpps((x) => x.map((i) => (i.id === o.id ? { ...i, etapa_id: etapaId } : i)))
    iniciar(async () => {
      const r = await moverOportunidad(o.id, etapaId)
      if (!r.ok) { setOpps(antes); toast.error(r.error) } else toast.success("Oportunidad movida")
      router.refresh()
    })
  }
  const onDragStart = (e: DragStartEvent) => setActiva(opps.find((o) => o.id === e.active.id) ?? null)
  const onDragEnd = (e: DragEndEvent) => {
    setActiva(null)
    const o = opps.find((x) => x.id === e.active.id)
    if (o && e.over) mover(o, String(e.over.id))
  }

  return (
    <div className="space-y-5">
      <div className="glass fade-up flex flex-wrap items-center gap-3 rounded-3xl p-3.5" style={{ "--i": 1 } as React.CSSProperties}>
        <Tabs value={vista} onValueChange={(v) => setVista(v as "kanban" | "lista")}>
          <TabsList><TabsTrigger value="kanban" data-testid="vista-kanban"><LayoutGrid /> Kanban</TabsTrigger><TabsTrigger value="lista" data-testid="vista-lista"><List /> Lista</TabsTrigger></TabsList>
        </Tabs>
        <div className="relative min-w-56 flex-1"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o email…" className="pl-10" /></div>
        {conProgramas && (
          <Select value={programa} onValueChange={setPrograma}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos los programas</SelectItem>{["MBIM", "MBBE", "EMBIM", "Online"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>)}
        <div className="flex items-center gap-2 rounded-xl bg-foreground/[0.05] px-3 py-2.5"><Checkbox id="mias" checked={soloMias} onCheckedChange={(v) => setSoloMias(v === true)} /><Label htmlFor="mias" className="font-medium">Solo mías</Label></div>
        <span className="text-sm text-muted-foreground" data-testid="total-oportunidades"><strong className="num text-base font-semibold text-foreground">{visibles.length}</strong> oportunidades</span>
      </div>

      {vista === "kanban" ? (
        <DndContext id="pipeline-dnd" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiva(null)}>
          <div className="fade-up -mx-1 flex gap-4 overflow-x-auto px-1 pb-5" data-testid="kanban" style={{ "--i": 2 } as React.CSSProperties}>
            {etapas.map((et) => {
              const col = visibles.filter((o) => o.etapa_id === et.id)
              return (
                <Columna key={et.id} etapa={et} opps={col.length}>
                  {col.map((o) => <Tarjeta key={o.id} o={o} arrastrable={puedeMover(o)} yo={yo} />)}
                </Columna>
              )
            })}
          </div>
          <DragOverlay dropAnimation={{ duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>{activa && <Tarjeta o={activa} arrastrable flotando yo={yo} />}</DragOverlay>
        </DndContext>
      ) : (
        <div className="surface fade-up overflow-hidden" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="lista-oportunidades">
              <thead>
                <tr className="eyebrow border-b bg-foreground/[0.025] text-left text-[0.62rem] text-muted-foreground">
                  <th className="px-5 py-3.5 font-medium">Contacto</th>{conProgramas && <th className="px-3 py-3.5 font-medium">Programa</th>}<th className="px-3 py-3.5 font-medium">Etapa</th><th className="px-3 py-3.5 font-medium">Responsable</th><th className="px-3 py-3.5 pr-5 font-medium">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visibles.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-primary/[0.04]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3"><AvatarIniciales nombre={o.contacto?.nombre} email={o.contacto?.email_principal} size="sm" />
                        <div><Link href={`/contactos/${o.contacto?.id}`} className="font-semibold hover:text-primary">{o.contacto?.nombre ?? o.contacto?.email_principal}</Link><div className="text-xs text-muted-foreground">{o.contacto?.email_principal}</div></div></div></td>
                    {conProgramas && <td className="px-3 py-3">{o.programa ? <span className={cn("eyebrow rounded-md px-2 py-1 text-[0.58rem] ring-1 ring-inset", PROGRAMA[o.programa]?.chip)}>{o.programa}</span> : "—"}</td>}
                    <td className="px-3 py-3">
                      <Select value={o.etapa_id} disabled={!puedeMover(o) || pendiente} onValueChange={(v) => mover(o, v)}>
                        <SelectTrigger size="sm" className="w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>{etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent></Select></td>
                    <td className="px-3 py-3">
                      <Select value={o.propietario_id ?? "nadie"} disabled={!puedeMover(o) || pendiente}
                        onValueChange={(v) => iniciar(async () => { const r = await asignarOportunidad(o.id, v === "nadie" ? null : v); if (!r.ok) toast.error(r.error); else toast.success("Responsable actualizado"); router.refresh() })}>
                        <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="nadie">Sin asignar</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent></Select></td>
                    <td className="px-3 py-3 pr-5 text-muted-foreground">{hace(o.creado_at)}</td>
                  </tr>
                ))}
                {visibles.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-muted-foreground">No hay oportunidades con estos filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rol === "lectura" && <p className="rounded-2xl bg-foreground/[0.04] p-3.5 text-sm text-muted-foreground">Tu rol es de solo lectura: puedes consultar el pipeline pero no moverlo.</p>}
    </div>
  )
}
