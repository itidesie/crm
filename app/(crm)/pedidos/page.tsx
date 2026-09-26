import Link from "next/link"
import { ShoppingBag, Wallet, Hourglass } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { AvatarIniciales } from "@/components/avatar-iniciales"
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
  const pagados = (data ?? []).filter((p) => p.payload?.status === "paid")
  const importePagado = pagados.reduce((a, p) => a + Number(p.payload?.total_amount ?? 0), 0)

  const resumen = [
    { icono: ShoppingBag, etiqueta: "Pedidos", valor: String(data?.length ?? 0), tono: "text-blue-600", testid: "total-pedidos" },
    { icono: Wallet, etiqueta: "Importe total", valor: euros(total), tono: "text-emerald-600" },
    { icono: Hourglass, etiqueta: "Pendiente de cobro", valor: euros(total - importePagado), tono: "text-amber-600" },
  ]

  return (
    <>
      <PageHeader seccion="Operaciones" titulo="Pedidos" descripcion="Compras iniciadas en la tienda de la web (checkout con Flywire)." />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {resumen.map(({ icono: I, etiqueta, valor, tono, testid }, i) => (
          <div key={etiqueta} style={{ "--i": i + 1 } as React.CSSProperties} className="surface fade-up flex items-center gap-4 p-5">
            <span className={`flex size-12 items-center justify-center rounded-2xl ${tono}`} style={{ backgroundColor: "color-mix(in oklab, currentColor 12%, transparent)" }}><I className="size-5" /></span>
            <div><div className="num text-3xl leading-none font-bold" data-testid={testid}>{valor}</div><div className="eyebrow mt-2 text-[0.6rem] text-muted-foreground">{etiqueta}</div></div>
          </div>
        ))}
      </div>

      <div className="mb-4"><FiltroPedidos pago={pago ?? ""} /></div>

      <div className="surface fade-up overflow-hidden" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow border-b bg-foreground/[0.025] text-left text-[0.62rem] text-muted-foreground">
                <th className="px-5 py-3.5 font-medium">Pedido</th><th className="px-3 py-3.5 font-medium">Contacto</th><th className="px-3 py-3.5 font-medium">Líneas</th><th className="px-3 py-3.5 text-right font-medium">Importe</th><th className="px-3 py-3.5 font-medium">Pago</th><th className="px-3 py-3.5 pr-5 text-right font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70" data-testid="lista-pedidos">
              {(data ?? []).map((p) => (
                <tr key={p.id} className="group transition-colors hover:bg-primary/[0.04]">
                  <td className="px-5 py-3.5"><Link href={`/pedidos/${p.id}`} className="num rounded-lg bg-primary/10 px-2.5 py-1 text-[0.85rem] font-bold text-primary transition group-hover:bg-primary group-hover:text-white">#{p.payload?.id}</Link></td>
                  <td className="px-3 py-3.5"><div className="flex items-center gap-3"><AvatarIniciales nombre={p.contacto_nombre} email={p.contacto_email} size="sm" /><div><div className="font-semibold">{p.contacto_nombre ?? "(sin nombre)"}</div><div className="text-xs text-muted-foreground">{p.contacto_email}</div></div></div></td>
                  <td className="max-w-64 truncate px-3 py-3.5 text-muted-foreground">{(p.payload?.items ?? []).map((i: any) => i.product_name).join(", ")}</td>
                  <td className="num px-3 py-3.5 text-right text-base font-semibold">{euros(p.payload?.total_amount)}</td>
                  <td className="px-3 py-3.5"><Badge variant={p.payload?.status === "paid" ? "success" : "warning"}>{p.payload?.status === "paid" ? "Pagado" : "Pendiente"}</Badge></td>
                  <td className="px-3 py-3.5 pr-5 text-right text-muted-foreground" title={fechaHora(p.recibido_at)}>{hace(p.recibido_at)}</td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-20 text-center text-muted-foreground">No hay pedidos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Nota: la web aún no recibe la confirmación de pago de Flywire, por eso casi todos figuran como «Pendiente».</p>
    </>
  )
}
