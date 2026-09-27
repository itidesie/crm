"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

/**
 * Todas las acciones se ejecutan con la SESIÓN DEL USUARIO: la autorización real la hace la RLS de la base
 * de datos (docs/diseno-crm.md §3.5). Aquí solo se traduce "0 filas afectadas" o "permiso denegado" a un
 * mensaje entendible. Cada cambio queda registrado en crm.actividades por triggers de la base de datos.
 */
export type Resultado = { ok: true } | { ok: false; error: string }
const NO_PERMISO = "No tienes permiso para modificar este registro (o ya no existe)."

function traducir(error: { message: string; code?: string }): Resultado {
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message)) return { ok: false, error: NO_PERMISO }
  return { ok: false, error: error.message }
}

async function actualizar(tabla: string, id: string, valores: Record<string, unknown>, rutas: string[]): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase.from(tabla).update(valores).eq("id", id).select("id")
  if (error) return traducir(error)
  if (!data || data.length === 0) return { ok: false, error: NO_PERMISO }   // RLS oculta la fila: 0 filas, sin error
  rutas.forEach((r) => revalidatePath(r))
  return { ok: true }
}

// ── Entradas ─────────────────────────────────────────────────────────────────
export async function cambiarEstadoEntrada(id: string, estado: string) {
  return actualizar("entradas", id, { estado }, ["/bandeja", "/"])
}
export async function asignarEntrada(id: string, usuarioId: string | null) {
  return actualizar("entradas", id, { asignado_a: usuarioId }, ["/bandeja"])
}
export async function marcarLeida(id: string, leida: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("marcar_leida", { p_entrada: id, p_leida: leida })
  if (error) return traducir(error)
  revalidatePath("/bandeja")
  return { ok: true }
}

// ── Contactos ────────────────────────────────────────────────────────────────
export async function actualizarContacto(
  id: string,
  v: {
    nombre: string | null; telefono: string | null; pais: string | null; ciudad: string | null
    propietario_id: string | null; no_contactar: boolean; canal_origen: string | null
  },
) {
  const limpio = (s: string | null) => (s && s.trim() ? s.trim() : null)
  return actualizar("contactos", id, {
    nombre: limpio(v.nombre), telefono: limpio(v.telefono), pais: limpio(v.pais), ciudad: limpio(v.ciudad),
    propietario_id: v.propietario_id, no_contactar: v.no_contactar, canal_origen: v.canal_origen,
  }, [`/contactos/${id}`, "/contactos", "/bajas"])
}

export interface FilaImportada { email: string; nombre?: string | null; telefono?: string | null; programa?: string | null; canal_origen?: string | null }
export interface ResumenImportacion { nuevos: number; actualizados: number; oportunidades: number; omitidos: number }

export async function importarContactosExcel(filas: FilaImportada[]): Promise<Resultado & { resumen?: ResumenImportacion }> {
  if (!filas.length) return { ok: false, error: "No hay filas para importar." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("importar_leads_excel", { p_filas: filas })
  if (error) return traducir(error)
  revalidatePath("/contactos"); revalidatePath("/admision")
  return { ok: true, resumen: data as ResumenImportacion }
}
export async function marcarNoContactar(contactoId: string, valor: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("contactos").update({ no_contactar: valor }).eq("id", contactoId).select("id")
  if (error) return traducir(error)
  if (!data?.length) return { ok: false, error: NO_PERMISO }
  revalidatePath("/bajas"); revalidatePath(`/contactos/${contactoId}`)
  return { ok: true }
}

export async function añadirNota(contactoId: string, texto: string): Promise<Resultado> {
  if (!texto.trim()) return { ok: false, error: "La nota está vacía." }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from("notas").insert({ contacto_id: contactoId, autor_id: user?.id, texto: texto.trim() })
  if (error) return traducir(error)
  revalidatePath(`/contactos/${contactoId}`)
  return { ok: true }
}

// ── Tareas ───────────────────────────────────────────────────────────────────
export async function crearTarea(contactoId: string | null, titulo: string, venceAt: string | null, asignadoA: string | null): Promise<Resultado> {
  if (!titulo.trim()) return { ok: false, error: "Escribe un título para la tarea." }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from("tareas").insert({
    contacto_id: contactoId, titulo: titulo.trim(), vence_at: venceAt ? new Date(venceAt).toISOString() : null,
    asignado_a: asignadoA, creado_por: user?.id,
  })
  if (error) return traducir(error)
  if (contactoId) revalidatePath(`/contactos/${contactoId}`)
  revalidatePath("/tareas"); revalidatePath("/")
  return { ok: true }
}
export async function completarTarea(id: string, completada: boolean) {
  return actualizar("tareas", id, { completada_at: completada ? new Date().toISOString() : null }, ["/tareas", "/", "/contactos/[id]"])
}

// ── Oportunidades (pipelines) ────────────────────────────────────────────────
export async function moverOportunidad(id: string, etapaId: string) {
  return actualizar("oportunidades", id, { etapa_id: etapaId }, ["/admision", "/empleo", "/"])
}
export async function asignarOportunidad(id: string, usuarioId: string | null) {
  return actualizar("oportunidades", id, { propietario_id: usuarioId }, ["/admision", "/empleo"])
}
export async function crearOportunidad(contactoId: string, pipeline: "admision" | "empleo", programa: string | null, titulo: string): Promise<Resultado> {
  const supabase = await createClient()
  const { data: p } = await supabase.from("pipelines").select("id").eq("codigo", pipeline).single()
  if (!p) return { ok: false, error: "Pipeline no encontrado." }
  const { data: e } = await supabase.from("etapas").select("id").eq("pipeline_id", p.id).order("orden").limit(1).single()
  if (!e) return { ok: false, error: "El pipeline no tiene etapas." }
  const { error } = await supabase.from("oportunidades").insert({
    contacto_id: contactoId, pipeline_id: p.id, etapa_id: e.id, programa, titulo: titulo.trim() || `Oportunidad ${programa ?? ""}`,
  })
  if (error) return traducir(error)
  revalidatePath(`/contactos/${contactoId}`); revalidatePath("/admision"); revalidatePath("/empleo")
  return { ok: true }
}
