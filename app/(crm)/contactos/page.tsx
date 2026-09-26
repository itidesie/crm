import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fechaCorta, hace } from "@/lib/format"
import { BuscadorContactos } from "./buscador"

export const dynamic = "force-dynamic"
const POR_PAGINA = 40

export default async function ContactosPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string; no?: string }> }) {
  const { q = "", pagina: pag, no } = await searchParams
  const pagina = Math.max(1, Number(pag) || 1)
  const supabase = await createClient()

  let consulta = supabase.from("v_contactos").select("*", { count: "exact" }).order("ultima_entrada_at", { ascending: false, nullsFirst: false })
  if (q.trim()) consulta = consulta.ilike("busqueda", `%${q.trim().toLowerCase().replace(/[%,]/g, " ")}%`)
  if (no === "1") consulta = consulta.eq("no_contactar", true)
  const { data, count } = await consulta.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
  const { data: usuarios } = await supabase.from("usuarios").select("id, nombre")
  const nombres = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]))
  const paginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA))
  const enlace = (p: number) => `/contactos?${new URLSearchParams({ ...(q ? { q } : {}), ...(no ? { no } : {}), pagina: String(p) })}`

  return (
    <>
      <PageHeader titulo="Contactos" descripcion="Una ficha por persona: sus entradas de todos los formularios se unifican por email." />
      <BuscadorContactos q={q} no={no === "1"} />
      <div className="mb-2 text-sm text-muted-foreground" data-testid="total-contactos">{count ?? 0} contactos</div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">Contacto</th><th className="px-3 py-2.5">Teléfono</th><th className="px-3 py-2.5">Entradas</th><th className="px-3 py-2.5">Responsable</th><th className="px-3 py-2.5">Última entrada</th><th className="px-3 py-2.5 pr-4">Alta</th></tr>
          </thead>
          <tbody className="divide-y" data-testid="lista-contactos">
            {(data ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-muted/40">
                <td className="px-4 py-3"><Link href={`/contactos/${c.id}`} className="font-medium text-primary hover:underline">{c.nombre ?? "(sin nombre)"}</Link>
                  {c.no_contactar && <Badge variant="destructive" className="ml-2">No contactar</Badge>}
                  <div className="text-xs text-muted-foreground">{c.email_principal}</div></td>
                <td className="px-3 py-3">{c.telefono ?? "—"}</td>
                <td className="px-3 py-3"><Badge variant="secondary">{c.n_entradas}</Badge></td>
                <td className="px-3 py-3">{c.propietario_id ? nombres.get(c.propietario_id) : <span className="text-muted-foreground">Sin asignar</span>}</td>
                <td className="px-3 py-3 text-muted-foreground">{c.ultima_entrada_at ? hace(c.ultima_entrada_at) : "—"}</td>
                <td className="px-3 py-3 pr-4 text-muted-foreground">{fechaCorta(c.creado_at)}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Página {pagina} de {paginas}</span>
          <Button asChild variant="outline" size="sm" disabled={pagina <= 1}><Link href={enlace(pagina - 1)}>Anterior</Link></Button>
          <Button asChild variant="outline" size="sm" disabled={pagina >= paginas}><Link href={enlace(pagina + 1)}>Siguiente</Link></Button>
        </div>
      )}
    </>
  )
}
