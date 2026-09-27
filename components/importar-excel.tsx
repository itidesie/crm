"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileSpreadsheet, Loader2, Upload } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { importarContactosExcel, type FilaImportada, type ResumenImportacion } from "@/app/(crm)/acciones"

const MAX_FILAS = 2000

const CAMPOS = [
  { clave: "email", label: "Email", requerido: true, candidatos: ["email", "correo", "e-mail", "mail"] },
  { clave: "nombre", label: "Nombre", requerido: false, candidatos: ["nombre", "name", "nombre completo", "full name"] },
  { clave: "telefono", label: "Teléfono", requerido: false, candidatos: ["telefono", "teléfono", "phone", "tel", "movil", "móvil"] },
  { clave: "programa", label: "Programa de interés", requerido: false, candidatos: ["programa", "master", "máster", "curso", "interes", "interés"] },
  { clave: "canal_origen", label: "Canal (Instagram/Facebook/Web)", requerido: false, candidatos: ["canal", "origen", "source", "fuente"] },
] as const
type Clave = (typeof CAMPOS)[number]["clave"]

function normalizarTexto(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}
function detectarColumna(cabeceras: string[], candidatos: readonly string[]): number | null {
  const norm = cabeceras.map(normalizarTexto)
  const i = norm.findIndex((c) => candidatos.some((cand) => c === cand || c.includes(cand)))
  return i === -1 ? null : i
}
function detectarCanal(texto: string): string {
  const t = normalizarTexto(texto)
  if (t.includes("insta")) return "instagram"
  if (t.includes("face")) return "facebook"
  if (t.includes("web") || t.includes("landing")) return "web"
  return "otro"
}

export function ImportarExcel() {
  const [abierto, setAbierto] = useState(false)
  const [paso, setPaso] = useState<"archivo" | "mapeo" | "resultado">("archivo")
  const [cabeceras, setCabeceras] = useState<string[]>([])
  const [filas, setFilas] = useState<unknown[][]>([])
  const [mapeo, setMapeo] = useState<Record<Clave, number | null>>({ email: null, nombre: null, telefono: null, programa: null, canal_origen: null })
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null)
  const [pendiente, iniciar] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function reiniciar() {
    setPaso("archivo"); setCabeceras([]); setFilas([]); setError(null); setResumen(null)
    setMapeo({ email: null, nombre: null, telefono: null, programa: null, canal_origen: null })
    if (inputRef.current) inputRef.current.value = ""
  }

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError(null)
    try {
      const buffer = await archivo.arrayBuffer()
      const libro = XLSX.read(buffer, { type: "array" })
      const hoja = libro.Sheets[libro.SheetNames[0]]
      const filasCrudas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: false })
      if (filasCrudas.length < 2) { setError("El archivo no tiene filas de datos."); return }
      const [cab, ...resto] = filasCrudas
      const cabecerasTexto = cab.map((c) => String(c ?? "").trim())
      const filasDatos = resto.slice(0, MAX_FILAS)
      setCabeceras(cabecerasTexto)
      setFilas(filasDatos)
      setMapeo({
        email: detectarColumna(cabecerasTexto, CAMPOS[0].candidatos),
        nombre: detectarColumna(cabecerasTexto, CAMPOS[1].candidatos),
        telefono: detectarColumna(cabecerasTexto, CAMPOS[2].candidatos),
        programa: detectarColumna(cabecerasTexto, CAMPOS[3].candidatos),
        canal_origen: detectarColumna(cabecerasTexto, CAMPOS[4].candidatos),
      })
      setPaso("mapeo")
    } catch {
      setError("No se ha podido leer el archivo. Comprueba que es un .xlsx, .xls o .csv válido.")
    }
  }

  function construirFilas(): FilaImportada[] {
    const celda = (fila: unknown[], col: number | null) => (col === null ? null : String(fila[col] ?? "").trim() || null)
    const resultado: FilaImportada[] = []
    for (const fila of filas) {
      const email = celda(fila, mapeo.email)
      if (!email) continue
      const canalTexto = celda(fila, mapeo.canal_origen)
      resultado.push({
        email, nombre: celda(fila, mapeo.nombre), telefono: celda(fila, mapeo.telefono), programa: celda(fila, mapeo.programa),
        canal_origen: canalTexto ? detectarCanal(canalTexto) : null,
      })
    }
    return resultado
  }

  function confirmar() {
    const listas = construirFilas()
    if (!listas.length) { setError("Ninguna fila tiene email: revisa el mapeo de columnas."); return }
    iniciar(async () => {
      const r = await importarContactosExcel(listas)
      if (!r.ok) { toast.error(r.error); return }
      setResumen(r.resumen ?? null)
      setPaso("resultado")
      router.refresh()
    })
  }

  const filasValidas = paso === "mapeo" ? construirFilas() : []

  return (
    <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) reiniciar() }}>
      <Button variant="outline" onClick={() => setAbierto(true)} data-testid="abrir-importar-excel"><Upload /> Importar Excel</Button>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /> Importar leads desde Excel</DialogTitle>
          <DialogDescription>Cada fila se guarda como Contacto (o se actualiza si el email ya existe) y, si trae programa de interés, abre una oportunidad en Admisión.</DialogDescription>
        </DialogHeader>

        {paso === "archivo" && (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/15 p-8 text-center text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-primary/[0.03]">
              <Upload className="size-6 text-muted-foreground" />
              Haz clic para elegir un archivo .xlsx, .xls o .csv
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onArchivo} data-testid="input-excel" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {paso === "mapeo" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPOS.map((campo) => (
                <div key={campo.clave} className="space-y-1.5">
                  <label className="eyebrow text-[0.6rem] text-muted-foreground">{campo.label}{campo.requerido && " *"}</label>
                  <Select value={mapeo[campo.clave] === null ? "ninguna" : String(mapeo[campo.clave])} onValueChange={(v) => setMapeo((m) => ({ ...m, [campo.clave]: v === "ninguna" ? null : Number(v) }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">— No usar —</SelectItem>
                      {cabeceras.map((c, i) => <SelectItem key={i} value={String(i)}>{c || `Columna ${i + 1}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div>
              <p className="eyebrow mb-2 text-[0.6rem] text-muted-foreground">Vista previa ({filasValidas.length} de {filas.length} filas con email válido)</p>
              <div className="max-h-48 overflow-auto rounded-xl ring-1 ring-foreground/10">
                <table className="w-full text-xs">
                  <thead className="bg-foreground/[0.04]"><tr>{CAMPOS.map((c) => <th key={c.clave} className="px-2.5 py-2 text-left font-medium">{c.label}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border/60">
                    {filasValidas.slice(0, 5).map((f, i) => (
                      <tr key={i}><td className="px-2.5 py-1.5">{f.email}</td><td className="px-2.5 py-1.5">{f.nombre ?? "—"}</td><td className="px-2.5 py-1.5">{f.telefono ?? "—"}</td><td className="px-2.5 py-1.5">{f.programa ?? "—"}</td><td className="px-2.5 py-1.5">{f.canal_origen ?? "web"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={reiniciar}>Elegir otro archivo</Button>
              <Button onClick={confirmar} disabled={pendiente || !mapeo.email} data-testid="confirmar-importacion">{pendiente ? <Loader2 className="animate-spin" /> : <Upload />} Importar {filasValidas.length} contactos</Button>
            </DialogFooter>
          </div>
        )}

        {paso === "resultado" && resumen && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Nuevos", resumen.nuevos], ["Actualizados", resumen.actualizados], ["Oportunidades", resumen.oportunidades], ["Omitidos", resumen.omitidos]].map(([label, n]) => (
                <div key={label as string} className="rounded-2xl bg-foreground/[0.04] p-3.5 text-center ring-1 ring-foreground/[0.06] ring-inset">
                  <div className="num text-2xl font-bold">{n as number}</div>
                  <div className="eyebrow mt-1 text-[0.55rem] text-muted-foreground">{label as string}</div>
                </div>
              ))}
            </div>
            <DialogFooter><Button onClick={() => setAbierto(false)}>Cerrar</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
