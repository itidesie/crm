import { ShieldCheck, Inbox, KanbanSquare, Zap } from "lucide-react"
import { LogoMarca } from "@/components/logo"
import { LoginForm } from "./login-form"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; expirada?: string }> }) {
  const { error, expirada } = await searchParams
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <section className="grain relative hidden overflow-hidden bg-[linear-gradient(150deg,oklch(0.25_0.07_264),oklch(0.15_0.045_270)_60%,oklch(0.19_0.09_262))] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(80%_70%_at_20%_20%,black,transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -top-40 -left-20 size-[32rem] rounded-full bg-primary/40 blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-[#ffba08]/[0.14] blur-[110px]" />
        <svg aria-hidden viewBox="0 0 400 400" className="float-slow pointer-events-none absolute -right-16 top-1/4 size-[26rem] opacity-70" fill="none">
          <defs><linearGradient id="lg" x1="80" y1="60" x2="330" y2="340" gradientUnits="userSpaceOnUse"><stop stopColor="#4da0ff" stopOpacity=".5" /><stop offset="1" stopColor="#006cff" stopOpacity=".05" /></linearGradient></defs>
          <g stroke="white" strokeOpacity=".35" strokeWidth="1.2" strokeLinejoin="round">
            <path d="M200 40 330 115v150L200 340 70 265V115L200 40Z" fill="url(#lg)" />
            <path d="M70 115l130 75 130-75M200 190v150" />
            <path d="M200 40v150L70 115 200 40Z" fill="white" fillOpacity=".1" />
          </g>
        </svg>
        <div className="relative flex items-center gap-3">
          <LogoMarca className="!size-11" />
          <div className="leading-none"><div className="font-display text-2xl font-bold tracking-tight">IDESIE</div><div className="eyebrow mt-1.5 text-[0.6rem] text-[#8fc0ff]">CRM · Business &amp; Tech School</div></div>
        </div>
        <div className="relative max-w-xl">
          <h2 className="fade-up font-display text-[clamp(2.6rem,1.6rem+2.4vw,4.2rem)] leading-[0.98] font-bold tracking-[-0.032em] text-balance">
            Todo lo que entra por la web, <span className="bg-gradient-to-r from-[#6db3ff] to-[#ffd166] bg-clip-text text-transparent">en un solo lugar.</span>
          </h2>
          <p className="fade-up mt-6 max-w-md text-lg leading-relaxed text-white/65" style={{ "--i": 2 } as React.CSSProperties}>
            Solicitudes de admisión, mensajes, catálogos y pedidos, unificados por persona y listos para gestionar.
          </p>
          <ul className="mt-10 grid gap-3 sm:grid-cols-3">
            {[[Inbox, "Bandeja en vivo"], [KanbanSquare, "Pipelines"], [Zap, "Sin duplicados"]].map(([Icon, t], i) => {
              const I = Icon as typeof Inbox
              return (
                <li key={t as string} style={{ "--i": i + 4 } as React.CSSProperties} className="fade-up flex items-center gap-2.5 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm font-medium ring-1 ring-white/10 backdrop-blur">
                  <I className="size-4 text-[#8fc0ff]" />{t as string}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="eyebrow relative flex items-center gap-2 text-[0.6rem] text-white/40"><ShieldCheck className="size-3.5" /> Acceso restringido al equipo</div>
      </section>

      {/* Formulario */}
      <section className="relative flex items-center justify-center p-6 sm:p-12">
        <div className="fade-up w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMarca />
            <div className="leading-none"><div className="font-display text-2xl font-bold tracking-tight">IDESIE</div><div className="eyebrow mt-1.5 text-[0.6rem] text-primary">CRM</div></div>
          </div>
          <div className="eyebrow mb-3 text-primary">Acceso para el equipo</div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.03em]">Bienvenido de nuevo</h1>
          <p className="mt-2.5 text-muted-foreground">Entra con tu email y contraseña para continuar.</p>
          {expirada && (
            <p role="status" className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-900 ring-1 ring-blue-600/20" data-testid="aviso-expirada">
              Tu sesión ha caducado (dura 3 horas). Vuelve a entrar para continuar.
            </p>
          )}
          {error === "sin_acceso" && (
            <p role="status" className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-600/20">
              Tu usuario existe pero no tiene acceso al CRM. Pide a un administrador que te dé de alta.
            </p>
          )}
          <div className="mt-8"><LoginForm /></div>
          <p className="eyebrow mt-10 text-center text-[0.58rem] text-muted-foreground/70">Entorno local de desarrollo</p>
        </div>
      </section>
    </main>
  )
}
