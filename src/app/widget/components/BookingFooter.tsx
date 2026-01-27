"use client";

 import type { ReactNode } from "react";

 interface BookingFooterProps {
   navigation?: ReactNode;
 }

 export function BookingFooter({ navigation }: BookingFooterProps) {
  return (
    <div className="bg-slate-50 border-t border-slate-100 flex-shrink-0">
      {navigation}
      <div className="px-[4vw] pt-[1vh] pb-[calc(1vh+env(safe-area-inset-bottom))] text-center">
        <p className="text-[1.3vh] text-slate-400">
          Visserskaai 17, Oostende • Powered by AGBV Consult
        </p>
      </div>
    </div>
  );
}
