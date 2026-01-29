"use client";

 import type { ReactNode } from "react";

 interface BookingFooterProps {
   navigation?: ReactNode;
 }

 export function BookingFooter({ navigation }: BookingFooterProps) {
  return (
    <div 
      className="bg-slate-50 border-t border-slate-100 flex-shrink-0"
      style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}
    >
      {navigation}
      <div 
        className="px-[4vw] pt-[1vh] pb-[calc(1vh+env(safe-area-inset-bottom))] text-center"
        style={{ paddingLeft: '4vw', paddingRight: '4vw', paddingTop: '1vh', paddingBottom: 'calc(1vh + env(safe-area-inset-bottom, 0px))', textAlign: 'center' }}
      >
        <p style={{ fontSize: '1.3vh', color: '#94a3b8' }}>
          Visserskaai 17, Oostende • Powered by AGBV Consult
        </p>
      </div>
    </div>
  );
}
