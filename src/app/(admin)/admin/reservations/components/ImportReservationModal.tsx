"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { X, Loader2, Plus, Minus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ImportReservationModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const LANGUAGES = [
  { value: "fr", label: "FR" },
  { value: "nl", label: "NL" },
  { value: "en", label: "EN" },
  { value: "de", label: "DE" },
  { value: "it", label: "IT" },
] as const;

type LanguageValue = (typeof LANGUAGES)[number]["value"];

const TIME_SLOTS_LUNCH = ["12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30"];
const TIME_SLOTS_DINNER = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

// Generate next 30 days for date selection
function generateDateOptions() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = addDays(today, i);
    dates.push({
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE d MMMM", { locale: fr }),
    });
  }
  return dates;
}

export function ImportReservationModal({
  onClose,
  onSuccess,
}: ImportReservationModalProps) {
  const importReservation = useMutation(api.admin.importReservation);
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [dateKey, setDateKey] = useState(format(new Date(), "yyyy-MM-dd"));
  const [service, setService] = useState<"lunch" | "dinner">("lunch");
  const [timeKey, setTimeKey] = useState("12:30");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<LanguageValue>("fr");
  const [note, setNote] = useState("");

  const dateOptions = generateDateOptions();
  const timeSlots = service === "lunch" ? TIME_SLOTS_LUNCH : TIME_SLOTS_DINNER;

  // Update timeKey when service changes
  const handleServiceChange = (newService: "lunch" | "dinner") => {
    setService(newService);
    setTimeKey(newService === "lunch" ? "12:30" : "19:00");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await importReservation({
        dateKey,
        service,
        timeKey,
        adults,
        childrenCount: children,
        babyCount: babies,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        language,
        note: note.trim() || undefined,
      });

      toast.success("Réservation importée (sans email)");
      
      // Reset form for next entry
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNote("");
      setAdults(2);
      setChildren(0);
      setBabies(0);
      
      onSuccess?.();
    } catch (err: unknown) {
      const message = formatConvexError(err, "Erreur lors de l'import");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const partySize = adults + children + babies;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-[650px] max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900">Import manuel</h2>
              <p className="text-xs text-amber-700">Migration - Aucun email envoyé</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-amber-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-amber-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Date & Service */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <select
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {dateOptions.map((date) => (
                  <option key={date.value} value={date.value}>
                    {date.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleServiceChange("lunch")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    service === "lunch"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  Déjeuner
                </button>
                <button
                  type="button"
                  onClick={() => handleServiceChange("dinner")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    service === "dinner"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  Dîner
                </button>
              </div>
            </div>
          </div>

          {/* Time slot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure
            </label>
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTimeKey(time)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    timeKey === time
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Party size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Couverts ({partySize} personnes)
            </label>
            <div className="grid grid-cols-3 gap-4">
              {/* Adults */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">Adultes</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-medium">{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults(adults + 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">Enfants</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-medium">{children}</span>
                  <button
                    type="button"
                    onClick={() => setChildren(children + 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Babies */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">Bébés</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBabies(Math.max(0, babies - 1))}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-medium">{babies}</span>
                  <button
                    type="button"
                    onClick={() => setBabies(babies + 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact info - simplified */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom *
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400">(optionnel)</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone <span className="text-gray-400">(optionnel)</span>
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+32 470 12 34 56"
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Langue
            </label>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setLanguage(lang.value)}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                    language === lang.value
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400">(optionnel)</span>
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Anniversaire, terrasse..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Fermer
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
