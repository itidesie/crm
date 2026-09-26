import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[0.72rem] font-semibold leading-none ring-1 ring-inset [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground ring-primary-deep/40",
        secondary: "bg-foreground/[0.06] text-foreground/75 ring-foreground/10",
        outline: "text-foreground ring-foreground/20",
        destructive: "bg-red-50 text-red-700 ring-red-600/20",
        success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        warning: "bg-amber-50 text-amber-800 ring-amber-600/25",
        info: "bg-blue-50 text-blue-700 ring-blue-600/20",
        muted: "bg-foreground/[0.05] text-muted-foreground ring-foreground/[0.08]",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
export { Badge, badgeVariants }
