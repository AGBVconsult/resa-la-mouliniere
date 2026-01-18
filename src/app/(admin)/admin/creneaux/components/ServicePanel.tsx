"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Doc } from "../../../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DaySelector } from "./DaySelector";
import { SlotList } from "./SlotList";
import { AddSlotDialog } from "./AddSlotDialog";
import { Clock, Sun, Moon } from "lucide-react";

interface ServicePanelProps {
  service: "lunch" | "dinner";
  title: string;
  templates: Doc<"weeklyTemplates">[];
}

export function ServicePanel({ service, title, templates }: ServicePanelProps) {
  const toggleDay = useMutation(api.weeklyTemplates.toggleDay);
  const syncSlots = useMutation(api.weeklyTemplates.syncSlotsWithTemplate);

  const openDays = templates.filter((t) => t.isOpen).map((t) => t.dayOfWeek);

  const allSlots = templates
    .filter((t) => t.isOpen)
    .flatMap((t) => t.slots)
    .filter((slot, index, self) => 
      index === self.findIndex((s) => s.timeKey === slot.timeKey)
    )
    .sort((a, b) => a.timeKey.localeCompare(b.timeKey));

  const handleToggleDay = async (dayOfWeek: number) => {
    const isCurrentlyOpen = openDays.includes(dayOfWeek);
    await toggleDay({
      dayOfWeek,
      service,
      isOpen: !isCurrentlyOpen,
    });
    // Sync slots with template changes
    await syncSlots({ dayOfWeek, service });
  };

  const ServiceIcon = service === "lunch" ? Sun : Moon;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ServiceIcon className="h-5 w-5 text-slate-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Jours d'ouverture</p>
          <DaySelector
            selectedDays={openDays}
            onToggleDay={handleToggleDay}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Créneaux horaires
            </p>
            <AddSlotDialog
              service={service}
              existingTimes={allSlots.map((s) => s.timeKey)}
            />
          </div>
          <SlotList
            service={service}
            slots={allSlots}
            openDays={openDays}
          />
        </div>
      </CardContent>
    </Card>
  );
}
