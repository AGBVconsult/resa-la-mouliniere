"use client";

import { Clock, Users, Phone, Mail, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export interface ReservationData {
  _id: Id<"reservations">;
  dateKey: string;
  service: "lunch" | "dinner";
  timeKey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partySize: number;
  adults: number;
  childrenCount: number;
  babyCount: number;
  status: string;
  source: string;
  tableIds: Id<"tables">[];
  note?: string;
  options?: string[];
  version: number;
}

interface ReservationCardProps {
  reservation: ReservationData;
  onClick?: () => void;
  isSelected?: boolean;
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

const sourceConfig: Record<string, string> = {
  online: "Web",
  admin: "Admin",
  phone: "Tel",
  walkin: "Walk-in",
};

export function ReservationCard({
  reservation,
  onClick,
  isSelected,
}: ReservationCardProps) {
  const status = statusConfig[reservation.status] ?? {
    label: reservation.status,
    variant: "outline" as const,
  };

  const hasNote = reservation.note && reservation.note.trim().length > 0;
  const hasOptions = reservation.options && reservation.options.length > 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        reservation.status === "pending" && "border-yellow-300 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20",
        reservation.status === "seated" && "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side: Time and guest info */}
          <div className="flex-1 space-y-2">
            {/* Time and name */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-lg font-semibold">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {reservation.timeKey}
              </div>
              <span className="text-lg font-medium">
                {reservation.firstName} {reservation.lastName}
              </span>
            </div>

            {/* Party size */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>
                  {reservation.partySize} couvert{reservation.partySize > 1 ? "s" : ""}
                </span>
                {(reservation.childrenCount > 0 || reservation.babyCount > 0) && (
                  <span className="text-xs">
                    ({reservation.adults}A
                    {reservation.childrenCount > 0 && ` ${reservation.childrenCount}E`}
                    {reservation.babyCount > 0 && ` ${reservation.babyCount}B`})
                  </span>
                )}
              </div>

              {/* Contact icons */}
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${reservation.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <a
                  href={`mailto:${reservation.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary"
                >
                  <Mail className="h-4 w-4" />
                </a>
                {hasNote && (
                  <MessageSquare className="h-4 w-4 text-yellow-600" />
                )}
              </div>
            </div>

            {/* Options badges */}
            {hasOptions && (
              <div className="flex flex-wrap gap-1">
                {reservation.options?.map((option) => (
                  <Badge key={option} variant="outline" className="text-xs">
                    {option === "highChair" && "Chaise haute"}
                    {option === "wheelchair" && "PMR"}
                    {option === "dog" && "Chien"}
                  </Badge>
                ))}
              </div>
            )}

            {/* Tables */}
            {reservation.tableIds.length > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Tables:</span>
                {reservation.tableIds.map((tableId, index) => (
                  <Badge key={tableId} variant="secondary" className="text-xs">
                    T{index + 1}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Right side: Status and source */}
          <div className="flex flex-col items-end gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {sourceConfig[reservation.source] ?? reservation.source}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
