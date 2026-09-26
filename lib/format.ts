import { format, formatDistanceToNow, isPast } from "date-fns"
import { es } from "date-fns/locale"

export const fechaCorta = (d: string | Date) => format(new Date(d), "d MMM yyyy", { locale: es })
export const fechaHora = (d: string | Date) => format(new Date(d), "d MMM yyyy, HH:mm", { locale: es })
export const hace = (d: string | Date) => formatDistanceToNow(new Date(d), { addSuffix: true, locale: es }).replace(/alrededor de |casi /, "")
export const vencida = (d: string | Date | null) => !!d && isPast(new Date(d))
export const euros = (n: number | string | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(n))
export const iniciales = (nombre: string | null | undefined, email = "") =>
  (nombre || email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
