/**
 * Email templates for reservation notifications.
 * Pure functions, testable.
 * 
 * EmailJobType from schema: "reservation.confirmed" | "reservation.pending" | "reservation.validated" | 
 *                           "reservation.refused" | "reservation.cancelled" | "reservation.reminder" | "reservation.review"
 */

import { Errors } from "../errors";
import type { Language } from "../../../spec/contracts.generated";

export type EmailJobType =
  | "reservation.confirmed"
  | "reservation.pending"
  | "reservation.validated"
  | "reservation.refused"
  | "reservation.cancelled"
  | "reservation.reminder"
  | "reservation.review";

export interface TemplateData {
  firstName: string;
  lastName: string;
  dateKey: string;
  timeKey: string;
  service: "lunch" | "dinner";
  partySize: number;
  language?: "fr" | "nl" | "en" | "de" | "it";
  manageUrl?: string;
  editUrl?: string;
  cancelUrl?: string;
  cancelReason?: string;
  restaurantName?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Escape HTML special characters to prevent XSS.
 * Pure function, testable.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// NON-SPECIFIE: Locale fallback order is not defined in contract. Using "en" as default fallback.
const FALLBACK_LOCALE: Language = "en";

type TranslationKey = 
  | "subject.confirmed"
  | "subject.pending"
  | "subject.validated"
  | "subject.refused"
  | "subject.cancelled"
  | "subject.reminder"
  | "subject.review"
  | "greeting"
  | "body.confirmed"
  | "body.pending"
  | "body.validated"
  | "body.refused"
  | "body.cancelled"
  | "body.reminder"
  | "body.review"
  | "details.date"
  | "details.time"
  | "details.guests"
  | "manage.link"
  | "edit.link"
  | "cancel.link"
  | "footer";

type Translations = Record<TranslationKey, string>;

const translations: Record<Language, Translations> = {
  fr: {
    "subject.confirmed": "Votre réservation est confirmée",
    "subject.pending": "Votre demande de réservation",
    "subject.validated": "Votre réservation a été validée",
    "subject.refused": "Votre demande de réservation n'a pas pu être acceptée",
    "subject.cancelled": "Votre réservation a été annulée",
    "subject.reminder": "Rappel de votre réservation",
    "subject.review": "Comment s'est passée votre visite ?",
    "greeting": "Bonjour",
    "body.confirmed": "Votre réservation est confirmée.",
    "body.pending": "Votre demande de réservation a bien été reçue et est en attente de confirmation.",
    "body.validated": "Votre réservation a été validée par notre équipe.",
    "body.refused": "Nous sommes désolés, votre demande de réservation n'a pas pu être acceptée.",
    "body.cancelled": "Votre réservation a été annulée.",
    "body.reminder": "Nous vous rappelons votre réservation prochaine.",
    "body.review": "Nous espérons que votre visite s'est bien passée. N'hésitez pas à nous laisser un avis.",
    "details.date": "Date",
    "details.time": "Heure",
    "details.guests": "Nombre de personnes",
    "manage.link": "Gérer ma réservation",
    "edit.link": "Modifier ma réservation",
    "cancel.link": "Annuler ma réservation",
    "footer": "Merci de votre confiance.",
  },
  nl: {
    "subject.confirmed": "Uw reservering is bevestigd",
    "subject.pending": "Uw reserveringsaanvraag",
    "subject.validated": "Uw reservering is gevalideerd",
    "subject.refused": "Uw reserveringsaanvraag kon niet worden geaccepteerd",
    "subject.cancelled": "Uw reservering is geannuleerd",
    "subject.reminder": "Herinnering aan uw reservering",
    "subject.review": "Hoe was uw bezoek?",
    "greeting": "Hallo",
    "body.confirmed": "Uw reservering is bevestigd.",
    "body.pending": "Uw reserveringsaanvraag is ontvangen en wacht op bevestiging.",
    "body.validated": "Uw reservering is gevalideerd door ons team.",
    "body.refused": "Het spijt ons, uw reserveringsaanvraag kon niet worden geaccepteerd.",
    "body.cancelled": "Uw reservering is geannuleerd.",
    "body.reminder": "We herinneren u aan uw aankomende reservering.",
    "body.review": "We hopen dat uw bezoek goed is verlopen. Laat gerust een beoordeling achter.",
    "details.date": "Datum",
    "details.time": "Tijd",
    "details.guests": "Aantal gasten",
    "manage.link": "Mijn reservering beheren",
    "edit.link": "Mijn reservering wijzigen",
    "cancel.link": "Mijn reservering annuleren",
    "footer": "Bedankt voor uw vertrouwen.",
  },
  en: {
    "subject.confirmed": "Your reservation is confirmed",
    "subject.pending": "Your reservation request",
    "subject.validated": "Your reservation has been validated",
    "subject.refused": "Your reservation request could not be accepted",
    "subject.cancelled": "Your reservation has been cancelled",
    "subject.reminder": "Reminder of your reservation",
    "subject.review": "How was your visit?",
    "greeting": "Hello",
    "body.confirmed": "Your reservation is confirmed.",
    "body.pending": "Your reservation request has been received and is awaiting confirmation.",
    "body.validated": "Your reservation has been validated by our team.",
    "body.refused": "We are sorry, your reservation request could not be accepted.",
    "body.cancelled": "Your reservation has been cancelled.",
    "body.reminder": "We remind you of your upcoming reservation.",
    "body.review": "We hope your visit went well. Feel free to leave us a review.",
    "details.date": "Date",
    "details.time": "Time",
    "details.guests": "Number of guests",
    "manage.link": "Manage my reservation",
    "edit.link": "Edit my reservation",
    "cancel.link": "Cancel my reservation",
    "footer": "Thank you for your trust.",
  },
  de: {
    "subject.confirmed": "Ihre Reservierung ist bestätigt",
    "subject.pending": "Ihre Reservierungsanfrage",
    "subject.validated": "Ihre Reservierung wurde validiert",
    "subject.refused": "Ihre Reservierungsanfrage konnte nicht angenommen werden",
    "subject.cancelled": "Ihre Reservierung wurde storniert",
    "subject.reminder": "Erinnerung an Ihre Reservierung",
    "subject.review": "Wie war Ihr Besuch?",
    "greeting": "Hallo",
    "body.confirmed": "Ihre Reservierung ist bestätigt.",
    "body.pending": "Ihre Reservierungsanfrage wurde erhalten und wartet auf Bestätigung.",
    "body.validated": "Ihre Reservierung wurde von unserem Team validiert.",
    "body.refused": "Es tut uns leid, Ihre Reservierungsanfrage konnte nicht angenommen werden.",
    "body.cancelled": "Ihre Reservierung wurde storniert.",
    "body.reminder": "Wir erinnern Sie an Ihre bevorstehende Reservierung.",
    "body.review": "Wir hoffen, Ihr Besuch war angenehm. Hinterlassen Sie uns gerne eine Bewertung.",
    "details.date": "Datum",
    "details.time": "Uhrzeit",
    "details.guests": "Anzahl der Gäste",
    "manage.link": "Meine Reservierung verwalten",
    "edit.link": "Meine Reservierung bearbeiten",
    "cancel.link": "Meine Reservierung stornieren",
    "footer": "Vielen Dank für Ihr Vertrauen.",
  },
  it: {
    "subject.confirmed": "La tua prenotazione è confermata",
    "subject.pending": "La tua richiesta di prenotazione",
    "subject.validated": "La tua prenotazione è stata convalidata",
    "subject.refused": "La tua richiesta di prenotazione non è stata accettata",
    "subject.cancelled": "La tua prenotazione è stata annullata",
    "subject.reminder": "Promemoria della tua prenotazione",
    "subject.review": "Com'è andata la tua visita?",
    "greeting": "Ciao",
    "body.confirmed": "La tua prenotazione è confermata.",
    "body.pending": "La tua richiesta di prenotazione è stata ricevuta ed è in attesa di conferma.",
    "body.validated": "La tua prenotazione è stata convalidata dal nostro team.",
    "body.refused": "Ci dispiace, la tua richiesta di prenotazione non è stata accettata.",
    "body.cancelled": "La tua prenotazione è stata annullata.",
    "body.reminder": "Ti ricordiamo la tua prossima prenotazione.",
    "body.review": "Speriamo che la tua visita sia andata bene. Lasciaci una recensione.",
    "details.date": "Data",
    "details.time": "Ora",
    "details.guests": "Numero di ospiti",
    "manage.link": "Gestisci la mia prenotazione",
    "edit.link": "Modifica la mia prenotazione",
    "cancel.link": "Annulla la mia prenotazione",
    "footer": "Grazie per la tua fiducia.",
  },
};

function t(locale: Language, key: TranslationKey): string {
  const localeTranslations = translations[locale] ?? translations[FALLBACK_LOCALE];
  return localeTranslations[key] ?? translations[FALLBACK_LOCALE][key];
}

function getSubjectKey(type: EmailJobType): TranslationKey {
  switch (type) {
    case "reservation.confirmed":
      return "subject.confirmed";
    case "reservation.pending":
      return "subject.pending";
    case "reservation.validated":
      return "subject.validated";
    case "reservation.refused":
      return "subject.refused";
    case "reservation.cancelled":
      return "subject.cancelled";
    case "reservation.reminder":
      return "subject.reminder";
    case "reservation.review":
      return "subject.review";
  }
}

function getBodyKey(type: EmailJobType): TranslationKey {
  switch (type) {
    case "reservation.confirmed":
      return "body.confirmed";
    case "reservation.pending":
      return "body.pending";
    case "reservation.validated":
      return "body.validated";
    case "reservation.refused":
      return "body.refused";
    case "reservation.cancelled":
      return "body.cancelled";
    case "reservation.reminder":
      return "body.reminder";
    case "reservation.review":
      return "body.review";
  }
}

const VALID_EMAIL_TYPES: EmailJobType[] = [
  "reservation.confirmed",
  "reservation.pending",
  "reservation.validated",
  "reservation.refused",
  "reservation.cancelled",
  "reservation.reminder",
  "reservation.review",
];

/**
 * Render an email template.
 * Pure function, testable.
 * 
 * @throws Errors.INVALID_INPUT if type is unknown
 */
export function renderTemplate(
  type: string,
  locale: Language,
  data: TemplateData
): RenderedEmail {
  if (!VALID_EMAIL_TYPES.includes(type as EmailJobType)) {
    throw Errors.INVALID_INPUT("type", `Unknown email type: ${type}`);
  }

  const emailType = type as EmailJobType;
  const effectiveLocale = translations[locale] ? locale : FALLBACK_LOCALE;

  const subject = t(effectiveLocale, getSubjectKey(emailType));

  // Escape user-provided data
  const safeFirstName = escapeHtml(data.firstName);
  const safeLastName = escapeHtml(data.lastName);
  const safeCancelReason = data.cancelReason ? escapeHtml(data.cancelReason) : "";
  const safeRestaurantName = data.restaurantName ? escapeHtml(data.restaurantName) : "La Moulinière";

  const greeting = t(effectiveLocale, "greeting");
  const body = t(effectiveLocale, getBodyKey(emailType));
  const dateLabel = t(effectiveLocale, "details.date");
  const timeLabel = t(effectiveLocale, "details.time");
  const guestsLabel = t(effectiveLocale, "details.guests");
  const manageLabel = t(effectiveLocale, "manage.link");
  const editLabel = t(effectiveLocale, "edit.link");
  const cancelLabel = t(effectiveLocale, "cancel.link");
  const footer = t(effectiveLocale, "footer");

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="${effectiveLocale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2c5530;">${safeRestaurantName}</h1>
  <p>${greeting} ${safeFirstName} ${safeLastName},</p>
  <p>${body}</p>`;

  // Add cancel reason if applicable
  if (emailType === "reservation.refused" && safeCancelReason) {
    html += `\n  <p><em>${safeCancelReason}</em></p>`;
  }

  // Add reservation details (except for review emails)
  if (emailType !== "reservation.review") {
    html += `
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><strong>${dateLabel}:</strong> ${escapeHtml(data.dateKey)}</p>
    <p><strong>${timeLabel}:</strong> ${escapeHtml(data.timeKey)}</p>
    <p><strong>${guestsLabel}:</strong> ${data.partySize}</p>
  </div>`;
  }

  // Add edit/cancel links for non-cancelled, non-review emails
  if (emailType !== "reservation.cancelled" && emailType !== "reservation.review") {
    // Use editUrl/cancelUrl if provided, otherwise fallback to manageUrl
    const editUrl = data.editUrl ?? data.manageUrl;
    const cancelUrl = data.cancelUrl ?? data.manageUrl;
    
    if (editUrl || cancelUrl) {
      html += `
  <div style="margin: 20px 0;">`;
      
      if (editUrl) {
        html += `
    <a href="${escapeHtml(editUrl)}" style="display: inline-block; background: #2c5530; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
      ${editLabel}
    </a>`;
      }
      
      if (cancelUrl) {
        html += `
    <a href="${escapeHtml(cancelUrl)}" style="display: inline-block; background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      ${cancelLabel}
    </a>`;
      }
      
      html += `
  </div>`;
    }
  }

  html += `
  <p style="margin-top: 30px; color: #666;">${footer}</p>
</body>
</html>`;

  return { subject, html };
}
