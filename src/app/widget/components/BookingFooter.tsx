"use client";

 import type { ReactNode } from "react";

 interface BookingFooterProps {
   navigation?: ReactNode;
 }

 export function BookingFooter({ navigation }: BookingFooterProps) {
  return (
    <div className="bg-slate-50 border-t border-slate-100 flex-shrink-0">
      {navigation}
      <div className="px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center">
        <p className="text-xs text-slate-400">
          Visserskaai 17, Oostende • Powered by AGBV Consult
        </p>
      </div>
    </div>
  );
}
