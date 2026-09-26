import { Badge } from "@/components/ui/badge"
import { euros, fechaCorta } from "@/lib/format"
import { MOTIVOS_BAJA } from "@/lib/tipos"

function Campo({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "") return null
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 py-2.5 text-sm">
      <dt className="eyebrow text-[0.6rem] text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  )
}

/** Muestra el contenido de una entrada según su tipo (lo que envió la persona en el formulario de la web). */
export function EntradaDetalle({ tipo, payload: p }: { tipo: string; payload: Record<string, any> }) {
  return (
    <dl className="divide-y divide-border/70 rounded-2xl bg-foreground/[0.03] px-4 py-1.5 ring-1 ring-foreground/[0.06] ring-inset">
      {tipo === "solicitud_admision" && (
        <>
          <Campo etiqueta="Programa" valor={p.programa_solicitado} />
          <Campo etiqueta="Origen" valor={p.origen} />
          <Campo etiqueta="Teléfono" valor={p.telefono} />
          <Campo etiqueta="Residencia" valor={[p.ciudad, p.pais].filter(Boolean).join(", ")} />
          <Campo etiqueta="Nacimiento" valor={p.fecha_nacimiento ? fechaCorta(p.fecha_nacimiento) : null} />
          <Campo etiqueta="Titulación" valor={p.titulacion_previa} />
          <Campo etiqueta="Universidad" valor={p.universidad_origen} />
          <Campo etiqueta="Mensaje" valor={p.mensaje} />
          <Campo etiqueta="Estado en web" valor={p.estado && <Badge variant="muted">{p.estado}</Badge>} />
        </>
      )}
      {tipo === "mensaje_contacto" && (
        <>
          <Campo etiqueta="Asunto" valor={p.asunto} />
          <Campo etiqueta="Mensaje" valor={<span className="font-normal whitespace-pre-line">{p.mensaje}</span>} />
          <Campo etiqueta="Teléfono" valor={p.telefono} />
          <Campo etiqueta="Programa" valor={p.programa} />
          <Campo etiqueta="Motivo" valor={p.motivo} />
        </>
      )}
      {tipo === "descarga_catalogo" && (
        <>
          <Campo etiqueta="Catálogo" valor={p.catalogo_nombre ?? p.catalogo_id} />
          <Campo etiqueta="Programa" valor={p.programa} />
          <Campo etiqueta="Teléfono" valor={p.telefono} />
        </>
      )}
      {tipo === "candidatura" && (
        <>
          <Campo etiqueta="Puesto" valor={p.oferta_puesto} />
          <Campo etiqueta="Teléfono" valor={p.telefono} />
          <Campo etiqueta="Mensaje" valor={p.mensaje} />
        </>
      )}
      {tipo === "pedido" && (
        <>
          <Campo etiqueta="Pedido" valor={`#${p.id}`} />
          <Campo etiqueta="Pago" valor={<Badge variant={p.status === "paid" ? "success" : "warning"}>{p.status === "paid" ? "Pagado" : "Pendiente"}</Badge>} />
          <Campo etiqueta="Total" valor={<strong className="num text-base">{euros(p.total_amount)}</strong>} />
          <Campo etiqueta="Teléfono" valor={p.customer_phone} />
          <Campo etiqueta="Líneas" valor={(p.items ?? []).map((i: any) => `${i.quantity} × ${i.product_name} (${euros(i.price)})`).join(" · ")} />
        </>
      )}
      {tipo === "baja" && (
        <>
          <Campo etiqueta="Motivo" valor={MOTIVOS_BAJA[p.motivo] ?? p.motivo} />
          <Campo etiqueta="Email" valor={p.email} />
        </>
      )}
      {tipo === "lead_legacy" && (
        <>
          <Campo etiqueta="Interés" valor={p.master_interes} />
          <Campo etiqueta="Sesión" valor={p.session_date ? `${fechaCorta(p.session_date)} ${String(p.session_time).slice(0, 5)}` : null} />
          <Campo etiqueta="Teléfono" valor={p.phone} />
          <Campo etiqueta="Estado" valor={p.status} />
        </>
      )}
    </dl>
  )
}
