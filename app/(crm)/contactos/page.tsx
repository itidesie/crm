import Link from "next/link"
import { ChevronLeft, ChevronRight, Phone, Users, Ban } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { ImportarExcel } from "@/components/importar-excel"
import { CANALES_ORIGEN } from "@/lib/canal-origen"
import { fechaCorta, hace } from "@/lib/format"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { BuscadorContactos } from "./buscador"

export const dynamic = "force-dynamic"
const POR_PAGINA = 40

export default async function ContactosPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string; no?: string }> }) {
  const { q = "", pagina: pag, no } = await searchParams
  const pagina = Math.max(1, Number(pag) || 1)
  const usuario = await getUsuario()
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
      <PageHeader seccion="Entrada" titulo="Contactos" descripcion="Una ficha por persona: sus entradas de todos los formularios se unifican por email.">
        {puedeEscribir(usuario.rol) && <ImportarExcel />}
      </PageHeader>
      <BuscadorContactos q={q} no={no === "1"} />
      <div className="mb-3 flex items-center gap-2 px-1 text-sm text-muted-foreground" data-testid="total-contactos"><Users className="size-4" /><strong className="num text-base font-semibold text-foreground">{count ?? 0}</strong> contactos</div>

      <div className="surface fade-up overflow-hidden" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow border-b bg-foreground/[0.025] text-left text-[0.62rem] text-muted-foreground">
                <th className="px-5 py-3.5 font-medium">Contacto</th><th className="px-3 py-3.5 font-medium">Teléfono</th><th className="px-3 py-3.5 font-medium">Canal</th><th className="px-3 py-3.5 font-medium">Entradas</th><th className="px-3 py-3.5 font-medium">Responsable</th><th className="px-3 py-3.5 font-medium">Última entrada</th><th className="px-3 py-3.5 pr-5 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70" data-testid="lista-contactos">
              {(data ?? []).map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-primary/[0.04]">
                  <td className="px-5 py-3">
                    <Link href={`/contactos/${c.id}`} className="flex items-center gap-3">
                      <AvatarIniciales nombre={c.nombre} email={c.email_principal} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="truncate font-semibold group-hover:text-primary">{c.nombre ?? "(sin nombre)"}</span>
                          {c.no_contactar && <Badge variant="destructive"><Ban /> No contactar</Badge>}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.email_principal}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{c.telefono ? <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 opacity-60" />{c.telefono}</span> : "—"}</td>
                  <td className="px-3 py-3">{c.canal_origen ? <Badge variant={CANALES_ORIGEN[c.canal_origen]?.color ?? "muted"}>{CANALES_ORIGEN[c.canal_origen]?.label ?? c.canal_origen}</Badge> : <span className="text-muted-foreground/70">—</span>}</td>
                  <td className="px-3 py-3"><span className="num inline-flex min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{c.n_entradas}</span></td>
                  <td className="px-3 py-3">{c.propietario_id
                    ? <span className="inline-flex items-center gap-2"><AvatarIniciales nombre={nombres.get(c.propietario_id)} size="xs" /><span className="font-medium">{nombres.get(c.propietario_id)?.split(" ")[0]}</span></span>
                    : <span className="text-muted-foreground/70">Sin asignar</span>}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.ultima_entrada_at ? hace(c.ultima_entrada_at) : "—"}</td>
                  <td className="px-3 py-3 pr-5 text-muted-foreground">{fechaCorta(c.creado_at)}</td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={7} className="py-20 text-center text-muted-foreground">Sin resultados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {paginas > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Página <strong className="num text-foreground">{pagina}</strong> de {paginas}</span>
          <Button asChild variant="outline" size="sm" className={pagina <= 1 ? "pointer-events-none opacity-45" : ""}><Link href={enlace(pagina - 1)}><ChevronLeft /> Anterior</Link></Button>
          <Button asChild variant="outline" size="sm" className={pagina >= paginas ? "pointer-events-none opacity-45" : ""}><Link href={enlace(pagina + 1)}>Siguiente <ChevronRight /></Link></Button>
        </div>
      )}
    </>
  )
}
