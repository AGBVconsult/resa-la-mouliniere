"use client";

import { type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toaster";

interface AdminLayoutClientProps {
  children: ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
