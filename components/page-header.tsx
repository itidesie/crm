import { cn } from "@/lib/utils"

export function PageHeader({ titulo, descripcion, seccion, children, className }: {
  titulo: string; descripcion?: string; seccion?: string; children?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("fade-up mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {seccion && (
          <div className="eyebrow mb-3 flex items-center gap-2 text-primary">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_rgb(0_108_255/0.55)]" />{seccion}
          </div>
        )}
        <h1 className="font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.75rem)] leading-[1.02] font-bold tracking-[-0.028em]">{titulo}</h1>
        {descripcion && <p className="mt-2.5 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">{descripcion}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
