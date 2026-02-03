"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, X, Clock, Users, Calendar, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import type { Id } from "../../../convex/_generated/dataModel";

interface NotificationPopoverProps {
  onClose: () => void;
}

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const pendingReservations = useQuery(
    api.admin.listPendingReservations,
    session ? {} : "skip"
  );
  const updateReservation = useMutation(api.admin.updateReservation);

  const handleConfirm = async (id: Id<"reservations">, version: number) => {
    try {
      await updateReservation({
        reservationId: id,
        expectedVersion: version,
        status: "confirmed",
      });
      toast.success("Réservation confirmée");
    } catch (error) {
      toast.error(formatConvexError(error, "Erreur lors de la confirmation"));
    }
  };

  const handleRefuse = async (id: Id<"reservations">, version: number) => {
    try {
      await updateReservation({
        reservationId: id,
        expectedVersion: version,
        status: "refused",
      });
      toast.success("Réservation refusée");
    } catch (error) {
      toast.error(formatConvexError(error, "Erreur lors du refus"));
    }
  };

  const handleNavigate = (dateKey: string, service: "lunch" | "dinner") => {
    const url = `/admin/reservations?date=${dateKey}&service=${service}`;
    router.push(url);
    onClose();
  };

  const formatDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "EEEE d MMMM", { locale: fr });
  };

  const formatService = (service: "lunch" | "dinner") => {
    return service === "lunch" ? "Déjeuner" : "Dîner";
  };

  if (!pendingReservations) {
    return (
      <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Réservations en attente</h3>
        </div>
        <div className="p-8 text-center text-slate-500">
          <div className="animate-pulse">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-[70vh] flex flex-col">
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <h3 className="font-semibold text-slate-900">
          Réservations en attente ({pendingReservations.length})
        </h3>
      </div>

      {pendingReservations.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p>Aucune réservation en attente</p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {pendingReservations.map((reservation) => (
            <div
              key={reservation._id}
              className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div
                className="cursor-pointer"
                onClick={() => handleNavigate(reservation.dateKey, reservation.service)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {reservation.firstName} {reservation.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{reservation.phone}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    En attente
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(reservation.dateKey)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Utensils className="h-3.5 w-3.5" />
                    {formatService(reservation.service)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {reservation.timeKey}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                  <Users className="h-3.5 w-3.5" />
                  <span>{reservation.partySize} personne{reservation.partySize > 1 ? "s" : ""}</span>
                  {reservation.adults > 0 && (
                    <span className="text-slate-400">({reservation.adults} adulte{reservation.adults > 1 ? "s" : ""}</span>
                  )}
                  {reservation.childrenCount > 0 && (
                    <span className="text-slate-400">, {reservation.childrenCount} enfant{reservation.childrenCount > 1 ? "s" : ""}</span>
                  )}
                  {reservation.babyCount > 0 && (
                    <span className="text-slate-400">, {reservation.babyCount} bébé{reservation.babyCount > 1 ? "s" : ""}</span>
                  )}
                  {(reservation.adults > 0 || reservation.childrenCount > 0 || reservation.babyCount > 0) && (
                    <span className="text-slate-400">)</span>
                  )}
                </div>

                {reservation.note && (
                  <p className="text-sm text-slate-500 italic mb-3 line-clamp-2">
                    &quot;{reservation.note}&quot;
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefuse(reservation._id, reservation.version);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Refuser
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirm(reservation._id, reservation.version);
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Valider
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
