import { createClient } from "@/lib/supabase/server"
import { getUsuario } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"
import { PipelineBoard, type Etapa, type Opp } from "@/components/pipeline-board"

export async function PipelinePage({ codigo, titulo, descripcion }: { codigo: "admision" | "empleo"; titulo: string; descripcion: string }) {
  const usuario = await getUsuario()
  const supabase = await createClient()
  const { data: pipeline } = await supabase.from("pipelines").select("id").eq("codigo", codigo).single()
  const [etapas, opps, usuarios] = await Promise.all([
    supabase.from("etapas").select("id, nombre, orden, tipo").eq("pipeline_id", pipeline?.id ?? "").order("orden"),
    supabase.from("oportunidades")
      .select("id, titulo, programa, etapa_id, propietario_id, creado_at, contacto:contactos(id, nombre, email_principal), propietario:usuarios(nombre)")
      .eq("pipeline_id", pipeline?.id ?? "").order("creado_at", { ascending: false }),
    supabase.from("usuarios").select("id, nombre").eq("activo", true).order("nombre"),
  ])
  return (
    <>
      <PageHeader titulo={titulo} descripcion={descripcion} />
      <PipelineBoard etapas={(etapas.data ?? []) as Etapa[]} oportunidades={(opps.data ?? []) as unknown as Opp[]}
        usuarios={usuarios.data ?? []} yo={usuario.id} rol={usuario.rol} conProgramas={codigo === "admision"} />
    </>
  )
}
