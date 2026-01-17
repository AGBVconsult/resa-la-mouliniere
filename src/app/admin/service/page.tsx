"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { format } from "date-fns";

import { DateServiceSelector } from "@/components/admin/DateServiceSelector";
import { ReservationList } from "@/components/admin/ReservationList";
import { ReservationDetail } from "@/components/admin/ReservationDetail";
import type { ReservationData } from "@/components/admin/ReservationCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ServicePage() {
  const searchParams = useSearchParams();

  // Get date and service from URL params, default to today and lunch
  const today = format(new Date(), "yyyy-MM-dd");
  const dateKey = searchParams.get("date") ?? today;
  const service = (searchParams.get("service") ?? "lunch") as "lunch" | "dinner";

  // Selected reservation for detail panel
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch reservations for current date/service
  const reservationsResult = useQuery(api.admin.listReservations, {
    dateKey,
    service,
    paginationOpts: { numItems: 100, cursor: null },
  });

  // Fetch counts for both services (for the selector)
  const lunchResult = useQuery(api.admin.listReservations, {
    dateKey,
    service: "lunch",
    paginationOpts: { numItems: 100, cursor: null },
  });

  const dinnerResult = useQuery(api.admin.listReservations, {
    dateKey,
    service: "dinner",
    paginationOpts: { numItems: 100, cursor: null },
  });

  const isLoading = reservationsResult === undefined;
  const reservations = (reservationsResult?.page ?? []) as ReservationData[];

  const lunchCount = lunchResult?.page?.filter((r) =>
    ["pending", "confirmed", "seated"].includes(r.status)
  ).length ?? 0;

  const dinnerCount = dinnerResult?.page?.filter((r) =>
    ["pending", "confirmed", "seated"].includes(r.status)
  ).length ?? 0;

  // Handle reservation selection
  const handleSelectReservation = (reservation: ReservationData) => {
    setSelectedReservation(reservation);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    // Keep selection visible for a moment for visual feedback
    setTimeout(() => setSelectedReservation(null), 300);
  };

  // Update selected reservation when data changes (real-time updates)
  useEffect(() => {
    if (selectedReservation && reservations.length > 0) {
      const updated = reservations.find((r) => r._id === selectedReservation._id);
      if (updated) {
        setSelectedReservation(updated);
      }
    }
  }, [reservations, selectedReservation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vue Service</h1>
          <p className="text-muted-foreground">
            Gestion des reservations du {service === "lunch" ? "dejeuner" : "diner"}
          </p>
        </div>

        <Button size="lg" className="min-h-[44px]">
          <Plus className="mr-2 h-5 w-5" />
          Nouvelle reservation
        </Button>
      </div>

      {/* Date and service selector */}
      <DateServiceSelector
        dateKey={dateKey}
        service={service}
        lunchCount={lunchCount}
        dinnerCount={dinnerCount}
      />

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Reservation list */}
        <div>
          <ReservationList
            reservations={reservations}
            onSelectReservation={handleSelectReservation}
            selectedReservationId={selectedReservation?._id}
            isLoading={isLoading}
          />
        </div>

        {/* Detail panel (desktop) - shown inline on large screens */}
        <div className="hidden lg:block">
          {selectedReservation ? (
            <div className="sticky top-4">
              <ReservationDetail
                reservation={selectedReservation}
                onClose={handleCloseDetail}
                inline
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">
                Selectionnez une reservation pour voir les details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel (mobile) - shown as sheet */}
      <ReservationDetail
        reservation={selectedReservation}
        onClose={handleCloseDetail}
        open={isDetailOpen && !!selectedReservation}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
