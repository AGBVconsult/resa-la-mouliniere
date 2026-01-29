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
    <header 
      className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200" 
      data-admin-header
      style={{ position: 'sticky', top: 0, zIndex: 30, height: '4rem', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}
    >
      <div 
        className="flex items-center justify-between h-full px-6"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 0%' }}>
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

          <div 
            className="hidden md:flex relative max-w-md flex-1"
            style={{ position: 'relative', maxWidth: '28rem', flex: '1 1 0%' }}
          >
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#94a3b8' }} />
            <Input
              type="search"
              placeholder="Rechercher une réservation..."
              className="pl-10 bg-slate-50 border-slate-200"
              style={{ paddingLeft: '2.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', width: '100%', height: '2.5rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div ref={notificationRef} style={{ position: 'relative' }}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {pendingCount > 0 && (
                <span 
                  className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1"
                  style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: 500, borderRadius: '9999px', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}
                >
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Button>
            {showNotifications && (
              <NotificationPopover onClose={() => setShowNotifications(false)} />
            )}
          </div>

          <div style={{ height: '2rem', width: '1px', backgroundColor: '#e2e8f0' }} />

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
          {!mounted && <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', backgroundColor: '#e2e8f0' }} />}
        </div>
      </div>
    </header>
  );
}
