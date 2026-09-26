import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Protege TODAS las rutas: sin sesión → /login. Renueva los tokens de Supabase Auth en cada petición.
 * (Next 16: `proxy.ts` sustituye a `middleware.ts`.) La autorización real la hace la RLS de la base de datos.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const autenticado = !!data?.claims
  const enLogin = request.nextUrl.pathname.startsWith("/login")

  if (!autenticado && !enLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }
  if (autenticado && enLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }
  return response
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }
