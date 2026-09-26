import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Mail, MessageSquare, ListChecks, StickyNote, Activity, User, ArrowRightLeft, Ban, Phone, MapPin, Inbox, CalendarPlus, Target, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { TipoIcono } from "@/components/tipo-icono"
import { EntradaDetalle } from "@/components/entrada-detalle"
import { ContactoForm, NotaForm, NuevaOportunidad, TareaFila, TareaForm } from "@/components/contacto-acciones"
import { ESTADOS_ENTRADA, TIPOS_ENTRADA, resumenEntrada, type UsuarioLista } from "@/lib/tipos"
import { fechaCorta, fechaHora, hace } from "@/lib/format"

export const dynamic = "force-dynamic"

const ICONO_ACTIVIDAD: Record<string, typeof Activity> = {
  nota: StickyNote, cambio_estado: ArrowRightLeft, cambio_etapa: ArrowRightLeft, asignacion: User, tarea: ListChecks,
  baja: Ban, contacto: User, llamada: Phone, email: Mail, sistema: Activity, cita: Activity,
}

function Panel({ titulo, icono: Icono, children, n }: { titulo: string; icono?: typeof Activity; children: React.ReactNode; n?: number }) {
  return (
    <section className="surface p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-[1.05rem] font-semibold tracking-tight">
        {Icono && <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icono className="size-4" /></span>}
        {titulo}{n !== undefined && <span className="num rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs font-semibold text-muted-foreground">{n}</span>}
      </h2>
      {children}
    </section>
  )
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
  const responsable = (usuarios.data ?? []).find((u) => u.id === contacto.propietario_id)
  const tareasAbiertas = (tareas.data ?? []).filter((t: any) => !t.completada_at).length

  // Línea de tiempo: entradas (lo que llega por la web) + actividades del equipo, de más reciente a más antigua
  type Item = { key: string; fecha: string; tipo: "entrada" | "actividad"; e?: any; a?: any }
  const linea: Item[] = [
    ...(entradas.data ?? []).map((e) => ({ key: `e-${e.id}`, fecha: e.recibido_at, tipo: "entrada" as const, e })),
    ...(actividades.data ?? []).filter((a) => a.tipo !== "entrada_web").map((a) => ({ key: `a-${a.id}`, fecha: a.ocurrio_at, tipo: "actividad" as const, a })),
  ].sort((x, y) => +new Date(y.fecha) - +new Date(x.fecha))

  return (
    <>
      <Link href="/contactos" className="fade-in mb-5 inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] py-1.5 pr-3.5 pl-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-foreground/[0.09] hover:text-foreground"><ArrowLeft className="size-4" /> Contactos</Link>

      {/* Cabecera de la ficha */}
      <section className="surface fade-up relative mb-6 overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/[0.12] blur-3xl" />
        <div aria-hidden className="dot-grid-dark pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_100%_at_100%_0%,black,transparent)]" />
        <div className="relative flex flex-wrap items-center gap-5">
          <AvatarIniciales nombre={contacto.nombre} email={contacto.email_principal} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {contacto.no_contactar && <Badge variant="destructive" data-testid="badge-no-contactar"><Ban /> No contactar</Badge>}
              {(etiquetas.data ?? []).map((t: any) => <Badge key={t.etiqueta?.nombre} variant="secondary">{t.etiqueta?.nombre}</Badge>)}
            </div>
            <h1 className="mt-2 font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.75rem)] leading-none font-bold tracking-[-0.03em]" data-testid="ficha-nombre">{contacto.nombre ?? "(sin nombre)"}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Mail className="size-4" />{contacto.email_principal}</span>
              {contacto.telefono && <span className="inline-flex items-center gap-1.5"><Phone className="size-4" />{contacto.telefono}</span>}
              {(contacto.ciudad || contacto.pais) && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{[contacto.ciudad, contacto.pais].filter(Boolean).join(", ")}</span>}
              <span className="inline-flex items-center gap-1.5"><CalendarPlus className="size-4" />Alta {fechaCorta(contacto.creado_at)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            {[[Inbox, (entradas.data ?? []).length, "Entradas"], [Target, (opps.data ?? []).length, "Oportunidades"], [ListChecks, tareasAbiertas, "Tareas"]].map(([Icono, n, l]) => {
              const I = Icono as typeof Inbox
              return (
                <div key={l as string} className="min-w-[5.5rem] rounded-2xl bg-foreground/[0.04] p-3.5 ring-1 ring-foreground/[0.06] ring-inset">
                  <I className="size-4 text-primary" /><div className="num mt-2 text-2xl leading-none font-bold">{n as number}</div><div className="eyebrow mt-1 text-[0.55rem] text-muted-foreground">{l as string}</div>
                </div>
              )
            })}
          </div>
        </div>
        {responsable && <div className="relative mt-5 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground"><AvatarIniciales nombre={responsable.nombre} size="xs" />Responsable: <strong className="font-semibold text-foreground">{responsable.nombre}</strong></div>}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel titulo="Línea de tiempo" icono={MessageSquare} n={linea.length}>
            <ol className="relative space-y-1" data-testid="linea-tiempo">
              <span aria-hidden className="absolute top-3 bottom-3 left-[1.15rem] w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
              {linea.map((it) => it.tipo === "entrada" ? (
                <li key={it.key} className="relative pl-14" data-testid="item-entrada">
                  <span className="absolute top-1 left-0 ring-4 ring-card rounded-xl"><TipoIcono tipo={it.e.tipo} className="!size-9" /></span>
                  <details className="group/d rounded-2xl px-3 py-2 transition-colors open:bg-foreground/[0.03] hover:bg-foreground/[0.03]">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="text-sm font-semibold">{resumenEntrada(it.e.tipo, it.e.payload)}</span>
                      <Badge variant={ESTADOS_ENTRADA[it.e.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[it.e.estado]?.label}</Badge>
                      <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground" title={fechaHora(it.fecha)}>{hace(it.fecha)}<ChevronDown className="size-4 transition-transform group-open/d:rotate-180" /></span>
                      <span className="sr-only">{TIPOS_ENTRADA[it.e.tipo]?.label}</span>
                    </summary>
                    <div className="mt-3 pb-1"><EntradaDetalle tipo={it.e.tipo} payload={it.e.payload} /></div>
                  </details>
                </li>
              ) : (
                <li key={it.key} className="relative pl-14" data-testid="item-actividad">
                  {(() => { const Icono = ICONO_ACTIVIDAD[it.a.tipo] ?? Activity; return (
                    <span className="absolute top-2 left-[0.55rem] flex size-[1.4rem] items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.15)] ring-4 ring-card"><Icono className="size-3" /></span>) })()}
                  <div className="px-3 py-2">
                    <div className="text-sm">{it.a.titulo}</div>
                    {it.a.tipo === "nota" && it.a.datos?.texto && <p className="mt-1.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-600/15 ring-inset">{it.a.datos.texto}</p>}
                    <div className="mt-0.5 text-xs text-muted-foreground">{it.a.usuario?.nombre ?? "Sistema"} · {hace(it.fecha)}</div>
                  </div>
                </li>
              ))}
              {linea.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Sin actividad todavía.</li>}
            </ol>
          </Panel>

          <Panel titulo="Notas" icono={StickyNote} n={(notas.data ?? []).length}>
            <div className="space-y-4">
              {puedeEscribir(usuario.rol) && <NotaForm contactoId={id} />}
              <div className="space-y-3" data-testid="lista-notas">
                {(notas.data ?? []).map((n: any) => (
                  <div key={n.id} className="rounded-2xl bg-amber-50/80 p-4 text-sm ring-1 ring-amber-600/15 ring-inset">
                    <p className="whitespace-pre-line text-amber-950">{n.texto}</p>
                    <div className="mt-2 text-xs text-amber-900/60">{n.autor?.nombre ?? "—"} · {hace(n.creado_at)}</div>
                  </div>
                ))}
                {(notas.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No hay notas.</p>}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel titulo="Datos" icono={User}>
            <ContactoForm contacto={contacto} usuarios={(usuarios.data ?? []) as UsuarioLista[]} puedeEditar={puedeEditar} />
            {!puedeEditar && <p className="mt-3 rounded-xl bg-foreground/[0.04] p-3 text-xs text-muted-foreground">{usuario.rol === "lectura" ? "Tu rol es de solo lectura." : "Este contacto está asignado a otra persona: solo puedes consultarlo."}</p>}
          </Panel>

          <Panel titulo="Tareas" icono={ListChecks} n={tareasAbiertas}>
            <div className="space-y-3">
              <div className="divide-y divide-border/70" data-testid="lista-tareas">
                {(tareas.data ?? []).map((t: any) => <TareaFila key={t.id} tarea={t} puedeEditar={puedeEscribir(usuario.rol)} />)}
                {(tareas.data ?? []).length === 0 && <p className="py-1 text-sm text-muted-foreground">Sin tareas.</p>}
              </div>
              {puedeEscribir(usuario.rol) && <TareaForm contactoId={id} usuarios={(usuarios.data ?? []) as UsuarioLista[]} yo={usuario.id} />}
            </div>
          </Panel>

          <Panel titulo="Oportunidades" icono={Target} n={(opps.data ?? []).length}>
            <div className="space-y-2.5">
              {(opps.data ?? []).map((o: any) => (
                <div key={o.id} className="rounded-2xl bg-foreground/[0.03] p-3.5 ring-1 ring-foreground/[0.06] ring-inset">
                  <div className="text-sm font-semibold">{o.titulo}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={o.etapa?.tipo === "ganada" ? "success" : o.etapa?.tipo === "perdida" ? "muted" : "info"}>{o.etapa?.nombre}</Badge>
                    <span>{o.pipeline?.nombre}</span><span>· {o.propietario?.nombre ?? "sin asignar"}</span>
                  </div>
                </div>
              ))}
              {(opps.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin oportunidades.</p>}
              {puedeEscribir(usuario.rol) && <NuevaOportunidad contactoId={id} />}
            </div>
          </Panel>

          <Panel titulo="Emails conocidos" icono={Mail}>
            <div className="space-y-2 text-sm">
              {(emails.data ?? []).map((e) => <div key={e.email_normalizado} className="flex items-center gap-2"><span className="truncate font-medium">{e.email_normalizado}</span>{e.principal && <Badge variant="info">principal</Badge>}</div>)}
              <p className="pt-1 text-xs leading-relaxed text-muted-foreground">Las variantes de mayúsculas y espacios se unifican en este contacto.</p>
            </div>
          </Panel>

          {usuario.rol === "admin" && (
            <Panel titulo="Consentimientos">
              <div className="space-y-2 text-sm">
                {(consent.data ?? []).map((c) => <div key={c.id} className="flex justify-between gap-2"><span className="font-medium">{c.tipo} <span className="font-normal text-muted-foreground">· {c.origen}</span></span><span className="text-xs text-muted-foreground">{hace(c.otorgado_at)}</span></div>)}
                {(consent.data ?? []).length === 0 && <p className="text-muted-foreground">Sin consentimientos registrados.</p>}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
