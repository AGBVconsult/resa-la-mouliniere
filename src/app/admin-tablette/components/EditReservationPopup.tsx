"use client";

import { useState } from "react";
import { X, Loader2, Users, Clock, Calendar, MessageSquare, Phone, Mail } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";

interface Reservation {
  _id: Id<"reservations">;
  dateKey: string;
  timeKey: string;
  service: "lunch" | "dinner";
  partySize: number;
  adults: number;
  childrenCount: number;
  babyCount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note?: string;
  options?: string[];
  version: number;
}

interface EditReservationPopupProps {
  reservation: Reservation;
  onClose: () => void;
  onSuccess: () => void;
}

const TIME_SLOTS_LUNCH = [
  "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45",
  "14:00", "14:15", "14:30"
];

const TIME_SLOTS_DINNER = [
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00", "20:15", "20:30", "20:45",
  "21:00", "21:15", "21:30"
];

const OPTIONS = [
  { id: "highchair", label: "Chaise haute" },
  { id: "wheelchair", label: "PMR" },
  { id: "stroller", label: "Poussette" },
  { id: "dog", label: "Chien" },
];

export function EditReservationPopup({ reservation, onClose, onSuccess }: EditReservationPopupProps) {
  const { toast } = useToast();
  const updateReservationFull = useMutation(api.admin.updateReservationFull);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    dateKey: reservation.dateKey,
    service: reservation.service,
    timeKey: reservation.timeKey,
    adults: reservation.adults,
    childrenCount: reservation.childrenCount,
    babyCount: reservation.babyCount,
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    phone: reservation.phone,
    email: reservation.email,
    note: reservation.note || "",
    options: reservation.options || [],
  });

  const timeSlots = formData.service === "lunch" ? TIME_SLOTS_LUNCH : TIME_SLOTS_DINNER;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateReservationFull({
        reservationId: reservation._id,
        expectedVersion: reservation.version,
        dateKey: formData.dateKey,
        service: formData.service,
        timeKey: formData.timeKey,
        adults: formData.adults,
        childrenCount: formData.childrenCount,
        babyCount: formData.babyCount,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        note: formData.note || undefined,
        options: formData.options.length > 0 ? formData.options : undefined,
      });

      toast.success("Réservation modifiée");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(formatConvexError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOption = (optionId: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.includes(optionId)
        ? prev.options.filter((o) => o !== optionId)
        : [...prev.options, optionId],
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />

      {/* Popup */}
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-[201] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Modifier la réservation</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date & Service */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Calendar size={14} className="inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={formData.dateKey}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateKey: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Service
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, service: "lunch", timeKey: "12:00" }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    formData.service === "lunch"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Midi
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, service: "dinner", timeKey: "19:00" }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    formData.service === "dinner"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Soir
                </button>
              </div>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Clock size={14} className="inline mr-1" />
              Heure
            </label>
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, timeKey: time }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.timeKey === time
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Party size */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Users size={14} className="inline mr-1" />
              Couverts
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Adultes</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-semibold">{formData.adults}</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, adults: prev.adults + 1 }))}
                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Enfants</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, childrenCount: Math.max(0, prev.childrenCount - 1) }))}
                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-semibold">{formData.childrenCount}</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, childrenCount: prev.childrenCount + 1 }))}
                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bébés</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, babyCount: Math.max(0, prev.babyCount - 1) }))}
                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-semibold">{formData.babyCount}</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, babyCount: prev.babyCount + 1 }))}
                    className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Nom
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Phone size={14} className="inline mr-1" />
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Mail size={14} className="inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Options
            </label>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.options.includes(option.id)
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <MessageSquare size={14} className="inline mr-1" />
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Note interne..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl"
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
