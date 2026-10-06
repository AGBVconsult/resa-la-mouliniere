"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { X, Loader2, Plus, Minus, Check, Calendar } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { SimpleDatePicker } from "./SimpleDatePicker";

const LANGUAGES = [
  { value: "be", label: "BE" }, { value: "nl", label: "NL" },
  { value: "fr", label: "FR" }, { value: "en", label: "EN" },
  { value: "de", label: "DE" }, { value: "it", label: "IT" },
] as const;
type LanguageValue = (typeof LANGUAGES)[number]["value"];

export interface ReservationPrefill {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  language?: LanguageValue;
}

interface Props {
  defaultDateKey: string;
  defaultService: "lunch" | "dinner";
  prefill?: ReservationPrefill;
  onClose: () => void;
  onSuccess?: () => void;
}

const TIME_SLOTS_LUNCH = ["12:00","12:15","12:30","12:45","13:00","13:15","13:30","13:45","14:00"];
const TIME_SLOTS_DINNER = ["18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"];

const OPTIONS = [
  { id: "highChair", label: "Chaise haute" },
  { id: "wheelchair", label: "PMR" },
  { id: "stroller", label: "Poussette" },
  { id: "dogAccess", label: "Chien" },
];

export function TabletCreateReservationPopup({ defaultDateKey, defaultService, prefill, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const createQuick = useMutation(api.admin.createReservationQuick);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateKey, setDateKey] = useState(defaultDateKey);
  const [service, setService] = useState<"lunch" | "dinner">(defaultService);
  const [timeKey, setTimeKey] = useState(defaultService === "lunch" ? "12:00" : "19:00");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [firstName, setFirstName] = useState(prefill?.firstName ?? "");
  const [lastName, setLastName] = useState(prefill?.lastName ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [language, setLanguage] = useState<LanguageValue>(prefill?.language ?? "be");
  const [note, setNote] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  const timeSlots = service === "lunch" ? TIME_SLOTS_LUNCH : TIME_SLOTS_DINNER;
  const partySize = adults + children + babies;

  const toggleOption = (id: string) =>
    setOptions((prev) => prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createQuick({
        dateKey, service, timeKey,
        adults, childrenCount: children, babyCount: babies,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        language, source: "walkin",
        note: note.trim() || undefined,
        options: options.length ? options : undefined,
      });
      toast.success("Réservation créée");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(formatConvexError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const Stepper = ({ label, value, set, min }: { label: string; value: number; set: (n: number) => void; min: number }) => (
    <div>
      <label className="block text-xs text-[#7E97AC] mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(Math.max(min, value - 1))}
          className="w-11 h-11 rounded-full bg-[#EDF1F4] text-[#3E5A70] hover:bg-[#E2E8ED] flex items-center justify-center active:scale-95">
          <Minus size={18} />
        </button>
        <span className="w-8 text-center font-semibold text-lg text-[#2A3540]">{value}</span>
        <button type="button" onClick={() => set(value + 1)}
          className="w-11 h-11 rounded-full bg-[#EDF1F4] text-[#3E5A70] hover:bg-[#E2E8ED] flex items-center justify-center active:scale-95">
          <Plus size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-[2px] bg-[#1E2A35]/40 z-[200]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[640px] md:max-h-[92vh] bg-white rounded-2xl shadow-2xl z-[201] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#4F6D84] text-white shrink-0">
          <h2 className="text-lg font-bold">Nouvelle réservation</h2>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date & Service */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4F6D84] uppercase tracking-wider mb-2">Date</label>
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                className="w-full px-4 py-3 border border-[#D3DBE1] rounded-full text-sm text-[#2A3540] text-left flex items-center gap-2 hover:bg-[#F4F6F8] active:scale-[0.98] transition-all"
              >
                <Calendar size={16} className="text-[#7E97AC] shrink-0" />
                {new Date(dateKey + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4F6D84] uppercase tracking-wider mb-2">Service</label>
              <div className="flex gap-2">
                {(["lunch","dinner"] as const).map((s) => (
                  <button key={s} type="button"
                    onClick={() => { setService(s); setTimeKey(s === "lunch" ? "12:00" : "19:00"); }}
                    className={cn("flex-1 py-3 rounded-full text-sm font-medium",
                      service === s ? "bg-[#4F6D84] text-white" : "bg-[#EDF1F4] text-[#4A5A68] hover:bg-[#E2E8ED]")}>
                    {s === "lunch" ? "Midi" : "Soir"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Heure */}
          <div>
            <label className="block text-xs font-semibold text-[#4F6D84] uppercase tracking-wider mb-2">Heure</label>
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((t) => (
                <button key={t} type="button" onClick={() => setTimeKey(t)}
                  className={cn("px-4 py-2.5 rounded-full text-sm font-medium",
                    timeKey === t ? "bg-[#4F6D84] text-white" : "bg-[#EDF1F4] text-[#4A5A68] hover:bg-[#E2E8ED]")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Couverts */}
          <div>
            <label className="block text-xs font-semibold text-[#4F6D84] uppercase tracking-wider mb-2">
              Couverts ({partySize})
            </label>
            <div className="grid grid-cols-3 gap-4">
              <Stepper label="Adultes" value={adults} set={setAdults} min={1} />
              <Stepper label="Enfants" value={children} set={setChildren} min={0} />
              <Stepper label="Bébés" value={babies} set={setBabies} min={0} />
            </div>
          </div>

          {/* Contact (tous optionnels) */}
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="px-4 py-3 border border-[#D3DBE1] rounded-xl text-sm text-[#2A3540] placeholder:text-[#9FB0BE] focus:outline-none focus:ring-2 focus:ring-[#4F6D84]" />
            <input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="px-4 py-3 border border-[#D3DBE1] rounded-xl text-sm text-[#2A3540] placeholder:text-[#9FB0BE] focus:outline-none focus:ring-2 focus:ring-[#4F6D84]" />
            <input type="tel" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="px-4 py-3 border border-[#D3DBE1] rounded-xl text-sm text-[#2A3540] placeholder:text-[#9FB0BE] focus:outline-none focus:ring-2 focus:ring-[#4F6D84]" />
            <input type="email" placeholder="Email (déclenche la confirmation)" value={email} onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 border border-[#D3DBE1] rounded-xl text-sm text-[#2A3540] placeholder:text-[#9FB0BE] focus:outline-none focus:ring-2 focus:ring-[#4F6D84]" />
          </div>

          {/* Langue */}
          <div>
            <label className="block text-xs font-semibold text-[#4F6D84] uppercase tracking-wider mb-2">Langue</label>
            <div className="flex gap-1.5">
              {LANGUAGES.map((l) => (
                <button key={l.value} type="button" onClick={() => setLanguage(l.value)}
                  className={cn("flex-1 py-2.5 rounded-full text-xs font-bold",
                    language === l.value ? "bg-[#4F6D84] text-white" : "bg-[#EDF1F4] text-[#5B6B7A] hover:bg-[#E2E8ED]")}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-semibold text-[#4F6D84] uppercase tracking-wider mb-2">Options</label>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((o) => (
                <button key={o.id} type="button" onClick={() => toggleOption(o.id)}
                  className={cn("px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-1.5",
                    options.includes(o.id) ? "bg-[#4F6D84] text-white" : "bg-[#EDF1F4] text-[#4A5A68] hover:bg-[#E2E8ED]")}>
                  {options.includes(o.id) && <Check size={14} />}
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-[#4F6D84] uppercase tracking-wider mb-2">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Allergies, demandes spéciales…"
              className="w-full px-4 py-3 border border-[#D3DBE1] rounded-xl text-sm text-[#2A3540] placeholder:text-[#9FB0BE] focus:outline-none focus:ring-2 focus:ring-[#4F6D84] resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#E1E7EC] bg-[#F4F6F8] shrink-0">
          <button onClick={onClose} disabled={isSubmitting}
            className="flex-1 py-3 rounded-full border border-[#D3DBE1] bg-white text-[#4A5A68] font-medium hover:bg-[#E9EEF2] disabled:opacity-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="flex-1 py-3 rounded-full bg-[#4F6D84] hover:bg-[#3E5A70] text-white font-semibold flex items-center justify-center disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer la réservation"}
          </button>
        </div>
      </div>
      <SimpleDatePicker
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelectDate={(dk) => setDateKey(dk)}
        selectedDateKey={dateKey}
      />
    </>
  );
}
