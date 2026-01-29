import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      style={{
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        ...style,
      }}
      {...props}
    />
  );
}

function CardHeader({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      style={{
        display: 'grid',
        alignItems: 'flex-start',
        gap: '0.375rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        ...style,
      }}
      {...props}
    />
  );
}

function CardTitle({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      style={{
        lineHeight: 1,
        fontWeight: 600,
        ...style,
      }}
      {...props}
    />
  );
}

function CardDescription({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      style={{
        color: '#64748b',
        fontSize: '0.875rem',
        ...style,
      }}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      style={{
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        ...style,
      }}
      {...props}
    />
  );
}

function CardFooter({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        ...style,
      }}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
