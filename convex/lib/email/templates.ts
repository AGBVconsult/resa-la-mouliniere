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
  adults?: number;
  childrenCount?: number;
  babyCount?: number;
  language?: "fr" | "nl" | "en" | "de" | "it";
  manageUrl?: string;
  editUrl?: string;
  cancelUrl?: string;
  cancelReason?: string;
  restaurantName?: string;
  note?: string;
  options?: string[];
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
  | "body.confirmed.subtitle"
  | "body.confirmed.intro"
  | "body.pending"
  | "body.pending.subtitle"
  | "body.pending.intro"
  | "body.validated"
  | "body.validated.subtitle"
  | "body.validated.intro"
  | "body.refused"
  | "body.refused.subtitle"
  | "body.refused.intro"
  | "body.cancelled"
  | "body.cancelled.subtitle"
  | "body.cancelled.intro"
  | "body.reminder"
  | "body.reminder.subtitle"
  | "body.reminder.intro"
  | "body.review"
  | "body.review.subtitle"
  | "body.review.intro"
  | "details.date"
  | "details.time"
  | "details.guests"
  | "details.adults"
  | "details.children"
  | "details.babies"
  | "manage.link"
  | "edit.link"
  | "cancel.link"
  | "review.link"
  | "footer"
  | "reason";

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
    "body.confirmed": "Réservation confirmée !",
    "body.confirmed.subtitle": "La Moulinière vous attend.",
    "body.confirmed.intro": "Votre table est prête. Voici le récapitulatif de votre réservation.",
    "body.pending": "Demande en attente",
    "body.pending.subtitle": "Nous avons bien reçu votre demande.",
    "body.pending.intro": "Votre réservation est en cours de validation par notre équipe. Vous recevrez une confirmation sous peu.",
    "body.validated": "Réservation validée !",
    "body.validated.subtitle": "Notre équipe a confirmé votre réservation.",
    "body.validated.intro": "Bonne nouvelle ! Votre réservation a été validée. Voici le récapitulatif.",
    "body.refused": "Demande non acceptée",
    "body.refused.subtitle": "Nous sommes désolés.",
    "body.refused.intro": "Malheureusement, nous n'avons pas pu accepter votre demande de réservation.",
    "body.cancelled": "Réservation annulée",
    "body.cancelled.subtitle": "Votre réservation a été annulée.",
    "body.cancelled.intro": "La réservation suivante a été annulée. Nous espérons vous revoir bientôt.",
    "body.reminder": "Rappel de réservation",
    "body.reminder.subtitle": "C'est demain !",
    "body.reminder.intro": "Nous avons hâte de vous accueillir. Voici le rappel de votre réservation.",
    "body.review": "Donnez-nous votre avis",
    "body.review.subtitle": "Merci de votre visite !",
    "body.review.intro": "Nous espérons que vous avez passé un agréable moment. Votre avis nous aide à nous améliorer.",
    "details.date": "Date",
    "details.time": "Heure",
    "details.guests": "personnes",
    "details.adults": "Adultes",
    "details.children": "Enfant",
    "details.babies": "Bébé",
    "manage.link": "Gérer ma réservation",
    "edit.link": "Modifier ma réservation",
    "cancel.link": "Annuler ma réservation",
    "review.link": "Laisser un avis",
    "footer": "Merci de votre confiance.",
    "reason": "Raison",
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
    "body.confirmed": "Reservering bevestigd!",
    "body.confirmed.subtitle": "La Moulinière verwacht u.",
    "body.confirmed.intro": "Uw tafel is klaar. Hier is de samenvatting van uw reservering.",
    "body.pending": "Aanvraag in behandeling",
    "body.pending.subtitle": "We hebben uw aanvraag ontvangen.",
    "body.pending.intro": "Uw reservering wordt gevalideerd door ons team. U ontvangt binnenkort een bevestiging.",
    "body.validated": "Reservering gevalideerd!",
    "body.validated.subtitle": "Ons team heeft uw reservering bevestigd.",
    "body.validated.intro": "Goed nieuws! Uw reservering is gevalideerd. Hier is de samenvatting.",
    "body.refused": "Aanvraag niet geaccepteerd",
    "body.refused.subtitle": "Het spijt ons.",
    "body.refused.intro": "Helaas konden we uw reserveringsaanvraag niet accepteren.",
    "body.cancelled": "Reservering geannuleerd",
    "body.cancelled.subtitle": "Uw reservering is geannuleerd.",
    "body.cancelled.intro": "De volgende reservering is geannuleerd. We hopen u snel weer te zien.",
    "body.reminder": "Reserveringsherinnering",
    "body.reminder.subtitle": "Het is morgen!",
    "body.reminder.intro": "We kijken ernaar uit u te verwelkomen. Hier is de herinnering van uw reservering.",
    "body.review": "Geef ons uw mening",
    "body.review.subtitle": "Bedankt voor uw bezoek!",
    "body.review.intro": "We hopen dat u een aangename tijd heeft gehad. Uw feedback helpt ons te verbeteren.",
    "details.date": "Datum",
    "details.time": "Tijd",
    "details.guests": "personen",
    "details.adults": "Volwassenen",
    "details.children": "Kind",
    "details.babies": "Baby",
    "manage.link": "Mijn reservering beheren",
    "edit.link": "Mijn reservering wijzigen",
    "cancel.link": "Mijn reservering annuleren",
    "review.link": "Laat een beoordeling achter",
    "footer": "Bedankt voor uw vertrouwen.",
    "reason": "Reden",
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
    "body.confirmed": "Reservation confirmed!",
    "body.confirmed.subtitle": "La Moulinière is expecting you.",
    "body.confirmed.intro": "Your table is ready. Here is the summary of your reservation.",
    "body.pending": "Request pending",
    "body.pending.subtitle": "We have received your request.",
    "body.pending.intro": "Your reservation is being validated by our team. You will receive a confirmation shortly.",
    "body.validated": "Reservation validated!",
    "body.validated.subtitle": "Our team has confirmed your reservation.",
    "body.validated.intro": "Good news! Your reservation has been validated. Here is the summary.",
    "body.refused": "Request not accepted",
    "body.refused.subtitle": "We are sorry.",
    "body.refused.intro": "Unfortunately, we could not accept your reservation request.",
    "body.cancelled": "Reservation cancelled",
    "body.cancelled.subtitle": "Your reservation has been cancelled.",
    "body.cancelled.intro": "The following reservation has been cancelled. We hope to see you again soon.",
    "body.reminder": "Reservation reminder",
    "body.reminder.subtitle": "It's tomorrow!",
    "body.reminder.intro": "We look forward to welcoming you. Here is the reminder of your reservation.",
    "body.review": "Give us your feedback",
    "body.review.subtitle": "Thank you for your visit!",
    "body.review.intro": "We hope you had a pleasant time. Your feedback helps us improve.",
    "details.date": "Date",
    "details.time": "Time",
    "details.guests": "guests",
    "details.adults": "Adults",
    "details.children": "Child",
    "details.babies": "Baby",
    "manage.link": "Manage my reservation",
    "edit.link": "Edit my reservation",
    "cancel.link": "Cancel my reservation",
    "review.link": "Leave a review",
    "footer": "Thank you for your trust.",
    "reason": "Reason",
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
    "body.confirmed": "Reservierung bestätigt!",
    "body.confirmed.subtitle": "La Moulinière erwartet Sie.",
    "body.confirmed.intro": "Ihr Tisch ist bereit. Hier ist die Zusammenfassung Ihrer Reservierung.",
    "body.pending": "Anfrage in Bearbeitung",
    "body.pending.subtitle": "Wir haben Ihre Anfrage erhalten.",
    "body.pending.intro": "Ihre Reservierung wird von unserem Team validiert. Sie erhalten in Kürze eine Bestätigung.",
    "body.validated": "Reservierung validiert!",
    "body.validated.subtitle": "Unser Team hat Ihre Reservierung bestätigt.",
    "body.validated.intro": "Gute Nachrichten! Ihre Reservierung wurde validiert. Hier ist die Zusammenfassung.",
    "body.refused": "Anfrage nicht akzeptiert",
    "body.refused.subtitle": "Es tut uns leid.",
    "body.refused.intro": "Leider konnten wir Ihre Reservierungsanfrage nicht akzeptieren.",
    "body.cancelled": "Reservierung storniert",
    "body.cancelled.subtitle": "Ihre Reservierung wurde storniert.",
    "body.cancelled.intro": "Die folgende Reservierung wurde storniert. Wir hoffen, Sie bald wieder zu sehen.",
    "body.reminder": "Reservierungserinnerung",
    "body.reminder.subtitle": "Es ist morgen!",
    "body.reminder.intro": "Wir freuen uns darauf, Sie zu begrüßen. Hier ist die Erinnerung an Ihre Reservierung.",
    "body.review": "Geben Sie uns Ihr Feedback",
    "body.review.subtitle": "Vielen Dank für Ihren Besuch!",
    "body.review.intro": "Wir hoffen, Sie hatten eine angenehme Zeit. Ihr Feedback hilft uns, uns zu verbessern.",
    "details.date": "Datum",
    "details.time": "Uhrzeit",
    "details.guests": "Gäste",
    "details.adults": "Erwachsene",
    "details.children": "Kind",
    "details.babies": "Baby",
    "manage.link": "Meine Reservierung verwalten",
    "edit.link": "Meine Reservierung bearbeiten",
    "cancel.link": "Meine Reservierung stornieren",
    "review.link": "Bewertung hinterlassen",
    "footer": "Vielen Dank für Ihr Vertrauen.",
    "reason": "Grund",
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
    "body.confirmed": "Prenotazione confermata!",
    "body.confirmed.subtitle": "La Moulinière ti aspetta.",
    "body.confirmed.intro": "Il tuo tavolo è pronto. Ecco il riepilogo della tua prenotazione.",
    "body.pending": "Richiesta in attesa",
    "body.pending.subtitle": "Abbiamo ricevuto la tua richiesta.",
    "body.pending.intro": "La tua prenotazione è in fase di validazione dal nostro team. Riceverai una conferma a breve.",
    "body.validated": "Prenotazione convalidata!",
    "body.validated.subtitle": "Il nostro team ha confermato la tua prenotazione.",
    "body.validated.intro": "Buone notizie! La tua prenotazione è stata convalidata. Ecco il riepilogo.",
    "body.refused": "Richiesta non accettata",
    "body.refused.subtitle": "Ci dispiace.",
    "body.refused.intro": "Purtroppo non abbiamo potuto accettare la tua richiesta di prenotazione.",
    "body.cancelled": "Prenotazione annullata",
    "body.cancelled.subtitle": "La tua prenotazione è stata annullata.",
    "body.cancelled.intro": "La seguente prenotazione è stata annullata. Speriamo di rivederti presto.",
    "body.reminder": "Promemoria prenotazione",
    "body.reminder.subtitle": "È domani!",
    "body.reminder.intro": "Non vediamo l'ora di accoglierti. Ecco il promemoria della tua prenotazione.",
    "body.review": "Dacci il tuo feedback",
    "body.review.subtitle": "Grazie per la tua visita!",
    "body.review.intro": "Speriamo che tu abbia trascorso un momento piacevole. Il tuo feedback ci aiuta a migliorare.",
    "details.date": "Data",
    "details.time": "Ora",
    "details.guests": "ospiti",
    "details.adults": "Adulti",
    "details.children": "Bambino",
    "details.babies": "Neonato",
    "manage.link": "Gestisci la mia prenotazione",
    "edit.link": "Modifica la mia prenotazione",
    "cancel.link": "Annulla la mia prenotazione",
    "review.link": "Lascia una recensione",
    "footer": "Grazie per la tua fiducia.",
    "reason": "Motivo",
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
 * Format date for display (e.g., "2025-01-15" -> "Mercredi 15 Janvier")
 */
function formatDateForDisplay(dateKey: string, locale: Language): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  const weekdays: Record<Language, string[]> = {
    fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    nl: ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    de: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    it: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
  };
  
  const months: Record<Language, string[]> = {
    fr: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
    nl: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    it: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
  };
  
  const weekday = weekdays[locale][date.getDay()];
  const monthName = months[locale][date.getMonth()];
  
  return `${weekday} ${day} ${monthName}`;
}

/**
 * Option labels by locale
 */
const optionLabels: Record<Language, Record<string, string>> = {
  fr: { highChair: "Chaise haute", dogAccess: "Chien", wheelchair: "PMR" },
  nl: { highChair: "Kinderstoel", dogAccess: "Hond", wheelchair: "Rolstoel" },
  en: { highChair: "High chair", dogAccess: "Dog", wheelchair: "Wheelchair" },
  de: { highChair: "Hochstuhl", dogAccess: "Hund", wheelchair: "Rollstuhl" },
  it: { highChair: "Seggiolone", dogAccess: "Cane", wheelchair: "Sedia a rotelle" },
};

/**
 * Build options string for display
 */
function buildOptionsString(options: string[] | undefined, locale: Language): string {
  if (!options || options.length === 0) return "";
  const labels = optionLabels[locale] ?? optionLabels.en;
  return options.map(opt => labels[opt] ?? opt).join(", ");
}

/**
 * Build party size detail string (e.g., "4 personnes (2 Adultes, 1 Enfant, 1 Bébé)")
 */
function buildPartySizeDetail(data: TemplateData, locale: Language): string {
  const guestsLabel = t(locale, "details.guests");
  const adultsLabel = t(locale, "details.adults");
  const childrenLabel = t(locale, "details.children");
  const babiesLabel = t(locale, "details.babies");
  
  let detail = `${data.partySize} ${guestsLabel}`;
  
  const parts: string[] = [];
  if (data.adults && data.adults > 0) {
    parts.push(`${data.adults} ${adultsLabel}`);
  }
  if (data.childrenCount && data.childrenCount > 0) {
    parts.push(`${data.childrenCount} ${childrenLabel}`);
  }
  if (data.babyCount && data.babyCount > 0) {
    parts.push(`${data.babyCount} ${babiesLabel}`);
  }
  
  if (parts.length > 0) {
    detail += ` <span style="font-weight: 400; color: #6b7280; font-size: 14px;">(${parts.join(", ")})</span>`;
  }
  
  return detail;
}

/**
 * Base URL for email icons (hosted on production)
 */
const ICONS_BASE_URL = "https://lamouliniere.be/emails/icons";

/**
 * PNG icons for email templates (hosted on our infrastructure for 100% compatibility)
 * Using Lucide icons converted to PNG
 */
const EMAIL_ICONS = {
  // Header icons (32x32)
  check: `<img src="${ICONS_BASE_URL}/check-green.png" alt="✓" width="32" height="32" style="display: block;" />`,
  pending: `<img src="${ICONS_BASE_URL}/hourglass-orange.png" alt="⏳" width="32" height="32" style="display: block;" />`,
  validated: `<img src="${ICONS_BASE_URL}/check-green.png" alt="✓" width="32" height="32" style="display: block;" />`,
  refused: `<img src="${ICONS_BASE_URL}/x-red.png" alt="✗" width="32" height="32" style="display: block;" />`,
  cancelled: `<img src="${ICONS_BASE_URL}/x-gray.png" alt="✗" width="32" height="32" style="display: block;" />`,
  reminder: `<img src="${ICONS_BASE_URL}/bell-blue.png" alt="🔔" width="32" height="32" style="display: block;" />`,
  review: `<img src="${ICONS_BASE_URL}/star-purple.png" alt="⭐" width="32" height="32" style="display: block;" />`,
  // Detail icons (18x18)
  calendar: `<img src="${ICONS_BASE_URL}/calendar-gray.png" alt="📅" width="18" height="18" style="display: block;" />`,
  clock: `<img src="${ICONS_BASE_URL}/clock-gray.png" alt="🕐" width="18" height="18" style="display: block;" />`,
  users: `<img src="${ICONS_BASE_URL}/users-gray.png" alt="👥" width="18" height="18" style="display: block;" />`,
  message: `<img src="${ICONS_BASE_URL}/message-circle-gray.png" alt="💬" width="18" height="18" style="display: block;" />`,
  options: `<img src="${ICONS_BASE_URL}/settings-gray.png" alt="⚙️" width="18" height="18" style="display: block;" />`,
  reason: `<img src="${ICONS_BASE_URL}/info-gray.png" alt="ℹ️" width="18" height="18" style="display: block;" />`,
};

/**
 * Get icon and colors for each email type
 */
function getEmailTypeConfig(type: EmailJobType): { icon: string; bgColor: string; iconBgColor: string } {
  switch (type) {
    case "reservation.confirmed":
      return { icon: EMAIL_ICONS.check, bgColor: "#dcfce7", iconBgColor: "#dcfce7" };
    case "reservation.pending":
      return { icon: EMAIL_ICONS.pending, bgColor: "#fef3c7", iconBgColor: "#fef3c7" };
    case "reservation.validated":
      return { icon: EMAIL_ICONS.validated, bgColor: "#dcfce7", iconBgColor: "#dcfce7" };
    case "reservation.refused":
      return { icon: EMAIL_ICONS.refused, bgColor: "#fee2e2", iconBgColor: "#fee2e2" };
    case "reservation.cancelled":
      return { icon: EMAIL_ICONS.cancelled, bgColor: "#f3f4f6", iconBgColor: "#f3f4f6" };
    case "reservation.reminder":
      return { icon: EMAIL_ICONS.reminder, bgColor: "#dbeafe", iconBgColor: "#dbeafe" };
    case "reservation.review":
      return { icon: EMAIL_ICONS.review, bgColor: "#ede9fe", iconBgColor: "#ede9fe" };
  }
}

/**
 * Get title translation key for email type
 */
function getTitleKey(type: EmailJobType): TranslationKey {
  switch (type) {
    case "reservation.confirmed": return "body.confirmed";
    case "reservation.pending": return "body.pending";
    case "reservation.validated": return "body.validated";
    case "reservation.refused": return "body.refused";
    case "reservation.cancelled": return "body.cancelled";
    case "reservation.reminder": return "body.reminder";
    case "reservation.review": return "body.review";
  }
}

/**
 * Get subtitle translation key for email type
 */
function getSubtitleKey(type: EmailJobType): TranslationKey {
  switch (type) {
    case "reservation.confirmed": return "body.confirmed.subtitle";
    case "reservation.pending": return "body.pending.subtitle";
    case "reservation.validated": return "body.validated.subtitle";
    case "reservation.refused": return "body.refused.subtitle";
    case "reservation.cancelled": return "body.cancelled.subtitle";
    case "reservation.reminder": return "body.reminder.subtitle";
    case "reservation.review": return "body.review.subtitle";
  }
}

/**
 * Get intro translation key for email type
 */
function getIntroKey(type: EmailJobType): TranslationKey {
  switch (type) {
    case "reservation.confirmed": return "body.confirmed.intro";
    case "reservation.pending": return "body.pending.intro";
    case "reservation.validated": return "body.validated.intro";
    case "reservation.refused": return "body.refused.intro";
    case "reservation.cancelled": return "body.cancelled.intro";
    case "reservation.reminder": return "body.reminder.intro";
    case "reservation.review": return "body.review.intro";
  }
}

/**
 * Render the modern email template for all types
 */
function renderModernTemplate(
  type: EmailJobType,
  locale: Language,
  data: TemplateData
): string {
  const safeFirstName = escapeHtml(data.firstName);
  const greeting = t(locale, "greeting");
  const title = t(locale, getTitleKey(type));
  const subtitle = t(locale, getSubtitleKey(type));
  const intro = t(locale, getIntroKey(type));
  const editLabel = t(locale, "edit.link");
  const cancelLabel = t(locale, "cancel.link");
  const reviewLabel = t(locale, "review.link");
  const reasonLabel = t(locale, "reason");
  const footer = t(locale, "footer");
  const subject = t(locale, getSubjectKey(type));
  
  const config = getEmailTypeConfig(type);
  const formattedDate = formatDateForDisplay(data.dateKey, locale);
  const partySizeDetail = buildPartySizeDetail(data, locale);
  const editUrl = data.editUrl ?? data.manageUrl ?? "#";
  const cancelUrl = data.cancelUrl ?? data.manageUrl ?? "#";
  const safeNote = data.note ? escapeHtml(data.note) : "";
  const safeCancelReason = data.cancelReason ? escapeHtml(data.cancelReason) : "";
  const optionsString = buildOptionsString(data.options, locale);
  const hasOptions = optionsString.length > 0;
  const hasNote = safeNote.length > 0;
  const hasCancelReason = safeCancelReason.length > 0 && type === "reservation.refused";
  const hasExtras = hasOptions || hasNote || hasCancelReason;
  
  // Determine which buttons to show
  const showEditCancel = type === "reservation.confirmed" || type === "reservation.pending" || type === "reservation.validated" || type === "reservation.reminder";
  const showReview = type === "reservation.review";
  const showDetails = type !== "reservation.review";

  // Build details section HTML
  let detailsHtml = "";
  if (showDetails) {
    detailsHtml = `
                <!-- Carte Détails -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; margin-bottom: 30px;">
                  <!-- Date -->
                  <tr>
                    <td style="padding: 20px 20px 15px 20px; border-bottom: 1px dashed #e5e7eb;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="30" style="vertical-align: middle;">${EMAIL_ICONS.calendar}</td>
                          <td style="vertical-align: middle; padding-left: 10px;">
                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600;">${formattedDate}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Heure -->
                  <tr>
                    <td style="padding: 15px 20px 15px 20px; border-bottom: 1px dashed #e5e7eb;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="30" style="vertical-align: middle;">${EMAIL_ICONS.clock}</td>
                          <td style="vertical-align: middle; padding-left: 10px;">
                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600;">${escapeHtml(data.timeKey)}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Couverts -->
                  <tr>
                    <td style="padding: 15px 20px ${hasExtras ? "15px" : "20px"} 20px;${hasExtras ? " border-bottom: 1px dashed #e5e7eb;" : ""}">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="30" style="vertical-align: middle;">${EMAIL_ICONS.users}</td>
                          <td style="vertical-align: middle; padding-left: 10px;">
                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #111827; font-weight: 600;">${partySizeDetail}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>${hasOptions ? `
                  <!-- Options -->
                  <tr>
                    <td style="padding: 15px 20px ${hasNote || hasCancelReason ? "15px" : "20px"} 20px;${hasNote || hasCancelReason ? " border-bottom: 1px dashed #e5e7eb;" : ""}">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="30" style="vertical-align: middle;">${EMAIL_ICONS.options}</td>
                          <td style="vertical-align: middle; padding-left: 10px;">
                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #4b5563;">${optionsString}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>` : ""}${hasCancelReason ? `
                  <!-- Raison du refus -->
                  <tr>
                    <td style="padding: 15px 20px ${hasNote ? "15px" : "20px"} 20px;${hasNote ? " border-bottom: 1px dashed #e5e7eb;" : ""}">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="30" style="vertical-align: top; padding-top: 2px;">${EMAIL_ICONS.reason}</td>
                          <td style="vertical-align: top; padding-left: 10px;">
                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${reasonLabel}</span>
                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #4b5563; line-height: 1.5; display: block; margin-top: 4px;">${safeCancelReason}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>` : ""}${hasNote ? `
                  <!-- Note -->
                  <tr>
                    <td style="padding: 15px 20px 20px 20px;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="30" style="vertical-align: top; padding-top: 2px;">${EMAIL_ICONS.message}</td>
                          <td style="vertical-align: top; padding-left: 10px;">
                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #4b5563; line-height: 1.5; display: block; font-style: italic;">"${safeNote}"</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>` : ""}
                </table>`;
  }

  // Build actions section HTML
  let actionsHtml = "";
  if (showEditCancel) {
    actionsHtml = `
                <!-- Actions -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(editUrl)}" class="btn" style="display: block; background-color: #2c5530; color: #ffffff; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; font-size: 15px; text-align: center; border: 1px solid #2c5530;">${editLabel}</a>
                      <div style="height: 12px;"></div>
                      <a href="${escapeHtml(cancelUrl)}" class="btn" style="display: block; background-color: #ffffff; color: #dc2626; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; text-align: center; border: 1px solid #e5e7eb; font-weight: 500;">${cancelLabel}</a>
                    </td>
                  </tr>
                </table>`;
  } else if (showReview) {
    actionsHtml = `
                <!-- Actions -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <a href="https://g.page/r/lamouliniere/review" class="btn" style="display: block; background-color: #8b5cf6; color: #ffffff; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; font-size: 15px; text-align: center; border: 1px solid #8b5cf6;">${reviewLabel}</a>
                    </td>
                  </tr>
                </table>`;
  }

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-content { width: 100% !important; }
      .body-content { padding: 30px 20px !important; }
      .btn { width: 100% !important; display: block !important; box-sizing: border-box; margin-bottom: 10px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6;">
  <div style="background-color: #f3f4f6; padding: 40px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
            
            <!-- Header avec Icone -->
            <tr>
              <td style="padding: 40px 30px 10px 30px; text-align: center; background-color: #ffffff;">
                <div style="display: inline-block; background-color: ${config.iconBgColor}; border-radius: 50%; padding: 16px; margin-bottom: 20px;">
                  ${config.icon}
                </div>
                <h1 style="color: #111827; margin: 0 0 10px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${title}</h1>
                <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #6b7280;">${subtitle}</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 20px 40px 40px 40px;" class="body-content">
                
                <p style="text-align: center; margin: 0 0 30px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #4b5563;">
                  ${greeting} ${safeFirstName},<br>
                  ${intro}
                </p>

                ${detailsHtml}
                ${actionsHtml}

                <p style="text-align: center; margin-top: 30px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #9ca3af;">${footer}</p>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

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

  // Use modern template for all email types
  return {
    subject,
    html: renderModernTemplate(emailType, effectiveLocale, data),
  };
}
