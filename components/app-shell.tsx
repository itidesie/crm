"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Menu, Search } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { NavContenido, Sidebar, type DatosMenu } from "@/components/sidebar"
import { CommandPalette } from "@/components/command-palette"
import { LogoMarca } from "@/components/logo"
import { cn } from "@/lib/utils"

const CLAVE = "crm-menu-colapsado"

export function AppShell({ datos, caducaEn, children }: { datos: DatosMenu; caducaEn: number | null; children: React.ReactNode }) {
  const pathname = usePathname()
  const [colapsado, setColapsado] = useState(false)
  const [paleta, setPaleta] = useState(false)
  const [movil, setMovil] = useState(false)

  useEffect(() => { try { setColapsado(localStorage.getItem(CLAVE) === "1") } catch {} }, [])
  const alternar = () => setColapsado((c) => { try { localStorage.setItem(CLAVE, c ? "0" : "1") } catch {} return !c })
  useEffect(() => setMovil(false), [pathname])
  // A las 3 h de iniciar sesión se cierra aunque la pestaña siga abierta sin navegar
  useEffect(() => {
    if (caducaEn === null) return
    const t = setTimeout(() => window.location.assign("/login?expirada=1"), Math.max(0, caducaEn - Date.now()))
    return () => clearTimeout(t)
  }, [caducaEn])
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaleta((p) => !p) } }
    window.addEventListener("keydown", f)
    return () => window.removeEventListener("keydown", f)
  }, [])

  return (
    <TooltipProvider delayDuration={120}>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-white">Saltar al contenido</a>
      <Sidebar datos={datos} colapsado={colapsado} alColapsar={alternar} alBuscar={() => setPaleta(true)} />

      {/* Barra superior móvil */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 px-4 lg:hidden">
        <LogoMarca className="!size-8 !rounded-xl" />
        <span className="font-display text-lg font-bold tracking-tight">IDESIE <span className="eyebrow ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[0.55rem] text-primary">CRM</span></span>
        <div className="flex-1" />
        <button type="button" onClick={() => setPaleta(true)} aria-label="Buscar" className="flex size-9 items-center justify-center rounded-xl bg-foreground/[0.06]"><Search className="size-4" /></button>
        <button type="button" onClick={() => setMovil(true)} aria-label="Abrir menú" className="flex size-9 items-center justify-center rounded-xl bg-foreground/[0.06]"><Menu className="size-4" /></button>
      </header>
      <Sheet open={movil} onOpenChange={setMovil}>
        <SheetContent side="left" className="grain overflow-hidden border-0 bg-[linear-gradient(165deg,oklch(0.23_0.05_266),oklch(0.15_0.04_270)_60%)] p-0 text-sidebar-foreground [&>button]:text-white/70 [&>button]:bg-white/10">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <div className="relative flex h-full flex-col">
            <NavContenido datos={datos} alNavegar={() => setMovil(false)} alBuscar={() => { setMovil(false); setPaleta(true) }} />
          </div>
        </SheetContent>
      </Sheet>

      <CommandPalette abierto={paleta} alCambiar={setPaleta} />

      <main id="contenido" className={cn("min-h-screen transition-[padding] duration-500 ease-[var(--ease-out-expo)]", colapsado ? "lg:pl-[6.5rem]" : "lg:pl-[18.5rem]")}>
        <div className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 lg:py-9 lg:pr-9 lg:pl-3">{children}</div>
      </main>
    </TooltipProvider>
  )
}
