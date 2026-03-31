import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 shadow-sm active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow hover:bg-slate-800 dark:hover:bg-slate-200 border border-transparent",
        primary: "bg-blue-600 text-white shadow hover:bg-blue-500 border border-transparent",
        destructive: "bg-rose-500 text-white shadow-sm hover:bg-rose-600",
        outline: "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white",
        secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700",
        ghost: "shadow-none hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
        link: "text-blue-600 shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-2xl px-8 text-base uppercase tracking-widest",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
