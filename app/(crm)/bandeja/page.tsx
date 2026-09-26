import { createClient } from "@/lib/supabase/server"
import { getUsuario, puedeEscribir } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { BandejaCliente } from "./bandeja-cliente"
import type { Entrada, UsuarioLista } from "@/lib/tipos"

export const dynamic = "force-dynamic"
const POR_PAGINA = 40

export default async function BandejaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams
  const usuario = await getUsuario()
  const supabase = await createClient()

  // Idempotente y barato: incorpora al CRM lo último que haya llegado por la web (además del cron de 30 s).
  await supabase.rpc("procesar_entradas")

  const pagina = Math.max(1, Number(f.pagina) || 1)
  let consulta = supabase.from("v_bandeja").select("*", { count: "exact" }).order("recibido_at", { ascending: false })
  if (f.tipo) consulta = consulta.eq("tipo", f.tipo)
  if (f.estado) consulta = consulta.eq("estado", f.estado)
  if (f.leida === "no") consulta = consulta.is("leida_at", null)
  if (f.leida === "si") consulta = consulta.not("leida_at", "is", null)
  if (f.desde) consulta = consulta.gte("recibido_at", new Date(f.desde).toISOString())
  if (f.hasta) consulta = consulta.lte("recibido_at", new Date(new Date(f.hasta).getTime() + 86399000).toISOString())
  if (f.q?.trim()) consulta = consulta.ilike("busqueda", `%${f.q.trim().toLowerCase().replace(/[%,]/g, " ")}%`)
  const { data, count } = await consulta.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)

  const { data: usuarios } = await supabase.from("usuarios").select("id, nombre, rol").eq("activo", true).order("nombre")

  return (
    <>
      <PageHeader titulo="Bandeja de entradas" descripcion="Todo lo que llega por la web, de más reciente a más antiguo. Se actualiza en tiempo real." />
      <BandejaCliente
        filas={(data ?? []) as Entrada[]} total={count ?? 0} pagina={pagina} porPagina={POR_PAGINA}
        filtros={{ tipo: f.tipo ?? "", estado: f.estado ?? "", leida: f.leida ?? "", desde: f.desde ?? "", hasta: f.hasta ?? "", q: f.q ?? "" }}
        usuarios={(usuarios ?? []) as UsuarioLista[]} puedeEscribir={puedeEscribir(usuario.rol)}
      />
    </>
  )
}
