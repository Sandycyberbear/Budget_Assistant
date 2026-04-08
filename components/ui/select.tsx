import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-[8px] border border-border bg-[#fffdfa] px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] focus:border-accent focus:ring-2 focus:ring-accent-soft/70",
          className,
        )}
        {...props}
      />
    );
  },
);

Select.displayName = "Select";

export { Select };
