import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground",
                secondary: "border-transparent bg-secondary text-secondary-foreground",
                destructive: "border-transparent bg-destructive text-destructive-foreground",
                outline: "text-foreground border-border",
                success: "border-transparent bg-success/20 text-success border-success/30",
                warning: "border-transparent bg-warning/20 text-warning-foreground border-warning/30",
                info: "border-transparent bg-info/20 text-info border-info/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    children?: React.ReactNode;
    className?: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | null;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant, ...props }, ref) => (
        <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
    )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }