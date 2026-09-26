"use client"

import { useActionState, useState } from "react"
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { iniciarSesion } from "./actions"

export function LoginForm() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined)
  const [ver, setVer] = useState(false)
  return (
    <form action={accion} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[0.8rem] font-semibold">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus className="h-12 pl-10" placeholder="tu@idesie.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-[0.8rem] font-semibold">Contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" name="password" type={ver ? "text" : "password"} autoComplete="current-password" required className="h-12 pr-11 pl-10" placeholder="••••••••" />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground">
            {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {estado?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-600/20">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />{estado.error}
        </p>
      )}
      <Button type="submit" size="lg" className="group h-12 w-full" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" /> : null} Entrar
        {!pendiente && <ArrowRight className="transition-transform group-hover:translate-x-1" />}
      </Button>
    </form>
  )
}
