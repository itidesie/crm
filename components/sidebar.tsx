"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inbox, LayoutDashboard, Users, GraduationCap, Briefcase, ShoppingCart, UserX, ListChecks, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLES } from "@/lib/tipos"
import { iniciales } from "@/lib/format"
import { cerrarSesion } from "@/app/login/actions"

const ENLACES = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/bandeja", label: "Bandeja", icon: Inbox, badge: true },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/admision", label: "Admisión", icon: GraduationCap },
  { href: "/empleo", label: "Empleo", icon: Briefcase },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/bajas", label: "Bajas", icon: UserX },
  { href: "/tareas", label: "Tareas", icon: ListChecks },
]

export function Sidebar({ usuario, nuevas }: { usuario: { nombre: string; email: string | null; rol: string }; nuevas: number }) {
  const pathname = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">I</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">IDESIE CRM</div>
          <div className="text-[11px] text-sidebar-muted">Business & Tech School</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {ENLACES.map(({ href, label, icon: Icon, badge }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                activo ? "bg-sidebar-accent font-medium text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white")}>
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {badge && nuevas > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">{nuevas}</span>}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-white">{iniciales(usuario.nombre, usuario.email ?? "")}</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-white" data-testid="usuario-nombre">{usuario.nombre}</div>
            <div className="text-[11px] text-sidebar-muted" data-testid="usuario-rol">{ROLES[usuario.rol]}</div>
          </div>
          <form action={cerrarSesion}>
            <button type="submit" title="Cerrar sesión" className="rounded p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-white"><LogOut className="size-4" /></button>
          </form>
        </div>
      </div>
    </aside>
  )
}
