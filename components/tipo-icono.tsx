import { GraduationCap, MessageSquareText, Download, Briefcase, ShoppingBag, UserX, Send, CalendarClock, Inbox, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const TIPOS: Record<string, { icon: LucideIcon; tono: string }> = {
  solicitud_admision: { icon: GraduationCap, tono: "bg-blue-50 text-blue-700 ring-blue-600/15" },
  mensaje_contacto: { icon: MessageSquareText, tono: "bg-violet-50 text-violet-700 ring-violet-600/15" },
  descarga_catalogo: { icon: Download, tono: "bg-slate-100 text-slate-600 ring-slate-500/15" },
  candidatura: { icon: Briefcase, tono: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  pedido: { icon: ShoppingBag, tono: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" },
  baja: { icon: UserX, tono: "bg-red-50 text-red-700 ring-red-600/15" },
  // "lead_legacy" es el nombre heredado de la vista de la web, pero es el flujo EN VIVO del
  // formulario de solicitud de información (con llamada opcional) — icono y tono a juego con su
  // badge "info" en lib/tipos.ts, no con el gris apagado que tenía cuando parecía histórico.
  lead_legacy: { icon: Send, tono: "bg-sky-50 text-sky-700 ring-sky-600/15" },
  cita: { icon: CalendarClock, tono: "bg-cyan-50 text-cyan-700 ring-cyan-600/15" },
}

export function TipoIcono({ tipo, className }: { tipo: string; className?: string }) {
  const { icon: Icon, tono } = TIPOS[tipo] ?? { icon: Inbox, tono: "bg-slate-100 text-slate-600 ring-slate-500/15" }
  return (
    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", tono, className)}>
      <Icon className="size-[1.15rem]" strokeWidth={2} />
    </span>
  )
}
