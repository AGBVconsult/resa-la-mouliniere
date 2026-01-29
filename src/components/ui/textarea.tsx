import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex min-h-[96px] w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      style={{
        display: 'flex',
        minHeight: '96px',
        width: '100%',
        minWidth: 0,
        borderRadius: '0.375rem',
        border: '1px solid #e2e8f0',
        backgroundColor: 'transparent',
        paddingLeft: '0.75rem',
        paddingRight: '0.75rem',
        paddingTop: '0.5rem',
        paddingBottom: '0.5rem',
        fontSize: '1rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
      {...props}
    />
  );
}

export { Textarea };
