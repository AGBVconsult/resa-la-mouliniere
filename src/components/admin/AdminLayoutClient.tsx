"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PWARegister } from "@/components/admin/PWARegister";

interface AdminLayoutClientProps {
  children: ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("admin.sidebarCollapsed");
    if (stored === "true" || stored === "false") {
      setSidebarCollapsed(stored === "true");
      return;
    }
    setSidebarCollapsed(window.innerWidth < 1024);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("admin.sidebarCollapsed", String(next));
      return next;
    });
  }, []);

  return (
    <ToastProvider>
      <PWARegister />
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar collapsed={sidebarCollapsed} />
        <div
          className={cn(
            "transition-[padding] duration-200",
            sidebarCollapsed ? "md:pl-16" : "md:pl-64"
          )}
        >
          <AdminHeader
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebarCollapsed={toggleSidebarCollapsed}
          />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
