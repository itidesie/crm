import { Badge } from "@/components/ui/badge"
import { euros, fechaCorta } from "@/lib/format"
import { MOTIVOS_BAJA } from "@/lib/tipos"

function Campo({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "") return null
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="break-words">{valor}</dd>
    </div>
  )
}

/** Muestra el contenido de una entrada según su tipo (lo que envió la persona en el formulario de la web). */
export function EntradaDetalle({ tipo, payload: p }: { tipo: string; payload: Record<string, any> }) {
  return (
    <dl className="divide-y rounded-lg border bg-muted/30 px-4 py-2">
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
          <Campo etiqueta="Estado en la web" valor={p.estado && <Badge variant="muted">{p.estado}</Badge>} />
        </>
      )}
      {tipo === "mensaje_contacto" && (
        <>
          <Campo etiqueta="Asunto" valor={p.asunto} />
          <Campo etiqueta="Mensaje" valor={<span className="whitespace-pre-line">{p.mensaje}</span>} />
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
          <Campo etiqueta="Estado de pago" valor={<Badge variant={p.status === "paid" ? "success" : "warning"}>{p.status === "paid" ? "Pagado" : "Pendiente"}</Badge>} />
          <Campo etiqueta="Total" valor={<strong>{euros(p.total_amount)}</strong>} />
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
          <Campo etiqueta="Sesión solicitada" valor={p.session_date ? `${fechaCorta(p.session_date)} ${String(p.session_time).slice(0, 5)}` : null} />
          <Campo etiqueta="Teléfono" valor={p.phone} />
          <Campo etiqueta="Estado" valor={p.status} />
        </>
      )}
    </dl>
  )
}
