/**
 * Default settings for the restaurant.
 * PRD-012: Réglages Généraux
 */

export const DEFAULT_SETTINGS = {
  key: "global" as const,

  // Restaurant
  restaurantName: "La Moulinière",
  address: "Visserskaai 17, 8400 Oostende",
  phone: "",
  email: "info@lamouliniere.be",
  timezone: "Europe/Brussels",

  // Langues
  widgetLanguages: ["nl", "fr", "en", "de", "it"] as string[],
  widgetDefaultLanguage: "nl",
  adminLanguage: "fr",

  // Réservations
  defaultSlotCapacity: 8,
  defaultReservationDurationMinutes: 90,
  minBookingDelayMinutes: 5,
  maxBookingAdvanceMonths: 2,
  pendingThreshold: 4,
  largeGroupThreshold: 6,
  contactUsThreshold: 15,

  // CRM
  vipThreshold: 10,
  regularThreshold: 3,
  badGuestThreshold: 2,
  dataRetentionYears: 5,

  // No-Show
  noShowDelayMinutes: 45,
  noShowAlertThreshold: 2,

  // Emails
  senderEmail: "noreply@lamouliniere.be",
  senderName: "La Moulinière",
  reminderTimeMidi: "10:00",
  reminderTimeSoir: "16:00",
  reviewSendTime: "06:00",
  reviewDelayDays: 1,
  adminNotificationEmail: "info@lamouliniere.be",

  // Notifications
  notifications: {
    emailConfirmation: true,
    emailReminder: true,
    emailReview: true,
    emailCancellation: true,
    emailPending: true,
    adminNewReservation: true,
    adminModification: true,
    adminCancellation: true,
    adminNoShow: true,
    adminRecidiviste: true,
  },
} as const;

export type DefaultSettings = typeof DEFAULT_SETTINGS;
