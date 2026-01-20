"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  ReservationHeader,
  ReservationList,
  DatePickerCalendar,
  CreateReservationModal,
  DayOverrideModal,
  type Reservation,
} from "./components";

export default function ReservationsPage() {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentService, setCurrentService] = useState<"lunch" | "dinner">(() => {
    const hour = new Date().getHours();
    return hour < 15 ? "lunch" : "dinner";
  });
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"reservations"> | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  // Format date for API
  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // Fetch slots for capacities
  const slotsData = useQuery(api.slots.listByDate, { dateKey });

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

  // Handlers
  const handleToggleExpand = useCallback((id: Id<"reservations">) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleStatusChange = useCallback(
    async (id: Id<"reservations">, status: string, version: number) => {
      try {
        await updateReservation({
          reservationId: id,
          expectedVersion: version,
          status: status as any,
        });
      } catch (error) {
        console.error("Error updating reservation:", error);
      }
    },
    [updateReservation]
  );

  const handleEdit = useCallback((reservation: Reservation) => {
    setEditingReservation(reservation);
  }, []);

  const isLoading = status === "LoadingFirstPage";

  return (
    <div className="h-full flex flex-col">
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
      />

      {/* Date Picker Overlay */}
      {showDatePicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDatePicker(false)}
          />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
            <DatePickerCalendar
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              onClose={() => setShowDatePicker(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Reservation List */}
        <div
          className={cn(
            "flex flex-col bg-white border rounded-lg transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
            showFloorPlan ? "w-1/3 min-w-[400px]" : "w-full"
          )}
        >
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <ReservationList
              reservations={(reservations as Reservation[]) || []}
              isCompact={showFloorPlan}
              expandedId={expandedId}
              onToggleExpand={handleToggleExpand}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              slotCapacities={slotCapacities}
            />
          )}

          {/* Load more */}
          {status === "CanLoadMore" && (
            <button
              onClick={() => loadMore(50)}
              className="py-3 text-sm text-blue-600 hover:bg-gray-50 border-t"
            >
              Charger plus de réservations
            </button>
          )}
        </div>

        {/* Floor Plan (placeholder) */}
        {showFloorPlan && (
          <div className="flex-1 ml-4 bg-white border rounded-lg overflow-hidden animate-in slide-in-from-right-8 fade-in duration-500">
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">Plan de salle</p>
                <p className="text-sm">À implémenter</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal (placeholder) */}
      {editingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditingReservation(null)}
          />
          <div className="relative bg-white rounded-xl p-6 w-[600px] max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-semibold mb-4">
              Modifier la réservation
            </h2>
            <p className="text-gray-500">
              {editingReservation.lastName} {editingReservation.firstName} - {editingReservation.partySize} pers.
            </p>
            <p className="text-sm text-gray-400 mt-2">Formulaire d&apos;édition - À implémenter</p>
            <button
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg"
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
    </div>
  );
}
