import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold outline-none transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#1a7dff] to-primary text-primary-foreground shadow-[0_1px_0_0_rgb(255_255_255/0.28)_inset,0_0_0_1px_rgb(0_72_184/0.55),0_6px_16px_-6px_rgb(0_108_255/0.7)] hover:from-[#3389ff] hover:shadow-[0_1px_0_0_rgb(255_255_255/0.32)_inset,0_0_0_1px_rgb(0_72_184/0.6),0_10px_22px_-6px_rgb(0_108_255/0.75)] hover:-translate-y-px",
        destructive:
          "bg-gradient-to-b from-[oklch(0.64_0.22_27)] to-destructive text-white shadow-[0_1px_0_0_rgb(255_255_255/0.22)_inset,0_0_0_1px_rgb(180_30_30/0.5),0_6px_16px_-8px_rgb(220_50_50/0.7)] hover:-translate-y-px",
        outline:
          "bg-card text-foreground shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.12),0_1px_2px_oklch(0.2_0.03_265/0.05)] hover:bg-accent hover:shadow-[0_0_0_1px_oklch(0.2_0.03_265/0.2),0_2px_6px_oklch(0.2_0.03_265/0.08)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
        lg: "h-11 px-6 text-[0.95rem]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

function Button({
  className, variant, size, asChild = false, ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
