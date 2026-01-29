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
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <AdminSidebar collapsed={sidebarCollapsed} />
        <div
          className={cn(
            "transition-[padding] duration-200",
            sidebarCollapsed ? "md:pl-16" : "md:pl-64"
          )}
          data-admin-content
          data-sidebar-collapsed={sidebarCollapsed}
          style={{ paddingLeft: sidebarCollapsed ? '4rem' : '16rem' }}
        >
          <AdminHeader
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebarCollapsed={toggleSidebarCollapsed}
          />
          <main style={{ padding: '1.5rem' }}>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
