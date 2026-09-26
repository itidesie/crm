import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { euros, fechaHora, hace } from "@/lib/format"
import { FiltroPedidos } from "./filtro"

export const dynamic = "force-dynamic"

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ pago?: string }> }) {
  const { pago } = await searchParams
  const supabase = await createClient()
  await supabase.rpc("procesar_entradas")
  let consulta = supabase.from("v_bandeja").select("*").eq("tipo", "pedido").order("recibido_at", { ascending: false })
  if (pago === "paid" || pago === "pending") consulta = consulta.eq("payload->>status", pago)
  const { data } = await consulta
  const total = (data ?? []).reduce((a, p) => a + Number(p.payload?.total_amount ?? 0), 0)

  return (
    <>
      <PageHeader titulo="Pedidos" descripcion="Compras iniciadas en la tienda de la web (checkout con Flywire)." />
      <FiltroPedidos pago={pago ?? ""} />
      <div className="mb-2 flex justify-between text-sm text-muted-foreground"><span data-testid="total-pedidos">{data?.length ?? 0} pedidos</span><span>Importe total: <strong className="text-foreground">{euros(total)}</strong></span></div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">Pedido</th><th className="px-3 py-2.5">Contacto</th><th className="px-3 py-2.5">Líneas</th><th className="px-3 py-2.5 text-right">Importe</th><th className="px-3 py-2.5">Pago</th><th className="px-3 py-2.5 pr-4 text-right">Fecha</th></tr>
          </thead>
          <tbody className="divide-y" data-testid="lista-pedidos">
            {(data ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-muted/40">
                <td className="px-4 py-3"><Link href={`/pedidos/${p.id}`} className="font-medium text-primary hover:underline">#{p.payload?.id}</Link></td>
                <td className="px-3 py-3"><div>{p.contacto_nombre ?? "(sin nombre)"}</div><div className="text-xs text-muted-foreground">{p.contacto_email}</div></td>
                <td className="px-3 py-3 text-muted-foreground">{(p.payload?.items ?? []).map((i: any) => i.product_name).join(", ")}</td>
                <td className="px-3 py-3 text-right font-medium">{euros(p.payload?.total_amount)}</td>
                <td className="px-3 py-3"><Badge variant={p.payload?.status === "paid" ? "success" : "warning"}>{p.payload?.status === "paid" ? "Pagado" : "Pendiente"}</Badge></td>
                <td className="px-3 py-3 pr-4 text-right text-muted-foreground" title={fechaHora(p.recibido_at)}>{hace(p.recibido_at)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No hay pedidos.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Nota: la web aún no recibe la confirmación de pago de Flywire, por eso casi todos figuran como «Pendiente».</p>
    </>
  )
}
