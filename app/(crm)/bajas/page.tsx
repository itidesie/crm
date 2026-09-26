import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
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
      <PageHeader titulo="Solicitudes de baja" descripcion="Personas que piden la supresión de sus datos o no recibir comunicaciones. Se marcan «no contactar» automáticamente al llegar." />
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">Contacto</th><th className="px-3 py-2.5">Motivo</th><th className="px-3 py-2.5">Recibida</th><th className="px-3 py-2.5">No contactar</th><th className="px-3 py-2.5">Estado</th><th className="px-3 py-2.5 pr-4 text-right">Acciones</th></tr>
          </thead>
          <tbody className="divide-y" data-testid="lista-bajas">
            {(data ?? []).map((b) => (
              <tr key={b.id} className="hover:bg-muted/40" data-testid="fila-baja">
                <td className="px-4 py-3"><Link href={`/contactos/${b.contacto_id}`} className="font-medium text-primary hover:underline">{b.contacto_nombre ?? "(sin nombre)"}</Link><div className="text-xs text-muted-foreground">{b.contacto_email}</div></td>
                <td className="px-3 py-3">{MOTIVOS_BAJA[b.payload?.motivo] ?? b.payload?.motivo}</td>
                <td className="px-3 py-3 text-muted-foreground" title={fechaHora(b.recibido_at)}>{hace(b.recibido_at)}</td>
                <td className="px-3 py-3">{b.no_contactar ? <Badge variant="destructive">Sí</Badge> : <Badge variant="muted">No</Badge>}</td>
                <td className="px-3 py-3"><Badge variant={ESTADOS_ENTRADA[b.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[b.estado]?.label}</Badge></td>
                <td className="px-3 py-3 pr-4 text-right"><BajaAcciones entradaId={b.id} contactoId={b.contacto_id} noContactar={b.no_contactar} estado={b.estado} puedeEscribir={puedeEscribir(usuario.rol)} /></td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No hay solicitudes de baja.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">El borrado real de datos personales (derecho de supresión) se ejecutará con una función específica en una fase posterior.</p>
    </>
  )
}
