/**
 * Duración de la sesión: 3 horas desde que la persona escribe su contraseña (límite ABSOLUTO, no se
 * alarga por usar el CRM). Se calcula con la marca de tiempo del inicio de sesión que va DENTRO del
 * token firmado de Supabase (`amr[].timestamp`), así que no se puede falsificar desde el navegador
 * y se conserva cuando el token se renueva cada hora.
 * CRM_SESION_SEGUNDOS existe solo para poder probar la caducidad sin esperar tres horas.
 */
export const DURACION_SESION_S = Number(process.env.CRM_SESION_SEGUNDOS) > 0 ? Number(process.env.CRM_SESION_SEGUNDOS) : 3 * 60 * 60

type Claims = { amr?: { method?: string; timestamp?: number }[] } | null | undefined

/** Segundo (epoch) en que se inició sesión, o null si el token no lo trae. */
export function inicioSesionS(claims: Claims): number | null {
  const a = claims?.amr?.find((x) => x?.method === "password" && typeof x.timestamp === "number") ?? claims?.amr?.find((x) => typeof x?.timestamp === "number")
  return a?.timestamp ?? null
}

/** Momento (ms epoch) en que caduca la sesión; null si no se puede saber. */
export function caducaEnMs(claims: Claims): number | null {
  const i = inicioSesionS(claims)
  return i === null ? null : (i + DURACION_SESION_S) * 1000
}

/** Opciones de las cookies de Supabase: el navegador las borra 5 min después del límite de 3 h. */
/** Margen de 5 min tras el límite: así, al caducar, se puede mostrar el aviso «sesión caducada» antes de que el navegador borre la cookie. */
const MARGEN_COOKIE_S = 300
export const OPCIONES_COOKIE = { maxAge: DURACION_SESION_S + MARGEN_COOKIE_S, sameSite: "lax" as const, path: "/" }

/** Fuerza la duración de sesión en las cookies que escribe Supabase (por defecto usa 400 días). Los borrados (maxAge 0) se respetan. */
export const conDuracion = <T extends { maxAge?: number }>(o: T): T => (o?.maxAge === 0 ? o : { ...o, maxAge: DURACION_SESION_S + MARGEN_COOKIE_S })
