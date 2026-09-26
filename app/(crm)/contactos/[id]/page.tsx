import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Mail, MessageSquare, ListChecks, StickyNote, Activity, User, ArrowRightLeft, Ban, Phone } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EntradaDetalle } from "@/components/entrada-detalle"
import { ContactoForm, NotaForm, NuevaOportunidad, TareaFila, TareaForm } from "@/components/contacto-acciones"
import { ESTADOS_ENTRADA, TIPOS_ENTRADA, resumenEntrada, type UsuarioLista } from "@/lib/tipos"
import { fechaHora, hace } from "@/lib/format"

export const dynamic = "force-dynamic"

const ICONO_ACTIVIDAD: Record<string, typeof Activity> = {
  nota: StickyNote, cambio_estado: ArrowRightLeft, cambio_etapa: ArrowRightLeft, asignacion: User, tarea: ListChecks,
  baja: Ban, contacto: User, llamada: Phone, email: Mail, sistema: Activity, cita: Activity,
}

export default async function ContactoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuario = await getUsuario()
  const supabase = await createClient()

  const { data: contacto } = await supabase.from("contactos").select("*").eq("id", id).maybeSingle()
  if (!contacto) notFound()

  const [emails, entradas, actividades, notas, tareas, opps, etiquetas, consent, usuarios] = await Promise.all([
    supabase.from("contacto_emails").select("email_normalizado, principal").eq("contacto_id", id),
    supabase.from("entradas").select("*").eq("contacto_id", id).order("recibido_at", { ascending: false }),
    supabase.from("actividades").select("id, tipo, titulo, ocurrio_at, datos, usuario:usuarios(nombre)").eq("contacto_id", id).order("ocurrio_at", { ascending: false }).limit(60),
    supabase.from("notas").select("id, texto, creado_at, autor:usuarios(nombre)").eq("contacto_id", id).order("creado_at", { ascending: false }),
    supabase.from("tareas").select("id, titulo, vence_at, completada_at, asignado:usuarios!tareas_asignado_a_fkey(nombre)").eq("contacto_id", id).order("completada_at", { nullsFirst: true }).order("vence_at"),
    supabase.from("oportunidades").select("id, titulo, programa, propietario:usuarios(nombre), etapa:etapas(nombre, tipo), pipeline:pipelines(nombre)").eq("contacto_id", id),
    supabase.from("contacto_etiquetas").select("etiqueta:etiquetas(nombre)").eq("contacto_id", id),
    supabase.from("consentimientos").select("id, tipo, otorgado_at, texto_version, origen").eq("contacto_id", id).order("otorgado_at", { ascending: false }),
    supabase.from("usuarios").select("id, nombre, rol").eq("activo", true).order("nombre"),
  ])

  const puedeEditar = puedeEscribir(usuario.rol) && (usuario.rol === "admin" || !contacto.propietario_id || contacto.propietario_id === usuario.id)

  // Línea de tiempo: entradas (lo que llega por la web) + actividades del equipo, de más reciente a más antigua
  type Item = { key: string; fecha: string; tipo: "entrada" | "actividad"; e?: any; a?: any }
  const linea: Item[] = [
    ...(entradas.data ?? []).map((e) => ({ key: `e-${e.id}`, fecha: e.recibido_at, tipo: "entrada" as const, e })),
    ...(actividades.data ?? []).filter((a) => a.tipo !== "entrada_web").map((a) => ({ key: `a-${a.id}`, fecha: a.ocurrio_at, tipo: "actividad" as const, a })),
  ].sort((x, y) => +new Date(y.fecha) - +new Date(x.fecha))

  return (
    <>
      <Link href="/contactos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Contactos</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="ficha-nombre">{contacto.nombre ?? "(sin nombre)"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contacto.email_principal}{contacto.telefono ? ` · ${contacto.telefono}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {contacto.no_contactar && <Badge variant="destructive" data-testid="badge-no-contactar">No contactar</Badge>}
          {(etiquetas.data ?? []).map((t: any) => <Badge key={t.etiqueta?.nombre} variant="secondary">{t.etiqueta?.nombre}</Badge>)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="size-4" /> Línea de tiempo <span className="text-sm font-normal text-muted-foreground">({(entradas.data ?? []).length} entradas de formularios)</span></CardTitle></CardHeader>
            <CardContent className="space-y-0">
              <ol className="relative space-y-5 border-l pl-6" data-testid="linea-tiempo">
                {linea.map((it) => it.tipo === "entrada" ? (
                  <li key={it.key} className="relative" data-testid="item-entrada">
                    <span className="absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full bg-primary ring-4 ring-card" />
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                        <Badge variant={TIPOS_ENTRADA[it.e.tipo]?.color ?? "muted"}>{TIPOS_ENTRADA[it.e.tipo]?.label}</Badge>
                        <span className="text-sm font-medium">{resumenEntrada(it.e.tipo, it.e.payload)}</span>
                        <Badge variant={ESTADOS_ENTRADA[it.e.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[it.e.estado]?.label}</Badge>
                        <span className="text-xs text-muted-foreground" title={fechaHora(it.fecha)}>{hace(it.fecha)}</span>
                      </summary>
                      <div className="mt-3"><EntradaDetalle tipo={it.e.tipo} payload={it.e.payload} /></div>
                    </details>
                  </li>
                ) : (
                  <li key={it.key} className="relative" data-testid="item-actividad">
                    {(() => { const Icono = ICONO_ACTIVIDAD[it.a.tipo] ?? Activity; return (
                      <span className="absolute -left-[33px] top-0.5 flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground ring-4 ring-card"><Icono className="size-3" /></span>) })()}
                    <div className="text-sm">{it.a.titulo}</div>
                    {it.a.tipo === "nota" && it.a.datos?.texto && <p className="mt-1 rounded-md bg-amber-50 p-2 text-sm text-amber-900">{it.a.datos.texto}</p>}
                    <div className="text-xs text-muted-foreground">{it.a.usuario?.nombre ?? "Sistema"} · {hace(it.fecha)}</div>
                  </li>
                ))}
                {linea.length === 0 && <li className="text-sm text-muted-foreground">Sin actividad todavía.</li>}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><StickyNote className="size-4" /> Notas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {puedeEscribir(usuario.rol) && <NotaForm contactoId={id} />}
              <div className="space-y-3" data-testid="lista-notas">
                {(notas.data ?? []).map((n: any) => (
                  <div key={n.id} className="rounded-md border bg-amber-50/60 p-3 text-sm">
                    <p className="whitespace-pre-line">{n.texto}</p>
                    <div className="mt-1.5 text-xs text-muted-foreground">{n.autor?.nombre ?? "—"} · {hace(n.creado_at)}</div>
                  </div>
                ))}
                {(notas.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No hay notas.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base">Datos</CardTitle></CardHeader>
            <CardContent>
              <ContactoForm contacto={contacto} usuarios={(usuarios.data ?? []) as UsuarioLista[]} puedeEditar={puedeEditar} />
              {!puedeEditar && <p className="mt-3 text-xs text-muted-foreground">{usuario.rol === "lectura" ? "Tu rol es de solo lectura." : "Este contacto está asignado a otra persona: solo puedes consultarlo."}</p>}
            </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Tareas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="divide-y" data-testid="lista-tareas">
                {(tareas.data ?? []).map((t: any) => <TareaFila key={t.id} tarea={t} puedeEditar={puedeEscribir(usuario.rol)} />)}
                {(tareas.data ?? []).length === 0 && <p className="py-1 text-sm text-muted-foreground">Sin tareas.</p>}
              </div>
              {puedeEscribir(usuario.rol) && <TareaForm contactoId={id} usuarios={(usuarios.data ?? []) as UsuarioLista[]} yo={usuario.id} />}
            </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Oportunidades</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(opps.data ?? []).map((o: any) => (
                <div key={o.id} className="rounded-md border p-2.5 text-sm">
                  <div className="font-medium">{o.titulo}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={o.etapa?.tipo === "ganada" ? "success" : o.etapa?.tipo === "perdida" ? "muted" : "info"}>{o.etapa?.nombre}</Badge>
                    <span>{o.pipeline?.nombre}</span><span>· {o.propietario?.nombre ?? "sin asignar"}</span>
                  </div>
                </div>
              ))}
              {(opps.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin oportunidades.</p>}
              {puedeEscribir(usuario.rol) && <NuevaOportunidad contactoId={id} />}
            </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Emails conocidos</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(emails.data ?? []).map((e) => <div key={e.email_normalizado} className="flex items-center gap-2"><Mail className="size-3.5 text-muted-foreground" />{e.email_normalizado}{e.principal && <Badge variant="muted">principal</Badge>}</div>)}
              <p className="pt-1 text-xs text-muted-foreground">Las variantes de mayúsculas y espacios se unifican en este contacto.</p>
            </CardContent></Card>

          {usuario.rol === "admin" && (
            <Card><CardHeader><CardTitle className="text-base">Consentimientos</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {(consent.data ?? []).map((c) => <div key={c.id} className="flex justify-between gap-2"><span>{c.tipo} · <span className="text-muted-foreground">{c.origen}</span></span><span className="text-xs text-muted-foreground">{hace(c.otorgado_at)}</span></div>)}
                {(consent.data ?? []).length === 0 && <p className="text-muted-foreground">Sin consentimientos registrados.</p>}
              </CardContent></Card>
          )}
        </div>
      </div>
    </>
  )
}
