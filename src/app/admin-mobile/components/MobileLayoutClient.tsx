"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, ClipboardList } from "lucide-react";
import { ToastProvider } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface MobileLayoutClientProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { id: "planning", label: "Planning", icon: Calendar, href: "/admin-mobile" },
  { id: "reservations", label: "Réservations", icon: ClipboardList, href: "/admin-mobile/reservations" },
] as const;

export function MobileLayoutClient({ children }: MobileLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname.includes("/reservations")) return "reservations";
    return "planning";
  };

  const activeTab = getActiveTab();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans antialiased text-slate-900">
        <div className="w-full max-w-3xl mx-auto bg-white flex flex-col h-[100dvh] md:h-[85vh] md:my-auto md:rounded-[2.5rem] md:shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:border md:border-slate-100 overflow-hidden">
          {/* Content - padding top for safe area (status bar) */}
          <div className="flex-1 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
            {children}
          </div>

          {/* Bottom Navigation - sticky, no scroll below */}
          <nav className="sticky bottom-0 px-6 py-3 border-t border-slate-100 flex justify-around items-center bg-white z-[200] shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 flex-1 transition-all",
                    isActive ? "text-slate-900" : "text-slate-300 hover:text-slate-400"
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn(
                      "transition-transform",
                      isActive ? "scale-110" : "scale-100"
                    )}
                  />
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </ToastProvider>
  );
}
