"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inbox, LayoutDashboard, Users, GraduationCap, Briefcase, ShoppingBag, UserX, ListChecks, LogOut, Search, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLES } from "@/lib/tipos"
import { cerrarSesion } from "@/app/login/actions"
import { AvatarIniciales } from "@/components/avatar-iniciales"
import { LogoMarca } from "@/components/logo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Enlace { href: string; label: string; icon: LucideIcon; badge?: "nuevas" | "vencidas" }
const GRUPOS: { titulo: string | null; enlaces: Enlace[] }[] = [
  { titulo: null, enlaces: [{ href: "/", label: "Inicio", icon: LayoutDashboard }] },
  { titulo: "Entrada", enlaces: [
    { href: "/bandeja", label: "Bandeja", icon: Inbox, badge: "nuevas" },
    { href: "/contactos", label: "Contactos", icon: Users },
  ] },
  { titulo: "Pipelines", enlaces: [
    { href: "/admision", label: "Admisión", icon: GraduationCap },
    { href: "/empleo", label: "Empleo", icon: Briefcase },
  ] },
  { titulo: "Operaciones", enlaces: [
    { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
    { href: "/bajas", label: "Bajas", icon: UserX },
    { href: "/tareas", label: "Tareas", icon: ListChecks, badge: "vencidas" },
  ] },
]
export const ENLACES_NAV = GRUPOS.flatMap((g) => g.enlaces)

export interface DatosMenu { usuario: { nombre: string; email: string | null; rol: string }; nuevas: number; vencidas: number }

function Item({ enlace, activo, colapsado, cuenta, alNavegar }: { enlace: Enlace; activo: boolean; colapsado: boolean; cuenta: number; alNavegar?: () => void }) {
  const { href, label, icon: Icon } = enlace
  const contenido = (
    <Link
      href={href}
      onClick={alNavegar}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "group/item relative flex h-11 items-center rounded-2xl text-[0.9rem] font-medium outline-none transition-all duration-300 ease-[var(--ease-out-expo)] focus-visible:ring-2 focus-visible:ring-primary",
        colapsado ? "w-11 justify-center self-center" : "gap-3 px-3",
        activo ? "bg-white/[0.09] text-white shadow-[0_0_0_1px_rgb(255_255_255/0.08)_inset]" : "text-sidebar-foreground/70 hover:bg-white/[0.05] hover:text-white",
      )}
    >
      {activo && <span aria-hidden className="absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#4da0ff] shadow-[0_0_14px_2px_rgb(0_108_255/0.9)]" />}
      <span className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-300", activo ? "bg-primary text-white shadow-[0_4px_12px_-2px_rgb(0_108_255/0.8)]" : "text-sidebar-foreground/70 group-hover/item:text-white")}>
        <Icon className="size-[1.05rem]" strokeWidth={activo ? 2.4 : 2} />
        {colapsado && cuenta > 0 && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#ffba08] ring-2 ring-[oklch(0.19_0.038_266)]" />}
      </span>
      {!colapsado && <span className="flex-1 truncate">{label}</span>}
      {!colapsado && cuenta > 0 && (
        <span className={cn("num rounded-full px-2 py-0.5 text-[0.7rem] leading-none font-semibold tabular-nums", enlace.badge === "vencidas" ? "bg-red-500/90 text-white" : "bg-[#ffba08] text-[oklch(0.25_0.05_75)]")}>{cuenta}</span>
      )}
    </Link>
  )
  if (!colapsado) return contenido
  return (
    <Tooltip>
      <TooltipTrigger asChild>{contenido}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={14}>{label}{cuenta > 0 ? ` · ${cuenta}` : ""}</TooltipContent>
    </Tooltip>
  )
}

/** Contenido del menú (se reutiliza en el panel de escritorio y en el cajón móvil). */
export function NavContenido({ datos, colapsado = false, alNavegar, alBuscar, alColapsar }: {
  datos: DatosMenu; colapsado?: boolean; alNavegar?: () => void; alBuscar: () => void; alColapsar?: () => void
}) {
  const pathname = usePathname()
  const { usuario, nuevas, vencidas } = datos
  return (
    <>
      {/* Marca */}
      <div className={cn("flex items-center px-4 pt-5 pb-4", colapsado ? "justify-center px-0" : "gap-3")}>
        <LogoMarca />
        {!colapsado && (
          <div className="min-w-0 flex-1 leading-none">
            <div className="flex items-center gap-2">
              <span className="font-display text-[1.35rem] font-bold tracking-tight text-white">IDESIE</span>
              <span className="eyebrow rounded-md bg-white/10 px-1.5 py-1 text-[0.58rem] text-[#8fc0ff]">CRM</span>
            </div>
            <div className="mt-1.5 truncate text-[0.7rem] text-sidebar-muted">Business & Tech School</div>
          </div>
        )}
      </div>

      {/* Buscador / paleta de comandos */}
      <div className={cn("px-3 pb-3", colapsado && "flex justify-center px-0")}>
        <button
          type="button"
          onClick={alBuscar}
          aria-label="Buscar o ir a… (Ctrl+K)"
          className={cn(
            "group/b flex items-center rounded-2xl bg-white/[0.06] text-sidebar-muted shadow-[0_0_0_1px_rgb(255_255_255/0.07)_inset] transition-all duration-300 hover:bg-white/[0.1] hover:text-white",
            colapsado ? "size-11 justify-center" : "h-11 w-full gap-2.5 px-3.5 text-sm",
          )}
        >
          <Search className="size-4 shrink-0" />
          {!colapsado && <><span className="flex-1 text-left">Buscar…</span><kbd className="eyebrow rounded-md bg-white/10 px-1.5 py-0.5 text-[0.6rem] tracking-normal text-white/60 normal-case">⌘K</kbd></>}
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2" aria-label="Principal">
        {GRUPOS.map((g, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-4")}>
            {g.titulo && (colapsado
              ? <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
              : <div className="eyebrow mb-1.5 px-3 text-[0.6rem] text-white/35">{g.titulo}</div>)}
            <div className={cn("space-y-1", colapsado && "flex flex-col")}>
              {g.enlaces.map((e) => (
                <Item key={e.href} enlace={e} colapsado={colapsado} alNavegar={alNavegar}
                  activo={e.href === "/" ? pathname === "/" : pathname.startsWith(e.href)}
                  cuenta={e.badge === "nuevas" ? nuevas : e.badge === "vencidas" ? vencidas : 0} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div className="p-3">
        <div className={cn("rounded-2xl bg-white/[0.06] shadow-[0_0_0_1px_rgb(255_255_255/0.07)_inset]", colapsado ? "flex flex-col items-center gap-2 p-2" : "flex items-center gap-3 p-2.5")}>
          <AvatarIniciales nombre={usuario.nombre} email={usuario.email} size={colapsado ? "sm" : "md"} />
          {!colapsado && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold text-white" data-testid="usuario-nombre">{usuario.nombre}</div>
              <div className="eyebrow mt-1 text-[0.58rem] text-[#8fc0ff]" data-testid="usuario-rol">{ROLES[usuario.rol]}</div>
            </div>
          )}
          {colapsado && <span className="sr-only" data-testid="usuario-rol">{ROLES[usuario.rol]}</span>}
          <form action={cerrarSesion}>
            <button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión" className="flex size-8 items-center justify-center rounded-xl text-sidebar-muted transition hover:bg-red-500/20 hover:text-red-300">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
        {alColapsar && (
          <button type="button" onClick={alColapsar} aria-label={colapsado ? "Expandir menú" : "Contraer menú"}
            className={cn("mt-2 flex h-8 items-center gap-2 rounded-xl text-xs text-white/40 transition hover:bg-white/[0.06] hover:text-white/80", colapsado ? "w-full justify-center" : "w-full px-3")}>
            {colapsado ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Contraer menú</>}
          </button>
        )}
      </div>
    </>
  )
}

/** Panel flotante de escritorio. */
export function Sidebar({ datos, colapsado, alColapsar, alBuscar }: { datos: DatosMenu; colapsado: boolean; alColapsar: () => void; alBuscar: () => void }) {
  return (
    <aside
      data-colapsado={colapsado}
      className={cn(
        "grain fixed top-3 bottom-3 left-3 z-30 hidden flex-col overflow-hidden rounded-[1.75rem] text-sidebar-foreground transition-[width] duration-500 ease-[var(--ease-out-expo)] lg:flex",
        "bg-[linear-gradient(165deg,oklch(0.23_0.05_266),oklch(0.15_0.04_270)_60%)] shadow-[0_0_0_1px_rgb(255_255_255/0.06)_inset,0_30px_60px_-24px_oklch(0.2_0.06_266/0.7),0_8px_20px_-8px_oklch(0.2_0.06_266/0.4)]",
        colapsado ? "w-[4.75rem]" : "w-[15.75rem]",
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-primary/40 blur-[70px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-24 size-64 rounded-full bg-[#ffba08]/[0.12] blur-[80px]" />
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent_45%)]" aria-hidden />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <NavContenido datos={datos} colapsado={colapsado} alColapsar={alColapsar} alBuscar={alBuscar} />
      </div>
    </aside>
  )
}
