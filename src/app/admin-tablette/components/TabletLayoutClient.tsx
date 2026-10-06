"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ListChecks, LogOut } from "lucide-react";
import { ToastProvider } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { VersionChecker } from "@/components/VersionChecker";

interface TabletLayoutClientProps {
  children: ReactNode;
  /** Classe de la police de l'interface tablette (next/font) */
  fontClassName?: string;
}

const NAV_ITEMS = [
  { id: "planning", label: "Planning", icon: CalendarDays, href: "/admin-tablette" },
  { id: "reservations", label: "Réservations", icon: ListChecks, href: "/admin-tablette/reservations" },
] as const;

export function TabletLayoutClient({ children, fontClassName }: TabletLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname.includes("/reservations")) return "reservations";
    return "planning";
  };

  const activeTab = getActiveTab();

  return (
    <ToastProvider>
      <div className={cn("min-h-screen bg-[#F6F6F6] antialiased text-[#0C0C0C]", fontClassName)}>
        {/* Main Content - Full width, no sidebar */}
        <main className="w-screen h-screen overflow-hidden">
          {children}
        </main>
        <VersionChecker />
      </div>
    </ToastProvider>
  );
}
