// Etiquetas y estilos compartidos por las pantallas.
export const TIPOS_ENTRADA: Record<string, { label: string; color: "info" | "success" | "warning" | "muted" | "destructive" | "secondary" }> = {
  solicitud_admision: { label: "Admisión", color: "info" },
  mensaje_contacto: { label: "Contacto", color: "secondary" },
  descarga_catalogo: { label: "Catálogo", color: "muted" },
  candidatura: { label: "Candidatura", color: "warning" },
  pedido: { label: "Pedido", color: "success" },
  baja: { label: "Baja", color: "destructive" },
  lead_legacy: { label: "Lead (histórico)", color: "muted" },
  cita: { label: "Cita", color: "info" },
}

export const ESTADOS_ENTRADA: Record<string, { label: string; color: "info" | "warning" | "success" | "muted" }> = {
  nueva: { label: "Nueva", color: "info" },
  en_gestion: { label: "En gestión", color: "warning" },
  gestionada: { label: "Gestionada", color: "success" },
  descartada: { label: "Descartada", color: "muted" },
}

export const ROLES: Record<string, string> = { admin: "Administrador", comercial: "Comercial", lectura: "Solo lectura" }
export const MOTIVOS_BAJA: Record<string, string> = {
  no_interes: "Ya no estoy interesado/a",
  privacidad: "Preocupaciones de privacidad",
  spam: "Recibo demasiados correos",
  otro: "Otro motivo",
}

export interface Entrada {
  id: string; contacto_id: string; tipo: string; programa: string | null; recibido_at: string; estado: string
  asignado_a: string | null; leida_at: string | null; payload: Record<string, any>
  contacto_nombre: string | null; contacto_email: string; contacto_telefono: string | null; no_contactar: boolean
}
export interface UsuarioLista { id: string; nombre: string; rol: string }

/** Una línea de resumen de lo que envió la persona (para listas y líneas de tiempo). */
export function resumenEntrada(tipo: string, p: Record<string, any>): string {
  switch (tipo) {
    case "solicitud_admision": return `Solicitud de admisión · ${p.programa_solicitado ?? ""}${p.ciudad ? ` · ${p.ciudad}` : ""}`
    case "mensaje_contacto": return `${p.asunto ?? "Mensaje"}${p.programa ? ` · ${p.programa}` : ""}`
    case "descarga_catalogo": return `Descarga de catálogo · ${p.catalogo_nombre ?? p.catalogo_id ?? ""}`
    case "candidatura": return `Candidatura · ${p.oferta_puesto ?? "espontánea"}`
    case "pedido": return `Pedido #${p.id} · ${Number(p.total_amount ?? 0).toLocaleString("es-ES")} € · ${p.status === "paid" ? "pagado" : "pendiente"}`
    case "baja": return `Solicitud de baja · ${MOTIVOS_BAJA[p.motivo] ?? p.motivo ?? ""}`
    case "lead_legacy": return `Solicitud de sesión (histórico) · ${p.master_interes ?? "sin programa"}`
    default: return tipo
  }
}
