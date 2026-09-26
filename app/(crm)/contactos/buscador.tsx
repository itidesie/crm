"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function BuscadorContactos({ q, no }: { q: string; no: boolean }) {
  const router = useRouter()
  const [texto, setTexto] = useState(q)
  const ir = (t: string, n: boolean) => router.push(`/contactos?${new URLSearchParams({ ...(t ? { q: t } : {}), ...(n ? { no: "1" } : {}) })}`)
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3">
      <form className="relative min-w-72 flex-1" onSubmit={(e) => { e.preventDefault(); ir(texto, no) }}>
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre, email o teléfono…" className="pl-9" data-testid="buscar-contacto" />
      </form>
      <div className="flex items-center gap-2"><Checkbox id="no" checked={no} onCheckedChange={(v) => ir(texto, v === true)} /><Label htmlFor="no" className="font-normal">Solo «no contactar»</Label></div>
    </div>
  )
}
