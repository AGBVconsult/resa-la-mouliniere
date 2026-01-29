"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { ReservationStatus } from "../../../../../spec/contracts.generated";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";

import {
  ReservationHeader,
  ReservationList,
  DatePickerCalendar,
  CreateReservationModal,
  ImportReservationModal,
  DayOverrideModal,
  type Reservation,
} from "./components";
import { ServiceFloorPlan } from "@/components/admin/floor-plan/ServiceFloorPlan";

export default function ReservationsPage() {
  const searchParams = useSearchParams();
  
  // State - initialize from URL param if present
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return parseISO(dateParam);
    }
    return new Date();
  });
  const [currentService, setCurrentService] = useState<"lunch" | "dinner">(() => {
    const serviceParam = searchParams.get("service");
    if (serviceParam === "lunch" || serviceParam === "dinner") {
      return serviceParam;
    }
    const hour = new Date().getHours();
    return hour < 15 ? "lunch" : "dinner";
  });
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"reservations"> | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [selectedForAssignment, setSelectedForAssignment] = useState<Reservation | null>(null);

  // Format date for API
  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // Fetch slots for capacities
  const slotsData = useQuery(api.slots.listByDate, { dateKey });

  // Fetch tables for display
  const tablesData = useQuery(api.tables.list, {});

  // Build slotCapacities map for current service
  const slotCapacities = useMemo(() => {
    if (!slotsData) return {};
    const slots = currentService === "lunch" ? slotsData.lunch : slotsData.dinner;
    const capacities: Record<string, number> = {};
    for (const slot of slots) {
      if (slot.isOpen) {
        capacities[slot.timeKey] = slot.capacity;
      }
    }
    return capacities;
  }, [slotsData, currentService]);

  // Fetch reservations
  const { results: reservations, status, loadMore } = usePaginatedQuery(
    api.admin.listReservations,
    { dateKey, service: currentService },
    { initialNumItems: 50 }
  );

  // Mutation for status updates
  const updateReservation = useMutation(api.admin.updateReservation);
  const { toast } = useToast();

  // Handlers
  const handleToggleExpand = useCallback((id: Id<"reservations">) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleStatusChange = useCallback(
    async (id: Id<"reservations">, status: ReservationStatus, version: number) => {
      try {
        await updateReservation({
          reservationId: id,
          expectedVersion: version,
          status,
        });
        toast.success("Statut mis à jour");
      } catch (error) {
        toast.error(formatConvexError(error, "Erreur lors de la mise à jour"));
      }
    },
    [updateReservation, toast]
  );

  const handleEdit = useCallback((reservation: Reservation) => {
    setEditingReservation(reservation);
  }, []);

  // Handle table assignment selection
  const handleSelectForAssignment = useCallback((reservation: Reservation) => {
    setSelectedForAssignment(reservation);
    setShowFloorPlan(true);
  }, []);

  const handleAssignmentComplete = useCallback(() => {
    setSelectedForAssignment(null);
  }, []);

  const isLoading = status === "LoadingFirstPage";

  return (
    <div className="h-full flex flex-col" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <ReservationHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        currentService={currentService}
        onServiceChange={setCurrentService}
        showFloorPlan={showFloorPlan}
        onToggleFloorPlan={() => setShowFloorPlan(!showFloorPlan)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenDatePicker={() => setShowDatePicker(true)}
        onCreateReservation={() => setShowCreateModal(true)}
        onImportReservation={() => setShowImportModal(true)}
      />

      {/* Date Picker Overlay */}
      {showDatePicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 40 }}
            onClick={() => setShowDatePicker(false)}
          />
          <div style={{ position: 'absolute', top: '5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
            <DatePickerCalendar
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              onClose={() => setShowDatePicker(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 gap-4" style={{ flex: '1 1 0%', display: 'flex', minHeight: 0, gap: '1rem' }}>
        {/* Reservation List */}
        <div
          className={cn(
            "flex flex-col bg-white border rounded-lg transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden",
            showFloorPlan ? "flex-1 min-w-[350px]" : "w-full"
          )}
          style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden', flex: showFloorPlan ? '1 1 0%' : undefined, minWidth: showFloorPlan ? '350px' : undefined, width: showFloorPlan ? undefined : '100%' }}
        >
          {isLoading ? (
            <div style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} />
            </div>
          ) : (
            <ReservationList
              reservations={(reservations as Reservation[]) || []}
              isCompact={showFloorPlan}
              expandedId={expandedId}
              selectedForAssignmentId={selectedForAssignment?._id}
              onToggleExpand={handleToggleExpand}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onSelectForAssignment={handleSelectForAssignment}
              slotCapacities={slotCapacities}
              tables={tablesData ?? []}
            />
          )}

          {/* Load more */}
          {status === "CanLoadMore" && (
            <button
              onClick={() => loadMore(50)}
              className="py-3 text-sm text-blue-600 hover:bg-gray-50 border-t"
              style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', fontSize: '0.875rem', color: '#2563eb', backgroundColor: 'transparent', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', borderTop: '1px solid #e2e8f0', cursor: 'pointer', width: '100%' }}
            >
              Charger plus de réservations
            </button>
          )}
        </div>

        {/* Floor Plan - shrink to fit content */}
        {showFloorPlan && (
          <div style={{ flexShrink: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <ServiceFloorPlan
              dateKey={dateKey}
              service={currentService}
              selectedReservationId={selectedForAssignment?._id}
              selectedReservationVersion={selectedForAssignment?.version}
              selectedPartySize={selectedForAssignment?.partySize}
              selectedReservationName={selectedForAssignment ? `${selectedForAssignment.lastName} (${selectedForAssignment.partySize}p)` : undefined}
              onAssignmentComplete={handleAssignmentComplete}
            />
          </div>
        )}
      </div>

      {/* Edit Modal (placeholder) */}
      {editingReservation && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setEditingReservation(null)}
          />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Modifier la réservation
            </h2>
            <p style={{ color: '#6b7280' }}>
              {editingReservation.lastName} {editingReservation.firstName} - {editingReservation.partySize} pers.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>Formulaire d&apos;édition - À implémenter</p>
            <button
              style={{ marginTop: '1rem', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', backgroundColor: 'black', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
              onClick={() => setEditingReservation(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Create Reservation Modal */}
      {showCreateModal && (
        <CreateReservationModal
          dateKey={dateKey}
          service={currentService}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Day Override Modal */}
      {showSettings && (
        <DayOverrideModal
          dateKey={dateKey}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Import Reservation Modal (Migration) */}
      {showImportModal && (
        <ImportReservationModal
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
