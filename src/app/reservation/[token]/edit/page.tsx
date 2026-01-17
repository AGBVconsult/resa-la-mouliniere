"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language } from "@/components/booking/types";
import { formatDateShort } from "@/lib/utils";
import { BookingHeader } from "@/app/widget/components/BookingHeader";
import { BookingFooter } from "@/app/widget/components/BookingFooter";
import { StepHeader } from "@/app/widget/components/ui/StepHeader";
import { CounterRow } from "@/app/widget/components/ui/CounterRow";
import { Toggle } from "@/app/widget/components/ui/Toggle";
import { MiniCalendarStrip } from "@/app/widget/components/calendar/MiniCalendarStrip";
import { MonthCalendar } from "@/app/widget/components/calendar/MonthCalendar";
import { TimeSlotGrid } from "@/app/widget/components/ui/TimeSlotGrid";

import { COLORS } from "@/components/booking/constants";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Baby,
  Accessibility,
  Dog,
} from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

type Service = "lunch" | "dinner";

interface SlotDto {
  slotKey: string;
  dateKey: string;
  service: Service;
  timeKey: string;
  isOpen: boolean;
  capacity: number;
  remainingCapacity: number;
  maxGroupSize: number | null;
}

export default function EditReservationPage({ params }: PageProps) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = (searchParams.get("lang") || "fr") as Language;
  const { t } = useTranslation(lang);

  // Form state
  const [dateKey, setDateKey] = useState<string>("");
  const [service, setService] = useState<Service>("lunch");
  const [timeKey, setTimeKey] = useState<string>("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [note, setNote] = useState("");
  const [requiresHighChair, setRequiresHighChair] = useState(false);
  const [requiresWheelchair, setRequiresWheelchair] = useState(false);
  const [requiresDogAccess, setRequiresDogAccess] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [idemKey] = useState(() => crypto.randomUUID());
  const [initialized, setInitialized] = useState(false);
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);

  // Load reservation data
  const reservation = useQuery(api.reservations.getByToken, { token });
  const updateByToken = useAction(api.reservations.updateByToken);

  // Compute party size
  const partySize = adults + children + babies;

  // Load availability for selected date
  const availability = useQuery(
    api.availability.getDay,
    dateKey ? { dateKey, partySize } : "skip"
  );

  // Load month availability for calendar strip
  const selectedDate = dateKey ? new Date(dateKey + "T12:00:00") : new Date();
  const monthData = useQuery(api.availability.getMonth, {
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
    partySize,
  });

  // Load month availability for full calendar view
  const calendarMonthData = useQuery(api.availability.getMonth, {
    year: calendarYear,
    month: calendarMonth,
    partySize,
  });

  // Initialize form with current reservation data
  useEffect(() => {
    if (reservation && !initialized) {
      const res = reservation.reservation;
      setDateKey(res.dateKey);
      setService(res.service);
      setTimeKey(res.timeKey);
      setAdults(res.adults);
      setChildren(res.childrenCount);
      setBabies(res.babyCount);
      setNote((res as { note?: string }).note || "");
      // Initialize options from reservation
      const options = (res as { options?: string[] }).options || [];
      setRequiresHighChair(options.includes("highChair"));
      setRequiresWheelchair(options.includes("wheelchair"));
      setRequiresDogAccess(options.includes("dogAccess"));
      setInitialized(true);
    }
  }, [reservation, initialized]);

  // Get available slots for lunch and dinner
  const lunchSlots = useMemo(() => {
    if (!availability) return [];
    return availability.lunch.filter(
      (slot: SlotDto) =>
        slot.isOpen &&
        slot.remainingCapacity >= partySize &&
        (slot.maxGroupSize === null || partySize <= slot.maxGroupSize)
    );
  }, [availability, partySize]);

  const dinnerSlots = useMemo(() => {
    if (!availability) return [];
    return availability.dinner.filter(
      (slot: SlotDto) =>
        slot.isOpen &&
        slot.remainingCapacity >= partySize &&
        (slot.maxGroupSize === null || partySize <= slot.maxGroupSize)
    );
  }, [availability, partySize]);

  // Combined available slots for validation
  const availableSlots = useMemo(() => {
    return service === "lunch" ? lunchSlots : dinnerSlots;
  }, [service, lunchSlots, dinnerSlots]);

  // Check if current timeKey is valid for new selection
  useEffect(() => {
    if (availableSlots.length > 0) {
      const currentSlotValid = availableSlots.some(
        (slot: SlotDto) => slot.timeKey === timeKey
      );
      if (!currentSlotValid) {
        setTimeKey(availableSlots[0].timeKey);
      }
    }
  }, [availableSlots, timeKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeKey || !dateKey) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updateByToken({
        token,
        dateKey,
        service,
        timeKey,
        adults,
        childrenCount: children,
        babyCount: babies,
        note: note || undefined,
        idemKey,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/reservation/${token}?lang=${lang}`);
  };

  // Loading state
  if (reservation === undefined) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  // Not found or expired
  if (reservation === null) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Réservation introuvable
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Ce lien a expiré ou n&apos;est plus valide.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const res = reservation.reservation;
  const canEdit = ["pending", "confirmed"].includes(res.status);

  // Cannot edit
  if (!canEdit) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Modification impossible
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Cette réservation ne peut plus être modifiée.
            </p>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              <ArrowLeft size={18} />
              {t.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Réservation modifiée
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Un email de confirmation vous a été envoyé.
            </p>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              <ArrowLeft size={18} />
              Retour à ma réservation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Generate date options (today + 60 days)
  const dateOptions: string[] = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dateOptions.push(date.toISOString().split("T")[0]);
  }

  const canSubmit = !isSubmitting && timeKey && availableSlots.length > 0;

  return (
    <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
      <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
        <BookingHeader
          currentStep={1}
          lang={lang}
          onLangChange={(newLang) => {
            router.push(`/reservation/${token}/edit?lang=${newLang}`);
          }}
          guestCount={partySize}
          guestLabel={partySize > 1 ? t.convives : t.convive}
          dateLabel={dateKey ? formatDateShort(dateKey, lang) : undefined}
          timeLabel={timeKey || undefined}
        />
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex flex-col h-full bg-slate-50">
        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <StepHeader
            title={t.edit_title}
            subtitle={t.edit_subtitle}
            className="mb-6"
          />

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={18} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Date selection - MiniCalendarStrip ou MonthCalendar */}
          {dateKey && !showMonthlyCalendar && (
            <div className="mb-4">
              <div className="text-center pt-4 font-bold text-lg">
                {t.months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </div>
              
              <MiniCalendarStrip
                selectedDateKey={dateKey}
                onDateSelect={(newDateKey) => {
                  setDateKey(newDateKey);
                  setTimeKey("");
                }}
                monthData={monthData ?? undefined}
                lang={lang}
              />

              <div className="text-center pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthlyCalendar(true);
                    const d = new Date(dateKey + "T12:00:00");
                    setCalendarYear(d.getFullYear());
                    setCalendarMonth(d.getMonth() + 1);
                  }}
                  className="text-sm text-slate-500 underline hover:text-slate-700"
                >
                  {t.show_monthly_calendar}
                </button>
              </div>
            </div>
          )}

          {/* Monthly Calendar */}
          {dateKey && showMonthlyCalendar && (
            <div className="mb-4">
              <MonthCalendar
                year={calendarYear}
                month={calendarMonth}
                monthData={calendarMonthData ?? undefined}
                selectedDate={dateKey}
                onSelectDate={(newDateKey) => {
                  setDateKey(newDateKey);
                  setTimeKey("");
                  setShowMonthlyCalendar(false);
                }}
                onPrevMonth={() => {
                  if (calendarMonth === 1) {
                    setCalendarYear(calendarYear - 1);
                    setCalendarMonth(12);
                  } else {
                    setCalendarMonth(calendarMonth - 1);
                  }
                }}
                onNextMonth={() => {
                  if (calendarMonth === 12) {
                    setCalendarYear(calendarYear + 1);
                    setCalendarMonth(1);
                  } else {
                    setCalendarMonth(calendarMonth + 1);
                  }
                }}
                lang={lang}
              />

              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={() => setShowMonthlyCalendar(false)}
                  className="text-sm text-slate-500 underline hover:text-slate-700"
                >
                  {t.hide_monthly_calendar}
                </button>
              </div>
            </div>
          )}

          {/* Time slots - comme dans le widget */}
          {dateKey && (
            <div className="space-y-4">
              {/* Lunch slots */}
              {lunchSlots.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.lunch.available }}
                    />
                    {t.lunch} {t.lunch_hours}
                  </h3>
                  <TimeSlotGrid
                    slots={lunchSlots}
                    selectedTime={service === "lunch" ? timeKey : null}
                    onSelect={(time) => {
                      setService("lunch");
                      setTimeKey(time);
                    }}
                    color="amber"
                  />
                </div>
              )}

              {/* Dinner slots */}
              {dinnerSlots.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS.dinner.available }}
                    />
                    {t.dinner} {t.dinner_hours}
                  </h3>
                  <TimeSlotGrid
                    slots={dinnerSlots}
                    selectedTime={service === "dinner" ? timeKey : null}
                    onSelect={(time) => {
                      setService("dinner");
                      setTimeKey(time);
                    }}
                    color="blue"
                  />
                </div>
              )}

              {/* No slots available */}
              {lunchSlots.length === 0 && dinnerSlots.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  {t.no_slots}
                </p>
              )}
            </div>
          )}

          {/* Guests selection */}
          <div className="mb-4 mt-6">
            <CounterRow
              label={t.adults || "Adultes"}
              value={adults}
              onChange={setAdults}
              min={1}
              max={15}
            />
            <div className="border-t border-slate-100" />
            <CounterRow
              label={t.children || "Enfants"}
              sublabel={t.children_age || "3-12 ans"}
              value={children}
              onChange={setChildren}
              min={0}
              max={10}
            />
            <div className="border-t border-slate-100" />
            <CounterRow
              label={t.babies || "Bébés"}
              sublabel={t.babies_age || "0-2 ans"}
              value={babies}
              onChange={setBabies}
              min={0}
              max={5}
            />
          </div>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {/* Chaise haute - SEULEMENT si babies > 0 */}
            {babies > 0 && (
              <Toggle
                label={t.high_chair}
                icon={Baby}
                checked={requiresHighChair}
                onChange={setRequiresHighChair}
                highlighted
              />
            )}

            {/* PMR - Toujours visible */}
            <Toggle
              label={t.wheelchair}
              icon={Accessibility}
              checked={requiresWheelchair}
              onChange={setRequiresWheelchair}
            />

            {/* Chien - Toujours visible */}
            <Toggle
              label={t.dog}
              icon={Dog}
              checked={requiresDogAccess}
              onChange={setRequiresDogAccess}
            />
          </div>

          {/* Note */}
          <div className="mb-4">
            <label className="text-sm font-bold text-slate-700 mb-3 block">
              {t.note || "Note (optionnel)"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.message_placeholder}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Footer - Total + Boutons */}
        <div className="px-6 py-4 bg-white border-t">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-900 transition-all"
            >
              <ArrowLeft size={18} />
              {t.back}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-white text-sm transition-all ${
                canSubmit
                  ? "bg-slate-900 hover:bg-slate-800 active:scale-[0.98]"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
              {t.modify_booking}
            </button>
          </div>
        </div>
          </div>
        </div>
        <BookingFooter />
      </div>
    </div>
  );
}
