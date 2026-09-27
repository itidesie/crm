// Canal por el que llegó el contacto. Campo editable a mano: no hay tracking automático de UTM/redes.
export const CANALES_ORIGEN: Record<string, { label: string; color: "info" | "warning" | "muted" | "secondary" }> = {
  web: { label: "Web", color: "muted" },
  instagram: { label: "Instagram", color: "warning" },
  facebook: { label: "Facebook", color: "info" },
  otro: { label: "Otro", color: "secondary" },
}
