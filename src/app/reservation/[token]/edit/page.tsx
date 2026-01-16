"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Language } from "../../../../../spec/contracts.generated";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  Minus,
  Plus,
  ArrowLeft,
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

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [idemKey] = useState(() => crypto.randomUUID());
  const [initialized, setInitialized] = useState(false);

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
      setNote(res.note || "");
      setInitialized(true);
    }
  }, [reservation, initialized]);

  // Get available slots for selected service
  const availableSlots = useMemo(() => {
    if (!availability) return [];
    const slots = service === "lunch" ? availability.lunch : availability.dinner;
    return slots.filter(
      (slot: SlotDto) =>
        slot.isOpen &&
        slot.remainingCapacity >= partySize &&
        (slot.maxGroupSize === null || partySize <= slot.maxGroupSize)
    );
  }, [availability, service, partySize]);

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
        err instanceof Error ? err.message : t("common.error");
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
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-lg font-semibold">
              {t("reservation.notFound")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("reservation.expired")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const res = reservation.reservation;
  const canEdit = ["pending", "confirmed"].includes(res.status);

  // Cannot edit
  if (!canEdit) {
    return (
      <div className="container mx-auto max-w-lg p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">
              {t("reservation.edit.cannotEdit")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("reservation.edit.statusNotAllowed")}
            </p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="container mx-auto max-w-lg p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-semibold">
              {t("reservation.edit.success")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("reservation.edit.emailSent")}
            </p>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("reservation.edit.backToReservation")}
            </Button>
          </CardContent>
        </Card>
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

  return (
    <div className="container mx-auto max-w-lg p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle>{t("reservation.edit.title")}</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Date selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {t("reservation.details.date")}
              </Label>
              <Select value={dateKey} onValueChange={setDateKey}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reservation.edit.selectDate")} />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((date) => (
                    <SelectItem key={date} value={date}>
                      {new Date(date).toLocaleDateString(lang, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service selection */}
            <div className="space-y-2">
              <Label>{t("reservation.edit.service")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={service === "lunch" ? "default" : "outline"}
                  onClick={() => setService("lunch")}
                >
                  {t("widget.calendar.lunch")}
                </Button>
                <Button
                  type="button"
                  variant={service === "dinner" ? "default" : "outline"}
                  onClick={() => setService("dinner")}
                >
                  {t("widget.calendar.dinner")}
                </Button>
              </div>
            </div>

            {/* Time selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("reservation.details.time")}
              </Label>
              {availability === undefined ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("widget.calendar.noAvailability")}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot: SlotDto) => (
                    <Button
                      key={slot.timeKey}
                      type="button"
                      variant={timeKey === slot.timeKey ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeKey(slot.timeKey)}
                    >
                      {slot.timeKey}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Guests selection */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("reservation.details.guests")}
              </Label>

              {/* Adults */}
              <div className="flex items-center justify-between">
                <span>{t("widget.guests.adults")}</span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    disabled={adults <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{adults}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAdults(Math.min(15, adults + 1))}
                    disabled={adults >= 15}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <span>{t("widget.guests.children")}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({t("widget.guests.childrenAge")})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    disabled={children <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{children}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setChildren(Math.min(10, children + 1))}
                    disabled={children >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Babies */}
              <div className="flex items-center justify-between">
                <div>
                  <span>{t("widget.guests.babies")}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({t("widget.guests.babiesAge")})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setBabies(Math.max(0, babies - 1))}
                    disabled={babies <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{babies}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setBabies(Math.min(5, babies + 1))}
                    disabled={babies >= 5}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">{t("widget.guests.total")}</span>
                <span className="font-medium">
                  {partySize} {t("widget.guests.guests")}
                </span>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>{t("reservation.details.notes")}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("reservation.edit.notePlaceholder")}
                rows={3}
              />
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !timeKey || availableSlots.length === 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("reservation.edit.save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
