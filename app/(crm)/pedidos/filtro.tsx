"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const OPCIONES = [["", "Todos"], ["pending", "Pendientes"], ["paid", "Pagados"]] as const

export function FiltroPedidos({ pago }: { pago: string }) {
  const router = useRouter()
  return (
    <div className="inline-flex gap-1 rounded-2xl bg-foreground/[0.06] p-1" role="group" aria-label="Estado del pago">
      {OPCIONES.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={pago === v} onClick={() => router.push(v ? `/pedidos?pago=${v}` : "/pedidos")}
          className={cn("h-9 rounded-xl px-4 text-sm font-semibold transition-all duration-200", pago === v ? "bg-card text-foreground shadow-[0_1px_2px_oklch(0.2_0.03_265/0.14),0_0_0_1px_oklch(0.2_0.03_265/0.06)]" : "text-muted-foreground hover:text-foreground")}>
          {l}
        </button>
      ))}
    </div>
  )
}
