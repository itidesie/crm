import { cn } from "@/lib/utils"

/** Marca del CRM: cubo isométrico (guiño al BIM) sobre azul de marca. */
export function LogoMarca({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-10 shrink-0 items-center justify-center rounded-[0.95rem] bg-gradient-to-br from-[#3a8dff] via-primary to-[#0048b8] shadow-[0_1px_0_0_rgb(255_255_255/0.4)_inset,0_0_0_1px_rgb(0_72_184/0.6),0_8px_20px_-6px_rgb(0_108_255/0.8)]", className)}>
      <svg viewBox="0 0 24 24" className="size-[1.4rem]" fill="none" aria-hidden>
        <path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4L12 2.8Z" fill="white" fillOpacity=".18" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M4.3 7.6 12 12l7.7-4.4M12 12v8.8" stroke="white" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M12 3v9L4.3 7.6 12 3Z" fill="white" fillOpacity=".55" />
      </svg>
    </span>
  )
}
