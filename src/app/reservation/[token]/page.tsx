"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarIcon,
  Clock,
  Users,
  User,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import { generateUUID } from "@/lib/utils";

type Language = "fr" | "nl" | "en" | "de" | "it";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function ReservationPage({ params }: PageProps) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") || "fr") as Language;
  const { t } = useTranslation(lang);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [idemKey] = useState(() => generateUUID());

  const reservation = useQuery(api.reservations.getByToken, { token });
  const cancelByToken = useAction(api.reservations.cancelByToken);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      await cancelByToken({
        token,
        idemKey,
      });
      setCancelled(true);
      setShowCancelDialog(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("common.error");
      setError(errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  if (reservation === undefined) {
    return (
      <div className="container mx-auto max-w-lg p-4">
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found or expired
  if (reservation === null) {
    return (
      <div className="container mx-auto max-w-lg p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-lg font-semibold">{t("reservation.notFound")}</h2>
            <p className="mt-2 text-muted-foreground">{t("reservation.expired")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    seated: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-800",
    noshow: "bg-red-100 text-red-800",
    cancelled: "bg-red-100 text-red-800",
    refused: "bg-red-100 text-red-800",
  };

  const res = reservation.reservation;
  const canCancel = ["pending", "confirmed"].includes(res.status);

  return (
    <div className="container mx-auto max-w-lg p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t("reservation.title")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {cancelled && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>{t("reservation.actions.cancelled")}</AlertDescription>
            </Alert>
          )}

          {/* Status badge */}
          <div className="flex justify-center">
            <span
              className={`rounded-full px-4 py-1 text-sm font-medium ${
                statusColors[res.status] || "bg-gray-100"
              }`}
            >
              {t(`reservation.status.${res.status}`)}
            </span>
          </div>

          {/* Reservation details */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("reservation.details.date")}
                </p>
                <p className="font-medium">{res.dateKey}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("reservation.details.time")}
                </p>
                <p className="font-medium">{res.timeKey}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("reservation.details.guests")}
                </p>
                <p className="font-medium">{res.partySize}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("reservation.details.name")}
                </p>
                <p className="font-medium">
                  {res.firstName} {res.lastName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("reservation.details.email")}
                </p>
                <p className="font-medium">{res.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("reservation.details.phone")}
                </p>
                <p className="font-medium">{res.phone}</p>
              </div>
            </div>

          </div>

          {/* Cancel button */}
          {canCancel && !cancelled && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t("reservation.actions.cancel")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reservation.actions.cancel")}</DialogTitle>
            <DialogDescription>
              {t("reservation.actions.cancelConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
            >
              {t("common.no")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.yes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
