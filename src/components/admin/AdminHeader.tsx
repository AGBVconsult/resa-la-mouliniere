"use client";

import { useState, useEffect, useRef } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Bell, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NotificationPopover } from "./NotificationPopover";

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebarCollapsed: () => void;
}

export function AdminHeader({ sidebarCollapsed, onToggleSidebarCollapsed }: AdminHeaderProps) {
  // Prevent hydration mismatch with Clerk's UserButton
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const { isSignedIn } = useAuth();
  const pendingReservations = useQuery(
    api.admin.listPendingReservations,
    isSignedIn ? {} : "skip"
  );
  const pendingCount = pendingReservations?.length ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4 flex-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex text-slate-600"
            onClick={onToggleSidebarCollapsed}
            title={sidebarCollapsed ? "Déplier la sidebar" : "Rétracter la sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          <div className="hidden md:flex relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Rechercher une réservation..."
              className="pl-10 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div ref={notificationRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Button>
            {showNotifications && (
              <NotificationPopover onClose={() => setShowNotifications(false)} />
            )}
          </div>

          <div className="h-8 w-px bg-slate-200" />

          {mounted && (
            <UserButton
              afterSignOutUrl="/admin/login"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          )}
          {!mounted && <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />}
        </div>
      </div>
    </header>
  );
}
