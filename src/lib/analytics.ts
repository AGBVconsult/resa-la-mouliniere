/**
 * Analytics module for booking widget funnel tracking
 * 13 P0 events for complete funnel visibility
 *
 * Double-write: GA4/GTM (existing) + Convex funnelEvents (new).
 * The Convex write uses a dedicated ConvexHttpClient (isolated transport).
 * The entire trackEvent body is wrapped in try/catch: analytics must never
 * crash the booking flow.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { getSessionContext } from "./session-context";

// Derive step from eventName for consistent funnelEvents.step population
const EVENT_TO_STEP: Record<string, string> = {
  booking_step_view: '', // uses step_name from params
  booking_guests_selected: 'step1_guests',
  booking_baby_seating_selected: 'step1b_baby',
  booking_date_selected: 'step2_datetime',
  booking_time_slot_selected: 'step2_datetime',
  booking_no_slots_available: 'step2_datetime',
  availability_rendered: 'step2_datetime',
  booking_contact_form_error: 'step3_contact',
  booking_policy_viewed: 'step4_practical',
  booking_submitted: 'step5_confirm',
  booking_error: 'step5_confirm',
  booking_completed: 'step6_confirmation',
};

// booking_step_view porte son étape dans params.step_name, avec un vocabulaire
// ("guests", "date_time") différent de celui d'EVENT_TO_STEP ("step1_guests",
// "step2_datetime"). Sans normalisation, une même étape apparaît sous deux noms
// et tout regroupement par `step` scinde le funnel en double. On canonicalise ici
// pour funnelEvents uniquement — les paramètres envoyés à GA4 restent inchangés.
const STEP_NAME_TO_CANONICAL: Record<string, string> = {
  guests: 'step1_guests',
  baby_seating: 'step1b_baby',
  date_time: 'step2_datetime',
  contact: 'step3_contact',
  practical_info: 'step4_practical',
  summary_confirm: 'step5_confirm',
  confirmation: 'step6_confirmation',
};

/**
 * Étape canonique d'un événement, pour la colonne `step` de funnelEvents.
 */
function resolveStep(eventName: string, params?: AnalyticsEventParams): string | undefined {
  const mapped = EVENT_TO_STEP[eventName];
  if (mapped) return mapped;
  const stepName = (params as Record<string, unknown> | undefined)?.step_name as string | undefined;
  if (!stepName) return undefined;
  return STEP_NAME_TO_CANONICAL[stepName] ?? stepName;
}

// Client-side kill-switch gate — mirrors settings.funnelAnalyticsEnabled
// Three states: 'pending' (settings not yet loaded), 'enabled', 'disabled'
let _funnelAnalyticsState: 'pending' | 'enabled' | 'disabled' = 'pending';

// Buffer for events emitted before settings resolve (e.g. booking_step_view at mount)
type BufferedEvent = { eventName: string; params?: AnalyticsEventParams; language?: string };
let _eventBuffer: BufferedEvent[] = [];
const MAX_BUFFER_SIZE = 50;

/**
 * Set by Widget.tsx when settings load. Controls whether Convex double-write fires.
 * When false: zero network requests to Convex for analytics.
 * On first call with true: flushes buffered events.
 */
export function setFunnelAnalyticsEnabled(enabled: boolean): void {
  _funnelAnalyticsState = enabled ? 'enabled' : 'disabled';
  if (enabled && _eventBuffer.length > 0) {
    const buffered = _eventBuffer;
    _eventBuffer = [];
    for (const evt of buffered) {
      _sendToConvex(evt.eventName, evt.params, evt.language);
    }
  } else {
    _eventBuffer = [];
  }
}

// Dedicated HTTP client for analytics (isolated from the reactive websocket)
let _analyticsClient: ConvexHttpClient | null = null;
function getAnalyticsClient(): ConvexHttpClient | null {
  if (_analyticsClient) return _analyticsClient;
  try {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) return null;
    _analyticsClient = new ConvexHttpClient(url);
    return _analyticsClient;
  } catch {
    return null;
  }
}

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
  BOOKING_COMPLETED: 'booking_completed',
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
 * Core tracking function - sends to GA4 via gtag or GTM dataLayer + Convex funnelEvents
 */
export function trackEvent(eventName: string, params?: AnalyticsEventParams, language?: string): void {
  try {
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

    // Double-write to Convex funnelEvents (fire-and-forget, isolated transport)
    if (_funnelAnalyticsState === 'disabled') return;
    if (_funnelAnalyticsState === 'pending') {
      // Buffer until settings resolve
      if (_eventBuffer.length < MAX_BUFFER_SIZE) {
        _eventBuffer.push({ eventName, params, language });
      }
      return;
    }
    // State is 'enabled' — send immediately
    _sendToConvex(eventName, params, language);
  } catch {
    // Analytics must never crash the booking flow
  }
}

/**
 * Internal: send a single event to Convex funnelEvents. Assumes flag is enabled.
 */
function _sendToConvex(eventName: string, params?: AnalyticsEventParams, language?: string): void {
  try {
    const ctx = getSessionContext();
    if (!ctx) return;
    const client = getAnalyticsClient();
    if (!client) return;

    const enrichedParams = {
      ...params,
      widget_version: '1.0.0',
      language: language || 'fr',
    };
    // Strip metadata — keep only domain-specific props
    const { widget_version, language: _lang, ...safeProps } = enrichedParams;
    client.mutation(api.funnelEvents.record, {
      sessionId: ctx.sessionId,
      eventName,
      step: resolveStep(eventName, params),
      device: ctx.device,
      language: ctx.language,
      referralSource: ctx.referralSource,
      isReturning: ctx.isReturning,
      props: Object.keys(safeProps).length > 0 ? safeProps : undefined,
    }).catch(() => {}); // Swallow errors — analytics must never fail
  } catch {
    // Silent
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
  trackEvent(AnalyticsEvents.BOOKING_COMPLETED, {
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
