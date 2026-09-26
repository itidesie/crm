import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ESTADOS_ENTRADA } from "@/lib/tipos"
import { euros, fechaHora } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: p } = await supabase.from("v_bandeja").select("*").eq("id", id).eq("tipo", "pedido").maybeSingle()
  if (!p) notFound()
  const o = p.payload
  const items: any[] = o.items ?? []

  return (
    <>
      <Link href="/pedidos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Pedidos</Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="pedido-titulo">Pedido #{o.id}</h1>
        <Badge variant={o.status === "paid" ? "success" : "warning"}>{o.status === "paid" ? "Pagado" : "Pendiente de pago"}</Badge>
        <Badge variant={ESTADOS_ENTRADA[p.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[p.estado]?.label}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Líneas del pedido</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-6 py-2.5">Producto</th><th className="px-3 py-2.5 text-right">Cant.</th><th className="px-3 py-2.5 text-right">Precio</th><th className="px-6 py-2.5 text-right">Subtotal</th></tr></thead>
              <tbody className="divide-y">
                {items.map((i) => <tr key={i.id}><td className="px-6 py-3">{i.product_name}</td><td className="px-3 py-3 text-right">{i.quantity}</td><td className="px-3 py-3 text-right">{euros(i.price)}</td><td className="px-6 py-3 text-right">{euros(i.price * i.quantity)}</td></tr>)}
                {items.length === 0 && <tr><td colSpan={4} className="px-6 py-6 text-center text-muted-foreground">Sin líneas registradas.</td></tr>}
              </tbody>
              <tfoot><tr className="border-t"><td colSpan={3} className="px-6 py-3 text-right font-medium">Total</td><td className="px-6 py-3 text-right text-base font-semibold">{euros(o.total_amount)}</td></tr></tfoot>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><Link href={`/contactos/${p.contacto_id}`} className="font-medium text-primary hover:underline">{p.contacto_nombre ?? o.customer_name}</Link></div>
            <div className="text-muted-foreground">{o.customer_email}</div>
            {o.customer_phone && <div className="text-muted-foreground">{o.customer_phone}</div>}
            <div className="border-t pt-2 text-xs text-muted-foreground">Creado el {fechaHora(p.recibido_at)}{o.payment_id ? ` · pago ${o.payment_id}` : ""}</div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
