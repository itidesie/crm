import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { ESTADOS_ENTRADA, MOTIVOS_BAJA } from "@/lib/tipos"
import { fechaHora, hace } from "@/lib/format"
import { BajaAcciones } from "./baja-acciones"

export const dynamic = "force-dynamic"

export default async function BajasPage() {
  const usuario = await getUsuario()
  const supabase = await createClient()
  await supabase.rpc("procesar_entradas")
  const { data } = await supabase.from("v_bandeja").select("*").eq("tipo", "baja").order("recibido_at", { ascending: false })

  return (
    <>
      <PageHeader seccion="Operaciones" titulo="Solicitudes de baja" descripcion="Personas que piden la supresión de sus datos o no recibir comunicaciones. Se marcan «no contactar» automáticamente al llegar." />

      <div className="fade-up mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-600/20 ring-inset" style={{ "--i": 1 } as React.CSSProperties}>
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p className="leading-relaxed">Respeta siempre estas solicitudes: no envíes comunicaciones comerciales a quien esté marcado como «no contactar». El borrado real de datos personales (derecho de supresión) se ejecutará con una función específica en una fase posterior.</p>
      </div>

      <div className="surface fade-up overflow-hidden" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow border-b bg-foreground/[0.025] text-left text-[0.62rem] text-muted-foreground">
                <th className="px-5 py-3.5 font-medium">Contacto</th><th className="px-3 py-3.5 font-medium">Motivo</th><th className="px-3 py-3.5 font-medium">Recibida</th><th className="px-3 py-3.5 font-medium">No contactar</th><th className="px-3 py-3.5 font-medium">Estado</th><th className="px-3 py-3.5 pr-5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70" data-testid="lista-bajas">
              {(data ?? []).map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-primary/[0.04]" data-testid="fila-baja">
                  <td className="px-5 py-3.5"><Link href={`/contactos/${b.contacto_id}`} className="group flex items-center gap-3"><AvatarIniciales nombre={b.contacto_nombre} email={b.contacto_email} size="sm" /><div><div className="font-semibold group-hover:text-primary">{b.contacto_nombre ?? "(sin nombre)"}</div><div className="text-xs text-muted-foreground">{b.contacto_email}</div></div></Link></td>
                  <td className="px-3 py-3.5">{MOTIVOS_BAJA[b.payload?.motivo] ?? b.payload?.motivo}</td>
                  <td className="px-3 py-3.5 text-muted-foreground" title={fechaHora(b.recibido_at)}>{hace(b.recibido_at)}</td>
                  <td className="px-3 py-3.5">{b.no_contactar ? <Badge variant="destructive">Sí</Badge> : <Badge variant="muted">No</Badge>}</td>
                  <td className="px-3 py-3.5"><Badge variant={ESTADOS_ENTRADA[b.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[b.estado]?.label}</Badge></td>
                  <td className="px-3 py-3.5 pr-5 text-right"><BajaAcciones entradaId={b.id} contactoId={b.contacto_id} noContactar={b.no_contactar} estado={b.estado} puedeEscribir={puedeEscribir(usuario.rol)} /></td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-20 text-center text-muted-foreground">No hay solicitudes de baja.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
