"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Loader2,
  Minus,
  Plus,
  Phone,
  User,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ManualReservationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultService?: "lunch" | "dinner";
}

type Source = "phone" | "walkin" | "admin";

export function ManualReservationForm({
  open,
  onOpenChange,
  defaultDate,
  defaultService = "lunch",
}: ManualReservationFormProps) {
  const today = new Date();

  // Form state
  const [date, setDate] = useState<Date>(
    defaultDate ? new Date(defaultDate) : today
  );
  const [service, setService] = useState<"lunch" | "dinner">(defaultService);
  const [timeKey, setTimeKey] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<Source>("phone");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dateKey = format(date, "yyyy-MM-dd");
  const partySize = adults + children + babies;

  // Fetch availability
  const availability = useQuery(api.availability.getDay, {
    dateKey,
    partySize,
  });

  const createReservation = useMutation(api.admin.createReservation);

  // Get available slots for selected service
  const availableSlots = availability
    ? service === "lunch"
      ? availability.lunch
      : availability.dinner
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!timeKey || !firstName || !lastName || !phone) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createReservation({
        dateKey,
        service,
        timeKey,
        adults,
        childrenCount: children,
        babyCount: babies,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        note: note.trim() || undefined,
        source,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setTimeKey("");
    setAdults(2);
    setChildren(0);
    setBabies(0);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setNote("");
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nouvelle reservation</SheetTitle>
        </SheetHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="mt-4 text-lg font-semibold">Reservation creee</h3>
            <p className="mt-2 text-muted-foreground">
              {firstName} {lastName} - {format(date, "d MMMM", { locale: fr })} a {timeKey}
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Nouvelle reservation
              </Button>
              <Button onClick={handleClose}>Fermer</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Source */}
            <div className="space-y-2">
              <Label>Source</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={source === "phone" ? "default" : "outline"}
                  onClick={() => setSource("phone")}
                  className="min-h-[44px]"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Telephone
                </Button>
                <Button
                  type="button"
                  variant={source === "walkin" ? "default" : "outline"}
                  onClick={() => setSource("walkin")}
                  className="min-h-[44px]"
                >
                  <User className="mr-2 h-4 w-4" />
                  Walk-in
                </Button>
                <Button
                  type="button"
                  variant={source === "admin" ? "default" : "outline"}
                  onClick={() => setSource("admin")}
                  className="min-h-[44px]"
                >
                  Admin
                </Button>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-h-[44px] w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Service */}
            <div className="space-y-2">
              <Label>Service</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={service === "lunch" ? "default" : "outline"}
                  onClick={() => {
                    setService("lunch");
                    setTimeKey("");
                  }}
                  className="min-h-[44px]"
                >
                  Dejeuner
                </Button>
                <Button
                  type="button"
                  variant={service === "dinner" ? "default" : "outline"}
                  onClick={() => {
                    setService("dinner");
                    setTimeKey("");
                  }}
                  className="min-h-[44px]"
                >
                  Diner
                </Button>
              </div>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>Heure</Label>
              {availability === undefined ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun creneau disponible
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.timeKey}
                      type="button"
                      variant={timeKey === slot.timeKey ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeKey(slot.timeKey)}
                      disabled={!slot.isOpen || slot.remainingCapacity < partySize}
                      className="min-h-[44px]"
                    >
                      {slot.timeKey}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Party size */}
            <div className="space-y-4">
              <Label>Couverts ({partySize})</Label>

              <div className="flex items-center justify-between">
                <span>Adultes</span>
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
                    onClick={() => setAdults(adults + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Enfants (2-12)</span>
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
                    onClick={() => setChildren(children + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Bebes (0-2)</span>
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
                    onClick={() => setBabies(babies + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <Label>Contact</Label>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Prenom *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="min-h-[44px]"
                  required
                />
                <Input
                  placeholder="Nom *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="min-h-[44px]"
                  required
                />
              </div>

              <Input
                type="tel"
                placeholder="Telephone *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-h-[44px]"
                required
              />

              <Input
                type="email"
                placeholder="Email (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Note (optionnel)</Label>
              <Textarea
                placeholder="Allergies, occasion speciale..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="min-h-[44px] w-full"
              disabled={isLoading || !timeKey}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Creer la reservation
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
