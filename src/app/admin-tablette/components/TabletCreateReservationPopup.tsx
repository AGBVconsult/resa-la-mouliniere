"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { X, Loader2, Plus, Minus, Check, Calendar } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { SimpleDatePicker } from "./SimpleDatePicker";

interface Props {
  defaultDateKey: string;
  defaultService: "lunch" | "dinner";
  onClose: () => void;
  onSuccess?: () => void;
}

const LANGUAGES = [
  { value: "fr", label: "FR" }, { value: "nl", label: "NL" },
  { value: "en", label: "EN" }, { value: "de", label: "DE" }, { value: "it", label: "IT" },
] as const;
type LanguageValue = (typeof LANGUAGES)[number]["value"];

const SOURCES = [
  { value: "walkin", label: "Walk-in" },
  { value: "phone", label: "Téléphone" },
  { value: "admin", label: "Admin" },
] as const;
type SourceValue = (typeof SOURCES)[number]["value"];

const TIME_SLOTS_LUNCH = ["12:00","12:15","12:30","12:45","13:00","13:15","13:30","13:45","14:00"];
const TIME_SLOTS_DINNER = ["18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"];

const OPTIONS = [
  { id: "highChair", label: "Chaise haute" },
  { id: "wheelchair", label: "PMR" },
  { id: "stroller", label: "Poussette" },
  { id: "dogAccess", label: "Chien" },
];

export function TabletCreateReservationPopup({ defaultDateKey, defaultService, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const createQuick = useMutation(api.admin.createReservationQuick);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateKey, setDateKey] = useState(defaultDateKey);
  const [service, setService] = useState<"lunch" | "dinner">(defaultService);
  const [timeKey, setTimeKey] = useState(defaultService === "lunch" ? "12:00" : "19:00");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<LanguageValue>("fr");
  const [source, setSource] = useState<SourceValue>("walkin");
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
        language, source,
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
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(Math.max(min, value - 1))}
          className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center active:scale-95">
          <Minus size={18} />
        </button>
        <span className="w-8 text-center font-semibold text-lg">{value}</span>
        <button type="button" onClick={() => set(value + 1)}
          className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center active:scale-95">
          <Plus size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[640px] md:max-h-[92vh] bg-white rounded-2xl shadow-2xl z-[201] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#334156] text-white shrink-0">
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
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Date</label>
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-left flex items-center gap-2 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <Calendar size={16} className="text-slate-400 shrink-0" />
                {new Date(dateKey + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Service</label>
              <div className="flex gap-2">
                {(["lunch","dinner"] as const).map((s) => (
                  <button key={s} type="button"
                    onClick={() => { setService(s); setTimeKey(s === "lunch" ? "12:00" : "19:00"); }}
                    className={cn("flex-1 py-3 rounded-xl text-sm font-medium",
                      service === s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                    {s === "lunch" ? "Midi" : "Soir"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Heure */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Heure</label>
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((t) => (
                <button key={t} type="button" onClick={() => setTimeKey(t)}
                  className={cn("px-4 py-2.5 rounded-lg text-sm font-medium",
                    timeKey === t ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Couverts */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
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
              className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input type="tel" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input type="email" placeholder="Email (déclenche la confirmation)" value={email} onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          {/* Langue & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Langue</label>
              <div className="flex gap-1.5">
                {LANGUAGES.map((l) => (
                  <button key={l.value} type="button" onClick={() => setLanguage(l.value)}
                    className={cn("flex-1 py-2.5 rounded-lg text-xs font-bold",
                      language === l.value ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Source</label>
              <div className="flex gap-1.5">
                {SOURCES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setSource(s.value)}
                    className={cn("flex-1 py-2.5 rounded-lg text-xs font-medium",
                      source === s.value ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Options</label>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((o) => (
                <button key={o.id} type="button" onClick={() => toggleOption(o.id)}
                  className={cn("px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5",
                    options.includes(o.id) ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                  {options.includes(o.id) && <Check size={14} />}
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Allergies, demandes spéciales…"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button onClick={onClose} disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 disabled:opacity-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold flex items-center justify-center disabled:opacity-50">
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
