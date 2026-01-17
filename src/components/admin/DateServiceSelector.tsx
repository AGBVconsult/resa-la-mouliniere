"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DateServiceSelectorProps {
  dateKey: string;
  service: "lunch" | "dinner";
  lunchCount?: number;
  dinnerCount?: number;
}

export function DateServiceSelector({
  dateKey,
  service,
  lunchCount = 0,
  dinnerCount = 0,
}: DateServiceSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDate = new Date(dateKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = dateKey === format(today, "yyyy-MM-dd");
  const isTomorrow = dateKey === format(addDays(today, 1), "yyyy-MM-dd");

  const updateParams = (newDate?: string, newService?: "lunch" | "dinner") => {
    const params = new URLSearchParams(searchParams.toString());
    if (newDate) params.set("date", newDate);
    if (newService) params.set("service", newService);
    router.push(`/admin/service?${params.toString()}`);
  };

  const goToPreviousDay = () => {
    const prevDay = format(subDays(currentDate, 1), "yyyy-MM-dd");
    updateParams(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = format(addDays(currentDate, 1), "yyyy-MM-dd");
    updateParams(nextDay);
  };

  const goToToday = () => {
    updateParams(format(today, "yyyy-MM-dd"));
  };

  const goToTomorrow = () => {
    updateParams(format(addDays(today, 1), "yyyy-MM-dd"));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      updateParams(format(date, "yyyy-MM-dd"));
    }
  };

  const handleServiceChange = (newService: "lunch" | "dinner") => {
    updateParams(undefined, newService);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousDay}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-h-[44px] min-w-[200px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(currentDate, "EEEE d MMMM", { locale: fr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={handleDateSelect}
              initialFocus
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNextDay}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Quick navigation buttons */}
        <div className="hidden gap-2 sm:flex">
          <Button
            variant={isToday ? "default" : "outline"}
            onClick={goToToday}
            className="min-h-[44px]"
          >
            Aujourd hui
          </Button>
          <Button
            variant={isTomorrow ? "default" : "outline"}
            onClick={goToTomorrow}
            className="min-h-[44px]"
          >
            Demain
          </Button>
        </div>
      </div>

      {/* Service toggle */}
      <div className="flex rounded-lg border bg-muted p-1">
        <Button
          variant={service === "lunch" ? "default" : "ghost"}
          onClick={() => handleServiceChange("lunch")}
          className={cn(
            "min-h-[44px] flex-1 gap-2",
            service === "lunch" && "shadow-sm"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Dejeuner</span>
          {lunchCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
              {lunchCount}
            </span>
          )}
        </Button>
        <Button
          variant={service === "dinner" ? "default" : "ghost"}
          onClick={() => handleServiceChange("dinner")}
          className={cn(
            "min-h-[44px] flex-1 gap-2",
            service === "dinner" && "shadow-sm"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Diner</span>
          {dinnerCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
              {dinnerCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
