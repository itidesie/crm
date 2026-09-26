import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/format"

// Pares de degradados dentro de la paleta de marca (azules, cian, verde azulado, ámbar, coral). Determinista por texto.
const DEGRADADOS = [
  "from-[#3a8dff] to-[#0048b8]",
  "from-[#22c1dc] to-[#0a6f9a]",
  "from-[#34d399] to-[#047857]",
  "from-[#fbbf24] to-[#c2410c]",
  "from-[#fb7185] to-[#be123c]",
  "from-[#8b9dff] to-[#3b3fb8]",
  "from-[#5eead4] to-[#0f766e]",
  "from-[#f59e0b] to-[#b45309]",
]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const TAMANOS = {
  xs: "size-6 text-[0.6rem]",
  sm: "size-8 text-[0.7rem]",
  md: "size-10 text-xs",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
}

export function AvatarIniciales({ nombre, email, size = "md", className }: {
  nombre?: string | null; email?: string | null; size?: keyof typeof TAMANOS; className?: string
}) {
  const semilla = `${nombre ?? ""}${email ?? ""}`
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold tracking-wide text-white shadow-[0_1px_0_0_rgb(255_255_255/0.35)_inset,0_0_0_1px_rgb(0_0_0/0.08),0_4px_10px_-4px_rgb(0_0_0/0.3)]",
        DEGRADADOS[hash(semilla) % DEGRADADOS.length], TAMANOS[size], className,
      )}
    >
      {iniciales(nombre, email ?? "")}
    </span>
  )
}
