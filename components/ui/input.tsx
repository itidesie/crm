import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-xl border-0 bg-card px-3.5 py-1 text-sm shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.11),0_1px_2px_oklch(0.2_0.03_265/0.04)] outline-none transition-[box-shadow] duration-200 placeholder:text-muted-foreground/80 file:border-0 file:bg-transparent file:text-sm file:font-medium hover:shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.2),0_1px_2px_oklch(0.2_0.03_265/0.04)] focus-visible:shadow-[0_0_0_1.5px_var(--primary),0_0_0_5px_oklch(0.62_0.19_258/0.18)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:shadow-[0_0_0_1.5px_var(--destructive)]",
        className,
      )}
      {...props}
    />
  )
}
export { Input }
