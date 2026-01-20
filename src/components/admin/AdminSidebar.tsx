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

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
          <span className="text-white font-bold text-sm">LM</span>
        </div>
        <div>
          <p className="font-semibold text-slate-900">La Moulinière</p>
          <p className="text-xs text-slate-500">Administration</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
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
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="px-3 py-2 rounded-lg bg-slate-100">
          <p className="text-xs font-medium text-slate-600">Service</p>
          <p className="text-sm font-semibold text-slate-900">Déjeuner</p>
          <p className="text-xs text-slate-500">12:00 - 14:30</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-slate-200"
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
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex-col bg-white border-r border-slate-200">
        <SidebarContent />
      </aside>
    </>
  );
}
