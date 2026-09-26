"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Ban } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function BuscadorContactos({ q, no }: { q: string; no: boolean }) {
  const router = useRouter()
  const [texto, setTexto] = useState(q)
  const ir = (t: string, n: boolean) => router.push(`/contactos?${new URLSearchParams({ ...(t ? { q: t } : {}), ...(n ? { no: "1" } : {}) })}`)
  return (
    <div className="glass fade-up mb-4 flex flex-wrap items-center gap-3 rounded-3xl p-3.5" style={{ "--i": 1 } as React.CSSProperties}>
      <form className="relative min-w-72 flex-1" onSubmit={(e) => { e.preventDefault(); ir(texto, no) }}>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre, email o teléfono…" className="h-11 pl-10" data-testid="buscar-contacto" />
      </form>
      <button type="button" onClick={() => ir(texto, !no)} aria-pressed={no}
        className={cn("inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200", no ? "bg-red-50 text-red-700 shadow-[0_0_0_1.5px_oklch(0.58_0.22_27/0.5)]" : "bg-foreground/[0.06] text-muted-foreground hover:text-foreground")}>
        <Ban className="size-4" /> Solo «no contactar»
      </button>
    </div>
  )
}
