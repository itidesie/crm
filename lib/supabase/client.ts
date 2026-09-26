import { createBrowserClient } from "@supabase/ssr"

/** Cliente de navegador (Realtime y llamadas puntuales). Esquema `crm`. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    db: { schema: "crm" },
  })
}
