"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle,
  XCircle,
  UserCheck,
  LogOut,
  AlertTriangle,
  Loader2,
  Ban,
} from "lucide-react";
import type { ReservationData } from "./ReservationCard";

interface StatusActionsProps {
  reservation: ReservationData;
}

type ActionType = "confirm" | "refuse" | "seat" | "complete" | "noshow" | "cancel";

const actionConfig: Record<
  ActionType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: "default" | "destructive" | "outline" | "secondary";
    targetStatus: string;
    confirmTitle: string;
    confirmDescription: string;
  }
> = {
  confirm: {
    label: "Valider",
    icon: CheckCircle,
    variant: "default",
    targetStatus: "confirmed",
    confirmTitle: "Valider cette reservation ?",
    confirmDescription: "Le client recevra un email de confirmation.",
  },
  refuse: {
    label: "Refuser",
    icon: XCircle,
    variant: "destructive",
    targetStatus: "refused",
    confirmTitle: "Refuser cette reservation ?",
    confirmDescription: "Le client sera informe par email. Cette action est irreversible.",
  },
  seat: {
    label: "Installer",
    icon: UserCheck,
    variant: "default",
    targetStatus: "seated",
    confirmTitle: "Marquer comme installe ?",
    confirmDescription: "Le client est maintenant a table.",
  },
  complete: {
    label: "Terminer",
    icon: LogOut,
    variant: "secondary",
    targetStatus: "completed",
    confirmTitle: "Terminer cette reservation ?",
    confirmDescription: "Le client a quitte le restaurant.",
  },
  noshow: {
    label: "No-show",
    icon: AlertTriangle,
    variant: "destructive",
    targetStatus: "noshow",
    confirmTitle: "Marquer comme no-show ?",
    confirmDescription: "Le client ne s'est pas presente. Cette action est irreversible.",
  },
  cancel: {
    label: "Annuler",
    icon: Ban,
    variant: "outline",
    targetStatus: "cancelled",
    confirmTitle: "Annuler cette reservation ?",
    confirmDescription: "Le client sera informe par email. Cette action est irreversible.",
  },
};

// Define valid actions for each status based on state machine
const statusActions: Record<string, ActionType[]> = {
  pending: ["confirm", "refuse", "cancel"],
  confirmed: ["seat", "noshow", "cancel"],
  seated: ["complete", "noshow"],
  completed: [],
  noshow: [],
  cancelled: [],
  refused: [],
};

export function StatusActions({ reservation }: StatusActionsProps) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateReservation = useMutation(api.admin.updateReservation);

  const availableActions = statusActions[reservation.status] ?? [];

  const handleAction = async (action: ActionType) => {
    const config = actionConfig[action];
    setIsLoading(true);
    setError(null);

    try {
      await updateReservation({
        reservationId: reservation._id,
        expectedVersion: reservation.version,
        status: config.targetStatus as "pending" | "confirmed" | "seated" | "completed" | "noshow" | "cancelled" | "refused",
      });
      setPendingAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  if (availableActions.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        Aucune action disponible pour ce statut
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {availableActions.map((action) => {
          const config = actionConfig[action];
          const Icon = config.icon;

          return (
            <Button
              key={action}
              variant={config.variant}
              onClick={() => setPendingAction(action)}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              <Icon className="mr-2 h-4 w-4" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction && actionConfig[pendingAction].confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && actionConfig[pendingAction].confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingAction && handleAction(pendingAction)}
              disabled={isLoading}
              className={
                pendingAction &&
                ["refuse", "noshow", "cancel"].includes(pendingAction)
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
