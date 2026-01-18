/**
 * Validation schemas for settings.
 * PRD-012: Réglages Généraux
 */

import { z } from "zod";

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const PHONE_REGEX = /^(\+\d{1,3}[\s.-]?)?(\d[\s.-]?){9,15}$|^$/;

const timeSchema = z.string().regex(TIME_REGEX, "Format HH:MM invalide");
const phoneSchema = z.string().regex(PHONE_REGEX, "Format téléphone invalide").default("");

export const notificationsSchema = z.object({
  emailConfirmation: z.boolean(),
  emailReminder: z.boolean(),
  emailReview: z.boolean(),
  emailCancellation: z.boolean(),
  emailPending: z.boolean(),
  adminNewReservation: z.boolean(),
  adminModification: z.boolean(),
  adminCancellation: z.boolean(),
  adminNoShow: z.boolean(),
  adminRecidiviste: z.boolean(),
});

export const settingsSchema = z
  .object({
    key: z.literal("global"),

    // Restaurant
    restaurantName: z.string().min(2).max(100),
    address: z.string().min(5).max(200),
    phone: phoneSchema,
    email: z.string().email(),
    timezone: z.string().min(1),

    // Langues
    widgetLanguages: z.array(z.enum(["nl", "fr", "en", "de", "it"])).min(1),
    widgetDefaultLanguage: z.enum(["nl", "fr", "en", "de", "it"]),
    adminLanguage: z.literal("fr"),

    // Réservations
    defaultSlotCapacity: z.number().int().min(1).max(100),
    defaultReservationDurationMinutes: z.number().int().min(30).max(240),
    minBookingDelayMinutes: z.number().int().min(0).max(1440),
    maxBookingAdvanceMonths: z.number().int().min(1).max(12),
    pendingThreshold: z.number().int().min(1).max(50),
    largeGroupThreshold: z.number().int().min(2).max(50),
    contactUsThreshold: z.number().int().min(5).max(100),

    // CRM
    vipThreshold: z.number().int().min(1).max(100),
    regularThreshold: z.number().int().min(1).max(50),
    badGuestThreshold: z.number().int().min(1).max(10),
    dataRetentionYears: z.number().int().min(1).max(10),

    // No-Show
    noShowDelayMinutes: z.number().int().min(15).max(120),
    noShowAlertThreshold: z.number().int().min(1).max(10),

    // Emails
    senderEmail: z.string().email(),
    senderName: z.string().min(2).max(50),
    reminderTimeMidi: timeSchema,
    reminderTimeSoir: timeSchema,
    reviewSendTime: timeSchema,
    reviewDelayDays: z.number().int().min(0).max(7),
    adminNotificationEmail: z.string().email(),

    // Notifications
    notifications: notificationsSchema,
  })
  .refine((data) => data.pendingThreshold < data.largeGroupThreshold, {
    message: "pendingThreshold doit être < largeGroupThreshold",
    path: ["pendingThreshold"],
  })
  .refine((data) => data.largeGroupThreshold <= data.contactUsThreshold, {
    message: "largeGroupThreshold doit être ≤ contactUsThreshold",
    path: ["largeGroupThreshold"],
  });

// Base schema without refinements for partial updates
const settingsBaseSchema = z.object({
  // Restaurant
  restaurantName: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  phone: phoneSchema,
  email: z.string().email(),
  timezone: z.string().min(1),

  // Langues
  widgetLanguages: z.array(z.enum(["nl", "fr", "en", "de", "it"])).min(1),
  widgetDefaultLanguage: z.enum(["nl", "fr", "en", "de", "it"]),
  adminLanguage: z.literal("fr"),

  // Réservations
  defaultSlotCapacity: z.number().int().min(1).max(100),
  defaultReservationDurationMinutes: z.number().int().min(30).max(240),
  minBookingDelayMinutes: z.number().int().min(0).max(1440),
  maxBookingAdvanceMonths: z.number().int().min(1).max(12),
  pendingThreshold: z.number().int().min(1).max(50),
  largeGroupThreshold: z.number().int().min(2).max(50),
  contactUsThreshold: z.number().int().min(5).max(100),

  // CRM
  vipThreshold: z.number().int().min(1).max(100),
  regularThreshold: z.number().int().min(1).max(50),
  badGuestThreshold: z.number().int().min(1).max(10),
  dataRetentionYears: z.number().int().min(1).max(10),

  // No-Show
  noShowDelayMinutes: z.number().int().min(15).max(120),
  noShowAlertThreshold: z.number().int().min(1).max(10),

  // Emails
  senderEmail: z.string().email(),
  senderName: z.string().min(2).max(50),
  reminderTimeMidi: timeSchema,
  reminderTimeSoir: timeSchema,
  reviewSendTime: timeSchema,
  reviewDelayDays: z.number().int().min(0).max(7),
  adminNotificationEmail: z.string().email(),

  // Notifications
  notifications: notificationsSchema,
});

export const settingsUpdateSchema = settingsBaseSchema.partial();

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type Notifications = z.infer<typeof notificationsSchema>;
