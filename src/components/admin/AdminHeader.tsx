"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminHeader() {
  // Prevent hydration mismatch with Clerk's UserButton
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4 flex-1">
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

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
