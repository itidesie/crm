import { createBrowserClient } from "@supabase/ssr"
import { OPCIONES_COOKIE } from "@/lib/sesion"

/** Cliente de navegador (Realtime y llamadas puntuales). Esquema `crm`. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    db: { schema: "crm" },
    cookieOptions: OPCIONES_COOKIE,
  })
}
