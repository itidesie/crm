"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cambiarEstadoEntrada, marcarNoContactar } from "../acciones"

export function BajaAcciones({ entradaId, contactoId, noContactar, estado, puedeEscribir }: {
  entradaId: string; contactoId: string; noContactar: boolean; estado: string; puedeEscribir: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  if (!puedeEscribir) return <span className="text-xs text-muted-foreground">Solo lectura</span>
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    iniciar(async () => { const r = await fn(); if (r.ok) toast.success(ok); else toast.error(r.error); router.refresh() })
  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant={noContactar ? "outline" : "destructive"} disabled={pendiente} data-testid="btn-no-contactar"
        onClick={() => run(() => marcarNoContactar(contactoId, !noContactar), noContactar ? "Marca «no contactar» retirada" : "Contacto marcado como «no contactar»")}>
        {noContactar ? "Quitar «no contactar»" : "Marcar «no contactar»"}
      </Button>
      {estado !== "gestionada" && <Button size="sm" variant="outline" disabled={pendiente} onClick={() => run(() => cambiarEstadoEntrada(entradaId, "gestionada"), "Baja marcada como gestionada")}>Marcar gestionada</Button>}
    </div>
  )
}
