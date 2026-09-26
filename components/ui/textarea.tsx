import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-xl border-0 bg-card px-3.5 py-2.5 text-sm shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.11),0_1px_2px_oklch(0.2_0.03_265/0.04)] outline-none transition-[box-shadow] duration-200 placeholder:text-muted-foreground/80 hover:shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.2)] focus-visible:shadow-[0_0_0_1.5px_var(--primary),0_0_0_5px_oklch(0.62_0.19_258/0.18)] disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  )
}
export { Textarea }
