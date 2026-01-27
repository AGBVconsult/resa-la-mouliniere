export type Language = "fr" | "nl" | "en" | "de" | "it";

// Backend utilise "lunch" | "dinner" - on garde ce format
export type Service = "lunch" | "dinner";

export interface GuestCounts {
  adults: number;
  childrenCount: number;  // Naming backend
  babyCount: number;      // Naming backend
}

export interface ContactDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export interface BookingOptions {
  requiresHighChair: boolean;
  requiresStroller: boolean;
  requiresDogAccess: boolean;
  requiresWheelchair: boolean;
}

export interface DayStatus {
  lunch: "available" | "unavailable" | "full" | "closed";
  dinner: "available" | "unavailable" | "full" | "closed";
  disabled: boolean;
}

// State complet du widget
export interface BookingState {
  // Step 1
  adults: number;
  childrenCount: number;
  babyCount: number;
  requiresHighChair: boolean;
  requiresStroller: boolean;
  requiresDogAccess: boolean;
  requiresWheelchair: boolean;
  // Step 2
  dateKey: string | null;
  service: Service | null;
  timeKey: string | null;
  // Step 3
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export const initialBookingState: BookingState = {
  adults: 2,
  childrenCount: 0,
  babyCount: 0,
  requiresHighChair: false,
  requiresStroller: false,
  requiresDogAccess: false,
  requiresWheelchair: false,
  dateKey: null,
  service: null,
  timeKey: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

// Types backend (CONTRACTS.md)
export interface DayState {
  dateKey: string;
  lunch: { isOpen: boolean };
  dinner: { isOpen: boolean };
}

export interface Slot {
  slotKey: string;
  dateKey: string;
  service: "lunch" | "dinner";
  timeKey: string;
  isOpen: boolean;
  capacity: number;
  remainingCapacity: number;
  maxGroupSize: number | null;
}

export interface ReservationResult {
  kind: "reservation" | "groupRequest";
  reservationId?: string;
  groupRequestId?: string;
  status?: string;
  manageUrlPath?: string;
}
