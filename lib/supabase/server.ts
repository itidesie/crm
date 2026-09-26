import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { conDuracion, OPCIONES_COOKIE } from "@/lib/sesion"

/** Cliente de servidor con la sesión del usuario (RLS aplica). Todas las consultas van al esquema `crm`. */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    db: { schema: "crm" },
    cookieOptions: OPCIONES_COOKIE,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, conDuracion(options)))
        } catch {
          // Llamado desde un Server Component: la renovación de sesión la hace proxy.ts
        }
      },
    },
  })
}
