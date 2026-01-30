"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, ClipboardList, Settings, LogOut } from "lucide-react";
import { ToastProvider } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";

interface TabletLayoutClientProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { id: "planning", label: "Planning", icon: Calendar, href: "/admin-tablette" },
  { id: "reservations", label: "Réservations", icon: ClipboardList, href: "/admin-tablette/reservations" },
] as const;

export function TabletLayoutClient({ children }: TabletLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();

  const getActiveTab = () => {
    if (pathname.includes("/reservations")) return "reservations";
    return "planning";
  };

  const activeTab = getActiveTab();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FDFDFD] flex font-sans antialiased text-slate-900">
        {/* Sidebar - Left navigation for landscape iPad */}
        <nav className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 shrink-0 h-screen sticky top-0">
          {/* Logo / Brand */}
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-8">
            <span className="text-white font-black text-lg">LM</span>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  )}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[8px] font-black uppercase tracking-wider">
                    {item.label.slice(0, 4)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="flex flex-col items-center gap-2 mt-auto">
            <button
              onClick={() => router.push("/admin/settings/tables")}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
            >
              <Settings size={20} strokeWidth={2} />
            </button>
            <button
              onClick={() => signOut({ redirectUrl: "/admin/login" })}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <LogOut size={20} strokeWidth={2} />
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 h-screen overflow-hidden">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
