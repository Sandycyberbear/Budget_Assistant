import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-24 w-full rounded-[8px] border border-border bg-[#fffdfa] px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-soft/70",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
