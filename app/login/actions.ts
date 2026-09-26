"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

const ROLES_VALIDOS = ["admin", "comercial", "lectura"]

export async function iniciarSesion(_: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) return { error: "Introduce tu email y tu contraseña." }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return { error: "Email o contraseña incorrectos." }

  // La cuenta existe, pero ¿está dada de alta en el CRM y activa? (crm.usuarios: rol admin / comercial / lectura)
  const { data: perfil } = await supabase.from("usuarios").select("rol, activo").eq("id", data.user.id).maybeSingle()
  if (!perfil || !perfil.activo || !ROLES_VALIDOS.includes(perfil.rol)) {
    await supabase.auth.signOut({ scope: "local" })
    return { error: "Tu cuenta no tiene acceso al CRM. Pide a un administrador que te dé de alta." }
  }
  redirect("/")
}

export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "local" })
  redirect("/login")
}
