import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Mail, Phone, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { AvatarIniciales } from "@/components/avatar-iniciales"
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
      <Link href="/pedidos" className="fade-in mb-5 inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] py-1.5 pr-3.5 pl-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-foreground/[0.09] hover:text-foreground"><ArrowLeft className="size-4" /> Pedidos</Link>
      <div className="fade-up mb-7 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.75rem)] leading-none font-bold tracking-[-0.03em]" data-testid="pedido-titulo">Pedido #{o.id}</h1>
        <Badge variant={o.status === "paid" ? "success" : "warning"}>{o.status === "paid" ? "Pagado" : "Pendiente de pago"}</Badge>
        <Badge variant={ESTADOS_ENTRADA[p.estado]?.color ?? "muted"}>{ESTADOS_ENTRADA[p.estado]?.label}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recibo */}
        <section className="surface fade-up relative overflow-hidden lg:col-span-2" style={{ "--i": 1 } as React.CSSProperties}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[#4da0ff] to-[#ffba08]" />
          <div className="px-6 pt-7 pb-4"><h2 className="font-display text-lg font-semibold tracking-tight">Líneas del pedido</h2><p className="eyebrow mt-1 text-[0.6rem] text-muted-foreground">{fechaHora(p.recibido_at)}</p></div>
          <table className="w-full text-sm">
            <thead><tr className="eyebrow border-y bg-foreground/[0.025] text-left text-[0.6rem] text-muted-foreground"><th className="px-6 py-3 font-medium">Producto</th><th className="px-3 py-3 text-right font-medium">Cant.</th><th className="px-3 py-3 text-right font-medium">Precio</th><th className="px-6 py-3 text-right font-medium">Subtotal</th></tr></thead>
            <tbody className="divide-y divide-dashed divide-border">
              {items.map((i) => <tr key={i.id}><td className="px-6 py-4 font-semibold">{i.product_name}</td><td className="num px-3 py-4 text-right">{i.quantity}</td><td className="num px-3 py-4 text-right text-muted-foreground">{euros(i.price)}</td><td className="num px-6 py-4 text-right font-semibold">{euros(i.price * i.quantity)}</td></tr>)}
              {items.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Sin líneas registradas.</td></tr>}
            </tbody>
          </table>
          <div className="flex items-baseline justify-between border-t-2 border-dashed bg-foreground/[0.02] px-6 py-5"><span className="eyebrow text-xs text-muted-foreground">Total</span><span className="num text-4xl font-bold">{euros(o.total_amount)}</span></div>
        </section>

        <section className="surface fade-up h-fit p-6" style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Cliente</h2>
          <div className="flex items-center gap-3.5">
            <AvatarIniciales nombre={p.contacto_nombre ?? o.customer_name} email={o.customer_email} size="lg" />
            <div className="min-w-0">
              <Link href={`/contactos/${p.contacto_id}`} className="group inline-flex items-center gap-1 font-display text-lg leading-tight font-semibold hover:text-primary">{p.contacto_nombre ?? o.customer_name}<ArrowUpRight className="size-4 opacity-40 transition group-hover:opacity-100" /></Link>
            </div>
          </div>
          <div className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Mail className="size-4" />{o.customer_email}</div>
            {o.customer_phone && <div className="flex items-center gap-2"><Phone className="size-4" />{o.customer_phone}</div>}
          </div>
          <div className="mt-5 border-t pt-4 text-xs text-muted-foreground">{o.payment_id ? `Pago ${o.payment_id}` : "Sin identificador de pago todavía"}</div>
        </section>
      </div>
    </>
  )
}
