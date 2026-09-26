import { LoginForm } from "./login-form"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-[#003b8e] p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">I</div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">IDESIE CRM</h1>
            <p className="text-xs text-muted-foreground">Acceso para el equipo</p>
          </div>
        </div>
        {error === "sin_acceso" && (
          <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Tu usuario existe pero no tiene acceso al CRM. Pide a un administrador que te dé de alta.
          </p>
        )}
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">Entorno local de desarrollo</p>
      </div>
    </main>
  )
}
