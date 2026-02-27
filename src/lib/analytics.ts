/**
 * Analytics module for booking widget funnel tracking
 * 13 P0 events for complete funnel visibility
 */

// Types for event parameters
interface BaseEventParams {
  widget_version?: string;
  language?: string;
}

interface StepViewParams extends BaseEventParams {
  step_number: number;
  step_name: string;
}

interface GuestsSelectedParams extends BaseEventParams {
  adults: number;
  children: number;
  babies: number;
  total_guests: number;
  has_options: boolean;
  options?: string[];
}

interface BabySeatingParams extends BaseEventParams {
  seating_choice: 'lap' | 'highchair';
}

interface DateSelectedParams extends BaseEventParams {
  date: string;
  days_in_advance: number;
}

interface TimeSlotSelectedParams extends BaseEventParams {
  date: string;
  time: string;
  service: 'lunch' | 'dinner';
  total_guests: number;
}

interface NoSlotsAvailableParams extends BaseEventParams {
  date: string;
  total_guests: number;
}

interface ContactFormErrorParams extends BaseEventParams {
  field: string;
  error_type: string;
}

interface BookingSubmittedParams extends BaseEventParams {
  date: string;
  time: string;
  service: 'lunch' | 'dinner';
  total_guests: number;
  adults: number;
  children: number;
  babies: number;
  has_options: boolean;
  options?: string[];
}

interface BookingErrorParams extends BaseEventParams {
  error_code: string;
  error_message: string;
  is_retryable: boolean;
}

interface BookingConfirmedParams extends BaseEventParams {
  reservation_id?: string;
  status: 'confirmed' | 'pending' | 'group_request';
  date: string;
  time: string;
  service: 'lunch' | 'dinner';
  total_guests: number;
}

// Union type for all event parameters
type AnalyticsEventParams =
  | StepViewParams
  | GuestsSelectedParams
  | BabySeatingParams
  | DateSelectedParams
  | TimeSlotSelectedParams
  | NoSlotsAvailableParams
  | ContactFormErrorParams
  | BookingSubmittedParams
  | BookingErrorParams
  | BookingConfirmedParams
  | BaseEventParams;

// Event names enum for type safety
export const AnalyticsEvents = {
  // Step views (P0 - funnel visibility)
  STEP_VIEW: 'booking_step_view',
  
  // Step 1 - Guests
  GUESTS_SELECTED: 'booking_guests_selected',
  
  // Step 1B - Baby
  BABY_SEATING_SELECTED: 'booking_baby_seating_selected',
  
  // Step 2 - Date/Time
  DATE_SELECTED: 'booking_date_selected',
  TIME_SLOT_SELECTED: 'booking_time_slot_selected',
  NO_SLOTS_AVAILABLE: 'booking_no_slots_available',
  
  // Step 3 - Contact
  CONTACT_FORM_ERROR: 'booking_contact_form_error',
  
  // Step 4 - Policy (info read)
  POLICY_VIEWED: 'booking_policy_viewed',
  
  // Step 5 - Submit
  BOOKING_SUBMITTED: 'booking_submitted',
  BOOKING_ERROR: 'booking_error',
  
  // Step 6 - Confirmation
  BOOKING_CONFIRMED: 'booking_confirmed',
} as const;

// Check if gtag is available
function isGtagAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

// Check if dataLayer is available (GTM)
function isDataLayerAvailable(): boolean {
  return typeof window !== 'undefined' && Array.isArray(window.dataLayer);
}

/**
 * Core tracking function - sends to GA4 via gtag or GTM dataLayer
 */
export function trackEvent(eventName: string, params?: AnalyticsEventParams, language?: string): void {
  // Add widget version and language to all events
  const enrichedParams = {
    ...params,
    widget_version: '1.0.0',
    language: language || 'fr',
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventName}`, enrichedParams);
  }

  // Send to GA4 via gtag
  if (isGtagAvailable()) {
    window.gtag('event', eventName, enrichedParams);
  }

  // Send to GTM dataLayer
  if (isDataLayerAvailable()) {
    window.dataLayer.push({
      event: eventName,
      ...enrichedParams,
    });
  }
}

// ============================================
// P0 Event Helper Functions (13 events)
// ============================================

/**
 * Track step view - fires when user enters a step
 */
export function trackStepView(stepNumber: number, stepName: string, language: string): void {
  trackEvent(AnalyticsEvents.STEP_VIEW, {
    step_number: stepNumber,
    step_name: stepName,
  }, language);
}

/**
 * Track guests selection - fires when user proceeds from Step 1
 */
export function trackGuestsSelected(params: {
  adults: number;
  children: number;
  babies: number;
  options: string[];
  language: string;
}): void {
  trackEvent(AnalyticsEvents.GUESTS_SELECTED, {
    adults: params.adults,
    children: params.children,
    babies: params.babies,
    total_guests: params.adults + params.children + params.babies,
    has_options: params.options.length > 0,
    options: params.options.length > 0 ? params.options : undefined,
  }, params.language);
}

/**
 * Track baby seating choice - fires on Step 1B
 */
export function trackBabySeatingSelected(seating: 'lap' | 'highchair', language: string): void {
  trackEvent(AnalyticsEvents.BABY_SEATING_SELECTED, {
    seating_choice: seating,
  }, language);
}

/**
 * Track date selection - fires when user picks a date
 */
export function trackDateSelected(dateKey: string, language: string): void {
  const selectedDate = new Date(dateKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInAdvance = Math.floor((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  trackEvent(AnalyticsEvents.DATE_SELECTED, {
    date: dateKey,
    days_in_advance: daysInAdvance,
  }, language);
}

/**
 * Track time slot selection - fires when user picks a time
 */
export function trackTimeSlotSelected(params: {
  date: string;
  time: string;
  service: 'lunch' | 'dinner';
  totalGuests: number;
  language: string;
}): void {
  trackEvent(AnalyticsEvents.TIME_SLOT_SELECTED, {
    date: params.date,
    time: params.time,
    service: params.service,
    total_guests: params.totalGuests,
  }, params.language);
}

/**
 * Track no slots available - fires when date has no availability
 */
export function trackNoSlotsAvailable(dateKey: string, totalGuests: number, language: string): void {
  trackEvent(AnalyticsEvents.NO_SLOTS_AVAILABLE, {
    date: dateKey,
    total_guests: totalGuests,
  }, language);
}

/**
 * Track contact form validation error
 */
export function trackContactFormError(field: string, errorType: string, language: string): void {
  trackEvent(AnalyticsEvents.CONTACT_FORM_ERROR, {
    field,
    error_type: errorType,
  }, language);
}

/**
 * Track policy/practical info viewed
 */
export function trackPolicyViewed(language: string): void {
  trackEvent(AnalyticsEvents.POLICY_VIEWED, {}, language);
}

/**
 * Track booking submission attempt
 */
export function trackBookingSubmitted(params: {
  date: string;
  time: string;
  service: 'lunch' | 'dinner';
  adults: number;
  children: number;
  babies: number;
  options: string[];
  language: string;
}): void {
  trackEvent(AnalyticsEvents.BOOKING_SUBMITTED, {
    date: params.date,
    time: params.time,
    service: params.service,
    total_guests: params.adults + params.children + params.babies,
    adults: params.adults,
    children: params.children,
    babies: params.babies,
    has_options: params.options.length > 0,
    options: params.options.length > 0 ? params.options : undefined,
  }, params.language);
}

/**
 * Track booking error
 */
export function trackBookingError(errorCode: string, errorMessage: string, isRetryable: boolean, language: string): void {
  trackEvent(AnalyticsEvents.BOOKING_ERROR, {
    error_code: errorCode,
    error_message: errorMessage,
    is_retryable: isRetryable,
  }, language);
}

/**
 * Track booking confirmed/completed
 */
export function trackBookingConfirmed(params: {
  reservationId?: string;
  status: 'confirmed' | 'pending' | 'group_request';
  date: string;
  time: string;
  service: 'lunch' | 'dinner';
  totalGuests: number;
  language: string;
}): void {
  trackEvent(AnalyticsEvents.BOOKING_CONFIRMED, {
    reservation_id: params.reservationId,
    status: params.status,
    date: params.date,
    time: params.time,
    service: params.service,
    total_guests: params.totalGuests,
  }, params.language);
}

// Type declarations for global window object
declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void;
    dataLayer: Record<string, unknown>[];
  }
}
