"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { CornerDownLeft, Search, Loader2, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { ENLACES_NAV } from "@/components/sidebar"

interface ContactoRes { id: string; nombre: string | null; email_principal: string; telefono: string | null }
type Resultado =
  | { clave: string; tipo: "pagina"; etiqueta: string; href: string; icon: (typeof ENLACES_NAV)[number]["icon"] }
  | { clave: string; tipo: "contacto"; etiqueta: string; sub: string; href: string; c: ContactoRes }
  | { clave: string; tipo: "bandeja"; etiqueta: string; href: string }

export function CommandPalette({ abierto, alCambiar }: { abierto: boolean; alCambiar: (v: boolean) => void }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [contactos, setContactos] = useState<ContactoRes[]>([])
  const [buscando, setBuscando] = useState(false)
  const [activo, setActivo] = useState(0)
  const lista = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!abierto) { setQ(""); setContactos([]); setActivo(0) } }, [abierto])

  // Búsqueda de contactos (respeta los permisos: usa la sesión del usuario)
  useEffect(() => {
    const texto = q.trim().toLowerCase().replace(/[%,]/g, " ")
    if (texto.length < 2) { setContactos([]); setBuscando(false); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      const { data } = await createClient().from("v_contactos").select("id, nombre, email_principal, telefono").ilike("busqueda", `%${texto}%`).limit(6)
      setContactos((data ?? []) as ContactoRes[]); setBuscando(false)
    }, 180)
    return () => clearTimeout(t)
  }, [q])

  const resultados = useMemo<Resultado[]>(() => {
    const t = q.trim().toLowerCase()
    const paginas: Resultado[] = ENLACES_NAV.filter((e) => !t || e.label.toLowerCase().includes(t))
      .map((e) => ({ clave: `p-${e.href}`, tipo: "pagina", etiqueta: e.label, href: e.href, icon: e.icon }))
    const cs: Resultado[] = contactos.map((c) => ({ clave: `c-${c.id}`, tipo: "contacto", etiqueta: c.nombre ?? c.email_principal, sub: c.nombre ? c.email_principal : (c.telefono ?? ""), href: `/contactos/${c.id}`, c }))
    const extra: Resultado[] = t.length >= 2 ? [{ clave: "b", tipo: "bandeja", etiqueta: `Buscar «${q.trim()}» en la bandeja`, href: `/bandeja?q=${encodeURIComponent(q.trim())}` }] : []
    return [...cs, ...extra, ...paginas]
  }, [q, contactos])

  useEffect(() => setActivo(0), [resultados.length])
  useEffect(() => { lista.current?.querySelector<HTMLElement>(`[data-i="${activo}"]`)?.scrollIntoView({ block: "nearest" }) }, [activo])

  const ir = (r: Resultado) => { alCambiar(false); router.push(r.href) }
  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => Math.min(i + 1, resultados.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)) }
    else if (e.key === "Enter" && resultados[activo]) { e.preventDefault(); ir(resultados[activo]) }
  }

  let ultimoGrupo = ""
  const grupoDe = (r: Resultado) => (r.tipo === "contacto" ? "Contactos" : r.tipo === "bandeja" ? "Acciones" : "Ir a")

  return (
    <Dialog.Root open={abierto} onOpenChange={alCambiar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[4px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={teclas}
          className="fixed top-[14vh] left-1/2 z-[61] w-[min(40rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-3xl bg-card shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.1),0_50px_100px_-20px_oklch(0.2_0.06_266/0.6)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">Buscar y navegar</Dialog.Title>
          <div className="flex items-center gap-3 border-b px-5">
            {buscando ? <Loader2 className="size-5 animate-spin text-primary" /> : <Search className="size-5 text-muted-foreground" />}
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Busca un contacto por nombre, email o teléfono, o salta a una pantalla…"
              className="h-16 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
              aria-label="Buscar" data-testid="paleta-input"
            />
            <kbd className="eyebrow rounded-md bg-muted px-2 py-1 text-[0.6rem] tracking-normal text-muted-foreground normal-case">Esc</kbd>
          </div>
          <div ref={lista} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
            {resultados.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Sin resultados para «{q}».</div>}
            {resultados.map((r, i) => {
              const g = grupoDe(r)
              const cabecera = g !== ultimoGrupo ? (ultimoGrupo = g) : null
              return (
                <div key={r.clave}>
                  {cabecera && <div className="eyebrow px-3 pt-3 pb-1.5 text-[0.6rem] text-muted-foreground/80">{cabecera}</div>}
                  <button
                    type="button" role="option" aria-selected={i === activo} data-i={i}
                    onMouseMove={() => setActivo(i)} onClick={() => ir(r)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors", i === activo ? "bg-primary/10" : "hover:bg-muted")}
                  >
                    {r.tipo === "pagina" && <span className={cn("flex size-9 items-center justify-center rounded-xl", i === activo ? "bg-primary text-white" : "bg-muted text-muted-foreground")}><r.icon className="size-4" /></span>}
                    {r.tipo === "contacto" && <AvatarIniciales nombre={r.c.nombre} email={r.c.email_principal} size="sm" className="!size-9" />}
                    {r.tipo === "bandeja" && <span className="flex size-9 items-center justify-center rounded-xl bg-[#ffba08]/20 text-amber-700"><Search className="size-4" /></span>}
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-semibold", i === activo && "text-primary")}>{r.etiqueta}</span>
                      {r.tipo === "contacto" && r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                    </span>
                    {i === activo ? <CornerDownLeft className="size-4 text-primary" /> : <ArrowUpRight className="size-4 text-muted-foreground/40" />}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between border-t bg-muted/50 px-5 py-2.5 text-[0.7rem] text-muted-foreground">
            <span className="flex items-center gap-3"><span><kbd className="font-mono">↑↓</kbd> moverse</span><span><kbd className="font-mono">↵</kbd> abrir</span></span>
            <span className="eyebrow text-[0.58rem]">IDESIE CRM</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
