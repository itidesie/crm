"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { toast } from "sonner"
import { LayoutGrid, List, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { hace } from "@/lib/format"
import { asignarOportunidad, moverOportunidad } from "@/app/(crm)/acciones"
import type { Rol } from "@/lib/auth"

export interface Etapa { id: string; nombre: string; orden: number; tipo: "abierta" | "ganada" | "perdida" }
export interface Opp {
  id: string; titulo: string; programa: string | null; etapa_id: string; propietario_id: string | null; creado_at: string
  contacto: { id: string; nombre: string | null; email_principal: string } | null; propietario: { nombre: string } | null
}
interface Usuario { id: string; nombre: string }

function Tarjeta({ o, arrastrable, yo, flotando }: { o: Opp; arrastrable: boolean; yo: string; flotando?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: o.id, disabled: !arrastrable })
  return (
    <div ref={flotando ? undefined : setNodeRef} {...(flotando ? {} : { ...listeners, ...attributes })} data-testid="tarjeta-oportunidad" data-opp={o.id}
      className={`rounded-lg border bg-card p-3 text-sm shadow-xs ${arrastrable ? "cursor-grab active:cursor-grabbing" : "opacity-90"} ${isDragging && !flotando ? "opacity-30" : ""} ${flotando ? "rotate-2 shadow-lg" : ""}`}>
      <Link href={`/contactos/${o.contacto?.id}`} className="block font-medium hover:text-primary hover:underline">
        {o.contacto?.nombre ?? o.contacto?.email_principal}
      </Link>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{o.contacto?.email_principal}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {o.programa && <Badge variant="info">{o.programa}</Badge>}
        {o.propietario_id === yo ? <Badge variant="success">Mía</Badge> : o.propietario ? <Badge variant="muted">{o.propietario.nombre.split(" ")[0]}</Badge> : null}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{hace(o.creado_at)}</div>
    </div>
  )
}

function Columna({ etapa, opps, children }: { etapa: Etapa; opps: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id })
  const color = etapa.tipo === "ganada" ? "bg-emerald-500" : etapa.tipo === "perdida" ? "bg-slate-400" : "bg-primary"
  return (
    <div className="flex w-64 shrink-0 flex-col" data-testid="columna-etapa" data-etapa={etapa.nombre}>
      <div className="mb-2 flex items-center gap-2 px-1"><span className={`size-2 rounded-full ${color}`} /><span className="text-sm font-medium">{etapa.nombre}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{opps}</span></div>
      <div ref={setNodeRef} className={`min-h-40 flex-1 space-y-2 rounded-lg p-2 transition-colors ${isOver ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/60"}`}>{children}</div>
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <Tabs value={vista} onValueChange={(v) => setVista(v as "kanban" | "lista")}>
          <TabsList><TabsTrigger value="kanban" data-testid="vista-kanban"><LayoutGrid className="size-4" /> Kanban</TabsTrigger><TabsTrigger value="lista" data-testid="vista-lista"><List className="size-4" /> Lista</TabsTrigger></TabsList>
        </Tabs>
        <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o email…" className="pl-9" /></div>
        {conProgramas && (
          <Select value={programa} onValueChange={setPrograma}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos los programas</SelectItem>{["MBIM", "MBBE", "EMBIM", "Online"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>)}
        <div className="flex items-center gap-2"><Checkbox id="mias" checked={soloMias} onCheckedChange={(v) => setSoloMias(v === true)} /><Label htmlFor="mias" className="font-normal">Solo mías</Label></div>
        <span className="text-sm text-muted-foreground" data-testid="total-oportunidades">{visibles.length} oportunidades</span>
      </div>

      {vista === "kanban" ? (
        <DndContext id="pipeline-dnd" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiva(null)}>
          <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban">
            {etapas.map((et) => {
              const col = visibles.filter((o) => o.etapa_id === et.id)
              return (
                <Columna key={et.id} etapa={et} opps={col.length}>
                  {col.map((o) => <Tarjeta key={o.id} o={o} arrastrable={puedeMover(o)} yo={yo} />)}
                </Columna>
              )
            })}
          </div>
          <DragOverlay>{activa && <Tarjeta o={activa} arrastrable flotando yo={yo} />}</DragOverlay>
        </DndContext>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm" data-testid="lista-oportunidades">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2.5">Contacto</th>{conProgramas && <th className="px-3 py-2.5">Programa</th>}<th className="px-3 py-2.5">Etapa</th><th className="px-3 py-2.5">Responsable</th><th className="px-3 py-2.5 pr-4">Creada</th></tr>
            </thead>
            <tbody className="divide-y">
              {visibles.map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5"><Link href={`/contactos/${o.contacto?.id}`} className="font-medium text-primary hover:underline">{o.contacto?.nombre ?? o.contacto?.email_principal}</Link><div className="text-xs text-muted-foreground">{o.contacto?.email_principal}</div></td>
                  {conProgramas && <td className="px-3 py-2.5">{o.programa ?? "—"}</td>}
                  <td className="px-3 py-2.5">
                    <Select value={o.etapa_id} disabled={!puedeMover(o) || pendiente} onValueChange={(v) => mover(o, v)}>
                      <SelectTrigger size="sm" className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>{etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent></Select></td>
                  <td className="px-3 py-2.5">
                    <Select value={o.propietario_id ?? "nadie"} disabled={!puedeMover(o) || pendiente}
                      onValueChange={(v) => iniciar(async () => { const r = await asignarOportunidad(o.id, v === "nadie" ? null : v); if (!r.ok) toast.error(r.error); else toast.success("Responsable actualizado"); router.refresh() })}>
                      <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nadie">Sin asignar</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent></Select></td>
                  <td className="px-3 py-2.5 pr-4 text-muted-foreground">{hace(o.creado_at)}</td>
                </tr>
              ))}
              {visibles.length === 0 && <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">No hay oportunidades con estos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {rol === "lectura" && <p className="text-xs text-muted-foreground">Tu rol es de solo lectura: puedes consultar el pipeline pero no moverlo.</p>}
    </div>
  )
}
