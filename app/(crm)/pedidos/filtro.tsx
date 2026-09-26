"use client"

import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function FiltroPedidos({ pago }: { pago: string }) {
  const router = useRouter()
  return (
    <div className="mb-4">
      <Select value={pago || "todos"} onValueChange={(v) => router.push(v === "todos" ? "/pedidos" : `/pedidos?pago=${v}`)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="todos">Todos los pagos</SelectItem><SelectItem value="pending">Pendientes</SelectItem><SelectItem value="paid">Pagados</SelectItem></SelectContent>
      </Select>
    </div>
  )
}
