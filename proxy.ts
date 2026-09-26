import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { caducaEnMs, conDuracion, OPCIONES_COOKIE } from "@/lib/sesion"

/**
 * Protege TODAS las rutas: sin sesión → /login. Renueva los tokens de Supabase Auth en cada petición
 * y cierra la sesión a las 3 horas de haber iniciado (ver lib/sesion.ts).
 * (Next 16: `proxy.ts` sustituye a `middleware.ts`.) La autorización real la hace la RLS de la base de datos.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: OPCIONES_COOKIE,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, conDuracion(options)))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const conToken = !!data?.claims
  const caduca = caducaEnMs(data?.claims as never)
  // Si el token no trae la marca de inicio (no ocurre con Supabase Auth actual) no se bloquea a nadie: manda la caducidad normal del token.
  const caducada = conToken && caduca !== null && Date.now() >= caduca
  const autenticado = conToken && !caducada
  const enLogin = request.nextUrl.pathname.startsWith("/login")
  const sinAcceso = request.nextUrl.searchParams.get("error") === "sin_acceso"

  // Sesión caducada (más de 3 h): se cierra solo esta sesión y se pide entrar de nuevo.
  if (caducada && !enLogin) {
    await supabase.auth.signOut({ scope: "local" })
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = "?expirada=1"
    const redireccion = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => redireccion.cookies.set(c))
    return redireccion
  }
  if (!autenticado && !enLogin) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }
  // Con sesión válida no se muestra el login, salvo «sin acceso» (evita un bucle de redirecciones)
  if (autenticado && enLogin && !sinAcceso) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }
  return response
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }
