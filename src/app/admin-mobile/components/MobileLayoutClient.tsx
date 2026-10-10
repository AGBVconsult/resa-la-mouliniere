"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ListChecks, Bell } from "lucide-react";
import { ToastProvider } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface MobileLayoutClientProps {
  children: ReactNode;
}

/** Marge basse des zones qui défilent : le contenu passe sous la navigation flottante */
export const NAV_CLEARANCE = "pb-[calc(6rem+env(safe-area-inset-bottom))]";

const NAV_ITEMS = [
  { id: "planning", label: "Planning", icon: CalendarDays, href: "/admin-mobile" },
  { id: "reservations", label: "Résas", icon: ListChecks, href: "/admin-mobile/reservations" },
  { id: "activity", label: "Activité", icon: Bell, href: "/admin-mobile/activity" },
] as const;

export function MobileLayoutClient({ children }: MobileLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname.includes("/activity")) return "activity";
    if (pathname.includes("/reservations")) return "reservations";
    return "planning";
  };

  const activeTab = getActiveTab();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F6F6F6] flex flex-col font-tablet tabular-nums antialiased text-[#0C0C0C]">
        <div className="w-full max-w-3xl mx-auto bg-white relative flex flex-col h-[100dvh] md:h-[85vh] md:my-auto md:rounded-[2.5rem] md:shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:border md:border-slate-100 overflow-hidden">
          {/* Content - padding top for safe area (status bar) */}
          <div className="flex-1 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
            {children}
          </div>

          {/* Navigation : capsule flottante, le contenu défile dessous */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-[200]">
            <nav className="pointer-events-auto flex h-[58px] p-1 rounded-full bg-white/75 backdrop-blur-xl backdrop-saturate-150 border border-black/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(item.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex-1 rounded-full flex flex-col items-center justify-center gap-px text-[10px] transition-colors active:scale-[0.98]",
                      isActive ? "bg-[#EEF4FF] text-[#3884FF] font-semibold" : "text-[#6E6E6E] hover:text-[#2D2D2D]"
                    )}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
