"use client";

import { Edit2, CheckCircle2, Trash2 } from "lucide-react";
import type { ReservationStatus } from "../../../../spec/contracts.generated";

interface ActionPopupProps {
  status: string;
  onAction: (action: "edit" | "status", nextStatus?: ReservationStatus) => void;
  onClose: () => void;
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: ReservationStatus; icon: typeof CheckCircle2 }[]> = {
  pending: [
    { label: "Confirmer", next: "confirmed", icon: CheckCircle2 },
    { label: "Annuler", next: "cancelled", icon: Trash2 },
  ],
  confirmed: [
    { label: "Installer", next: "seated", icon: CheckCircle2 },
    { label: "No-show", next: "noshow", icon: Trash2 },
    { label: "Annuler", next: "cancelled", icon: Trash2 },
  ],
  seated: [
    { label: "Terminer", next: "completed", icon: CheckCircle2 },
  ],
  completed: [],
  cancelled: [],
  noshow: [],
};

export function ActionPopup({ status, onAction, onClose }: ActionPopupProps) {
  const transitions = STATUS_TRANSITIONS[status] || [];

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
        <button
          onClick={() => {
            onAction("edit");
            onClose();
          }}
          className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Edit2 size={16} className="text-slate-400" />
          Modifier
        </button>

        {transitions.length > 0 && (
          <div className="border-t border-slate-100 my-1" />
        )}

        {transitions.map((t) => {
          const Icon = t.icon;
          const isDestructive = t.next === "cancelled" || t.next === "noshow";
          return (
            <button
              key={t.next}
              onClick={() => {
                onAction("status", t.next);
                onClose();
              }}
              className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                isDestructive
                  ? "text-red-600 hover:bg-red-50"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon
                size={16}
                className={isDestructive ? "text-red-400" : "text-slate-400"}
              />
              {t.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
