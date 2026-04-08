import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[8px] border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-[#d8cee3] bg-lilac-soft text-[#756d88]",
        success: "border-[#cad8c5] bg-success-soft text-[#6e8669]",
        warning: "border-[#dfd3ad] bg-warning-soft text-[#9c8752]",
        danger: "border-[#dfc8c3] bg-danger-soft text-[#996f68]",
        info: "border-[#cfd8e5] bg-mist-soft text-[#6d8097]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
