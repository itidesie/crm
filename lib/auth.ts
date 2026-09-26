import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type Rol = "admin" | "comercial" | "lectura"
export interface UsuarioCrm { id: string; nombre: string; email: string | null; rol: Rol }

/** Usuario autenticado + su fila en crm.usuarios (rol). Sin fila = sin acceso al CRM. */
export const getUsuario = cache(async (): Promise<UsuarioCrm> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data } = await supabase.from("usuarios").select("id, nombre, email, rol, activo").eq("id", user.id).maybeSingle()
  if (!data || !data.activo) redirect("/login?error=sin_acceso")
  return { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol as Rol }
})

export const puedeEscribir = (rol: Rol) => rol === "admin" || rol === "comercial"
