"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { iniciarSesion } from "./actions"

export function LoginForm() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined)
  return (
    <form action={accion} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {estado?.error && <p role="alert" className="text-sm text-destructive">{estado.error}</p>}
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente && <Loader2 className="animate-spin" />} Entrar
      </Button>
    </form>
  )
}
