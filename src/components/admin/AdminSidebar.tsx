"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  Clock,
  Users,
  BarChart3,
  Menu,
  X,
  CalendarRange,
  Calendar,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navigation = [
  { name: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { name: "Réservations", href: "/admin/reservations", icon: CalendarDays },
  { name: "Planning", href: "/admin/planning", icon: Calendar },
  { name: "Plan de salle", href: "/admin/settings/tables", icon: LayoutGrid },
  { name: "Créneaux", href: "/admin/creneaux", icon: Clock },
  { name: "Périodes", href: "/admin/periodes", icon: CalendarRange },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Statistiques", href: "/admin/stats", icon: BarChart3 },
  { name: "Paramètres", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  collapsed?: boolean;
}

export function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Full sidebar content (mobile drawer + desktop lg+)
  const SidebarContent = () => (
    <>
      <div 
        className="flex h-16 items-center gap-2 px-6 border-b border-slate-200"
        style={{ display: 'flex', height: '4rem', alignItems: 'center', gap: '0.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', borderBottom: '1px solid #e2e8f0' }}
      >
        <div 
          className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center"
          style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>LM</span>
        </div>
        <div>
          <p style={{ fontWeight: 600, color: '#0f172a' }}>La Moulinière</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Administration</p>
        </div>
      </div>

      <nav 
        className="flex-1 px-3 py-4 space-y-1"
        style={{ flex: '1 1 0%', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '1rem', paddingBottom: '1rem' }}
      >
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                paddingLeft: '0.75rem',
                paddingRight: '0.75rem',
                paddingTop: '0.625rem',
                paddingBottom: '0.625rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginTop: '0.25rem',
                backgroundColor: isActive ? '#0f172a' : 'transparent',
                color: isActive ? 'white' : '#475569',
              }}
            >
              <item.icon style={{ width: '1.25rem', height: '1.25rem' }} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div 
        className="p-4 border-t border-slate-200"
        style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}
      >
        <div 
          className="px-3 py-2 rounded-lg bg-slate-100"
          style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#f1f5f9' }}
        >
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>Service</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Déjeuner</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>12:00 - 14:30</p>
        </div>
      </div>
    </>
  );

  // Collapsed sidebar content (tablet md-lg: icons only with 44px touch targets)
  const CollapsedSidebarContent = () => (
    <>
      <div 
        className="flex h-16 items-center justify-center border-b border-slate-200"
        style={{ display: 'flex', height: '4rem', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e2e8f0' }}
      >
        <div 
          className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center"
          style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>LM</span>
        </div>
      </div>

      <nav 
        className="flex-1 px-2 py-4 space-y-1"
        style={{ flex: '1 1 0%', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '1rem', paddingBottom: '1rem' }}
      >
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                "flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.75rem',
                height: '2.75rem',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginTop: '0.25rem',
                borderRadius: '0.5rem',
                backgroundColor: isActive ? '#0f172a' : 'transparent',
                color: isActive ? 'white' : '#475569',
              }}
            >
              <item.icon style={{ width: '1.25rem', height: '1.25rem' }} />
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile toggle button - visible on small screens only */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-slate-200"
        data-sidebar-mobile-toggle
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-slate-600" />
        ) : (
          <Menu className="h-5 w-5 text-slate-600" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
          data-sidebar-mobile-overlay
        />
      )}

      {/* Mobile sidebar (drawer) - small screens only */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-sidebar-mobile
      >
        <SidebarContent />
      </aside>

      {/* Desktop/Tablet sidebar (md+) */}
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-white border-r border-slate-200 transition-[width] duration-200",
          collapsed ? "w-16" : "w-64"
        )}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          borderRight: '1px solid #e2e8f0',
          width: collapsed ? '4rem' : '16rem',
        }}
        data-sidebar-desktop
        data-collapsed={collapsed}
      >
        {collapsed ? <CollapsedSidebarContent /> : <SidebarContent />}
      </aside>
    </>
  );
}
