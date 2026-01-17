"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Users,
  Phone,
  Mail,
  MessageSquare,
  CalendarDays,
  X,
  CheckCircle,
  XCircle,
  UserCheck,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import type { ReservationData } from "./ReservationCard";
import { StatusActions } from "./StatusActions";

interface ReservationDetailProps {
  reservation: ReservationData | null;
  onClose: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  pending: { label: "En attente", variant: "warning" },
  confirmed: { label: "Confirme", variant: "success" },
  seated: { label: "Installe", variant: "info" },
  completed: { label: "Termine", variant: "secondary" },
  noshow: { label: "No-show", variant: "destructive" },
  cancelled: { label: "Annule", variant: "outline" },
  refused: { label: "Refuse", variant: "destructive" },
};

function DetailContent({
  reservation,
  onClose,
  inline,
}: {
  reservation: ReservationData;
  onClose: () => void;
  inline?: boolean;
}) {
  const status = statusConfig[reservation.status] ?? {
    label: reservation.status,
    variant: "outline" as const,
  };

  const dateFormatted = format(new Date(reservation.dateKey), "EEEE d MMMM yyyy", {
    locale: fr,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            {reservation.firstName} {reservation.lastName}
          </h3>
          <Badge variant={status.variant} className="mt-1">
            {status.label}
          </Badge>
        </div>
        {inline && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      {/* Main info */}
      <div className="space-y-4">
        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{dateFormatted}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Heure</p>
              <p className="font-medium">{reservation.timeKey}</p>
            </div>
          </div>
        </div>

        {/* Party size */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Couverts</p>
            <p className="font-medium">
              {reservation.partySize} personne{reservation.partySize > 1 ? "s" : ""}
              <span className="ml-2 text-sm text-muted-foreground">
                ({reservation.adults} adulte{reservation.adults > 1 ? "s" : ""}
                {reservation.childrenCount > 0 &&
                  `, ${reservation.childrenCount} enfant${reservation.childrenCount > 1 ? "s" : ""}`}
                {reservation.babyCount > 0 &&
                  `, ${reservation.babyCount} bebe${reservation.babyCount > 1 ? "s" : ""}`}
                )
              </span>
            </p>
          </div>
        </div>

        <Separator />

        {/* Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a
              href={`tel:${reservation.phone}`}
              className="font-medium text-primary hover:underline"
            >
              {reservation.phone}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${reservation.email}`}
              className="text-sm text-primary hover:underline"
            >
              {reservation.email}
            </a>
          </div>
        </div>

        {/* Note */}
        {reservation.note && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-yellow-600" />
                <h4 className="text-sm font-medium">Note</h4>
              </div>
              <p className="rounded-lg bg-yellow-50 p-3 text-sm dark:bg-yellow-950/20">
                {reservation.note}
              </p>
            </div>
          </>
        )}

        {/* Options */}
        {reservation.options && reservation.options.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Options</h4>
              <div className="flex flex-wrap gap-2">
                {reservation.options.map((option) => (
                  <Badge key={option} variant="outline">
                    {option === "highChair" && "Chaise haute"}
                    {option === "wheelchair" && "Acces PMR"}
                    {option === "dog" && "Avec chien"}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tables */}
        {reservation.tableIds.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Tables attribuees
              </h4>
              <div className="flex flex-wrap gap-2">
                {reservation.tableIds.map((tableId, index) => (
                  <Badge key={tableId} variant="secondary">
                    Table {index + 1}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Source info */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>
            Source: {reservation.source} | Version: {reservation.version}
          </p>
        </div>
      </div>

      {/* Actions - pushed to bottom */}
      <div className="mt-auto pt-4">
        <StatusActions reservation={reservation} />
      </div>
    </div>
  );
}

export function ReservationDetail({
  reservation,
  onClose,
  open,
  onOpenChange,
  inline,
}: ReservationDetailProps) {
  if (!reservation) return null;

  // Inline mode for desktop
  if (inline) {
    return (
      <Card>
        <CardContent className="p-4">
          <DetailContent
            reservation={reservation}
            onClose={onClose}
            inline
          />
        </CardContent>
      </Card>
    );
  }

  // Sheet mode for mobile
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>Details de la reservation</SheetTitle>
        </SheetHeader>
        <DetailContent reservation={reservation} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}
