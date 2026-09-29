"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Moon, Sun, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateNavigatorProps {
  date: Date;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenCalendar: () => void;
}

export function DateNavigator({ date, isToday, onPrev, onNext, onToday, onOpenCalendar }: DateNavigatorProps) {
  const weekday = format(date, "EEEE", { locale: fr });
  const dayMonth = format(date, "d MMMM", { locale: fr });

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-[52px] items-center rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(41,37,36,0.06),0_0_0_1px_rgba(41,37,36,0.06)]">
        <IconButton label="Jour précédent" onClick={onPrev}>
          <ChevronLeft size={20} strokeWidth={2} />
        </IconButton>
        <button
          type="button"
          onClick={onOpenCalendar}
          aria-label="Ouvrir le calendrier"
          className="flex h-full min-w-[9.5rem] flex-col items-center justify-center rounded-full px-3 transition-colors duration-150 hover:bg-stone-50 active:bg-stone-100"
        >
          <span className="text-[11px] font-semibold capitalize leading-none text-stone-500">
            {isToday ? "Aujourd'hui" : weekday}
          </span>
          <span className="mt-1 text-[15px] font-bold leading-none text-stone-900">{dayMonth}</span>
        </button>
        <IconButton label="Jour suivant" onClick={onNext}>
          <ChevronRight size={20} strokeWidth={2} />
        </IconButton>
      </div>
      {!isToday && (
        <motion.button
          type="button"
          onClick={onToday}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="h-10 rounded-full bg-[#334156] px-4 text-xs font-semibold text-white transition-transform duration-150 active:scale-[0.96]"
        >
          Aujourd&apos;hui
        </motion.button>
      )}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full text-stone-500 transition-[background-color,color,transform] duration-150 hover:bg-stone-100 hover:text-stone-900 active:scale-[0.94]"
    >
      {children}
    </button>
  );
}

export type ServiceTab = "total" | "lunch" | "dinner";

interface ServiceSwitchProps {
  value: ServiceTab;
  onChange: (value: ServiceTab) => void;
  stats: Record<ServiceTab, { covers: number; capacity: number }>;
}

const TABS: { id: ServiceTab; label: string; icon: typeof Sun; iconClass: string }[] = [
  { id: "lunch", label: "Midi", icon: Sun, iconClass: "text-amber-500" },
  { id: "dinner", label: "Soir", icon: Moon, iconClass: "text-indigo-400" },
  { id: "total", label: "Journée", icon: UsersRound, iconClass: "text-stone-400" },
];

export function ServiceSwitch({ value, onChange, stats }: ServiceSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="Service"
      className="flex h-[52px] items-center rounded-full bg-stone-200/60 p-1"
    >
      {TABS.map((tab) => {
        const active = value === tab.id;
        const { covers, capacity } = stats[tab.id];
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="relative flex h-full w-[8.5rem] items-center justify-center gap-2 rounded-full px-3 transition-transform duration-150 active:scale-[0.97]"
          >
            {active && (
              <motion.span
                layoutId="v2-service-indicator"
                transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(41,37,36,0.12)]"
              />
            )}
            <Icon size={15} strokeWidth={2} className={cn("relative", tab.iconClass)} />
            <span className={cn("relative text-[13px] font-semibold", active ? "text-stone-900" : "text-stone-500")}>
              {tab.label}
            </span>
            <span className="relative flex items-baseline tabular-nums">
              <span className={cn("text-base font-bold", active ? "text-stone-900" : "text-stone-600")}>{covers}</span>
              {capacity > 0 && <span className="text-[11px] text-stone-400">/{capacity}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
