"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { formatDate, kindOf, type Period } from "../periodUtils";

interface DeletePeriodPopupProps {
  period: Period;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeletePeriodPopup({ period, onClose, onDeleted }: DeletePeriodPopupProps) {
  const removePeriod = useMutation(api.specialPeriods.remove);
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removePeriod({ periodId: period._id });
      toast.success(`« ${period.name} » supprimée`);
      onDeleted();
    } catch (error) {
      toast.error(formatConvexError(error));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-period-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-6 pt-6 flex flex-col gap-3">
          <span className="w-11 h-11 rounded-full bg-[#F5E0DF] text-[#A33A3A] flex items-center justify-center">
            <Trash2 size={20} strokeWidth={1.75} />
          </span>
          <h2 id="delete-period-title" className="text-lg font-bold">
            Supprimer « {period.name} » ?
          </h2>
          <p className="text-[15px] text-[#6E6E6E] leading-relaxed">
            {kindOf(period) === "ouverture" ? "Ouverture" : "Fermeture"} du {formatDate(period.startDate)} au{" "}
            {formatDate(period.endDate)}. Cette action est définitive.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 mt-4 border-t border-[#EFEFEF]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-11 px-5 rounded-full bg-[#F1F1F1] text-sm font-semibold text-[#464646] disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-11 px-5 rounded-full bg-red-600 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Supprimer
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
