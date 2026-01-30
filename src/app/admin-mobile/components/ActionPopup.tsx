"use client";

import { Edit2, CheckCircle2, Trash2 } from "lucide-react";
import type { ReservationStatus } from "../../../../spec/contracts.generated";

interface ActionPopupProps {
  status: string;
  onAction: (action: "edit" | "status", nextStatus?: ReservationStatus) => void;
  onClose: () => void;
}

export function ActionPopup({ status, onAction, onClose }: ActionPopupProps) {
  const getActions = () => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      action: "edit" | "status";
      nextStatus?: string;
      danger?: boolean;
    }> = [
      { label: "Modifier", icon: <Edit2 size={14} className="text-slate-400" />, action: "edit" },
    ];

    switch (status) {
      case "pending":
        actions.push({
          label: "Confirmer",
          icon: <CheckCircle2 size={14} className="text-emerald-500" />,
          action: "status",
          nextStatus: "confirmed",
        });
        actions.push({
          label: "Refuser",
          icon: <Trash2 size={14} />,
          action: "status",
          nextStatus: "refused",
          danger: true,
        });
        break;
      case "confirmed":
        actions.push({
          label: "Arrivé",
          icon: <CheckCircle2 size={14} className="text-emerald-500" />,
          action: "status",
          nextStatus: "seated",
        });
        actions.push({
          label: "Annuler",
          icon: <Trash2 size={14} />,
          action: "status",
          nextStatus: "cancelled",
          danger: true,
        });
        break;
      case "seated":
        actions.push({
          label: "Terminé",
          icon: <CheckCircle2 size={14} className="text-slate-400" />,
          action: "status",
          nextStatus: "completed",
        });
        break;
    }

    return actions;
  };

  const actions = getActions();

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div className="absolute right-0 top-8 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
        {actions.map((item, index) => (
          <div key={item.label}>
            {item.danger && index > 0 && <div className="my-1 border-t border-slate-50" />}
            <button
              className={`w-full px-4 py-2.5 text-left text-[11px] font-bold flex items-center gap-3 transition-colors uppercase tracking-widest ${
                item.danger
                  ? "text-red-500 hover:bg-red-50"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => {
                onAction(item.action, item.nextStatus as ReservationStatus);
                onClose();
              }}
            >
              {item.icon} {item.label}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
