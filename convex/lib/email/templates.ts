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
  | "reservation.modified"
  | "reservation.reminder"
  | "reservation.noshow"
  | "reservation.review"
  | "reservation.cancelled_by_restaurant"
  | "admin.notification";

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
  | "subject.modified"
  | "subject.reminder"
  | "subject.noshow"
  | "subject.review"
  | "subject.cancelled_by_restaurant"
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
  | "body.modified"
  | "body.modified.subtitle"
  | "body.modified.intro"
  | "body.noshow"
  | "body.noshow.subtitle"
  | "body.noshow.intro"
  | "body.cancelled_by_restaurant"
  | "body.cancelled_by_restaurant.subtitle"
  | "body.cancelled_by_restaurant.intro"
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
    "subject.confirmed": "Réservation confirmée !",
    "subject.pending": "Demande bien reçue (Validation en cours ⏳)",
    "subject.validated": "Réservation confirmée !",
    "subject.refused": "Votre demande n'a pas pu être confirmée",
    "subject.cancelled": "Annulation confirmée",
    "subject.modified": "Réservation modifiée",
    "subject.reminder": "On vous attend tout à l'heure !",
    "subject.noshow": "On vous a attendu(e)",
    "subject.review": "Merci pour votre visite !",
    "subject.cancelled_by_restaurant": "Nous sommes sincèrement désolés...",
    "greeting": "Bonjour",
    "body.confirmed": "Réservation confirmée !",
    "body.confirmed.subtitle": "Votre table est réservée.",
    "body.confirmed.intro": "Tout est prêt pour vous recevoir.",
    "body.pending": "Demande en attente",
    "body.pending.subtitle": "Nous vérifions la disponibilité pour votre groupe.",
    "body.pending.intro": "Pour vous garantir un accueil soigné, et comme nous travaillons en duo, Allisson vérifie personnellement le planning avant de confirmer votre réservation.",
    "body.validated": "Réservation confirmée !",
    "body.validated.subtitle": "Votre table est réservée.",
    "body.validated.intro": "Tout est prêt pour vous recevoir.",
    "body.refused": "Demande non confirmée",
    "body.refused.subtitle": "Nous revenons vers vous concernant votre réservation.",
    "body.refused.intro": "Comme convenu, Allisson a vérifié personnellement notre planning. Malheureusement, nous sommes complets à cet horaire et la configuration de la salle ne nous permet pas de vous installer confortablement.",
    "body.cancelled": "Annulation confirmée",
    "body.cancelled.subtitle": "Votre réservation a bien été annulée.",
    "body.cancelled.intro": "C'est bien noté. Merci de nous avoir prévenus — c'est précieux pour notre organisation.",
    "body.reminder": "On vous attend !",
    "body.reminder.subtitle": "Votre table est prête.",
    "body.reminder.intro": "On s'active en cuisine : votre table est prête !",
    "body.review": "Merci pour votre visite !",
    "body.review.subtitle": "Votre avis compte pour nous.",
    "body.review.intro": "Nous espérons que vous avez passé un bon moment à notre table. Si c'est le cas, un petit avis en ligne nous aide énormément.",
    "body.modified": "Réservation modifiée",
    "body.modified.subtitle": "Votre réservation a bien été mise à jour.",
    "body.modified.intro": "Voici votre nouveau récapitulatif.",
    "body.noshow": "On vous a attendu(e)",
    "body.noshow.subtitle": "Votre table est restée vide.",
    "body.noshow.intro": "Nous vous attendions, mais vous ne vous êtes pas présenté(e). Les imprévus font partie de la vie, nous le comprenons. Cependant, pour un duo comme le nôtre, chaque table compte.",
    "body.cancelled_by_restaurant": "Nous sommes sincèrement désolés",
    "body.cancelled_by_restaurant.subtitle": "Nous devons malheureusement annuler votre réservation.",
    "body.cancelled_by_restaurant.intro": "C'est le message que nous détestons écrire, mais nous ne pourrons malheureusement pas vous accueillir comme prévu. Travaillant en duo, nous sommes contraints d'annuler pour cause de force majeure.",
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
    "subject.confirmed": "Reservering bevestigd!",
    "subject.pending": "Aanvraag ontvangen (Validatie bezig ⏳)",
    "subject.validated": "Reservering bevestigd!",
    "subject.refused": "Uw aanvraag kon niet worden bevestigd",
    "subject.cancelled": "Annulering bevestigd",
    "subject.modified": "Reservering gewijzigd",
    "subject.reminder": "We verwachten u straks!",
    "subject.noshow": "We hebben op u gewacht",
    "subject.review": "Bedankt voor uw bezoek!",
    "subject.cancelled_by_restaurant": "Het spijt ons oprecht...",
    "greeting": "Hallo",
    "body.confirmed": "Reservering bevestigd!",
    "body.confirmed.subtitle": "Uw tafel is gereserveerd.",
    "body.confirmed.intro": "Alles is klaar om u te ontvangen.",
    "body.pending": "Aanvraag in behandeling",
    "body.pending.subtitle": "We controleren de beschikbaarheid voor uw groep.",
    "body.pending.intro": "Om u een verzorgde ontvangst te garanderen, controleert Allisson persoonlijk de planning voordat we uw reservering bevestigen.",
    "body.validated": "Reservering bevestigd!",
    "body.validated.subtitle": "Uw tafel is gereserveerd.",
    "body.validated.intro": "Alles is klaar om u te ontvangen.",
    "body.refused": "Aanvraag niet bevestigd",
    "body.refused.subtitle": "We komen bij u terug over uw reservering.",
    "body.refused.intro": "Zoals afgesproken heeft Allisson onze planning persoonlijk gecontroleerd. Helaas zijn we op dit tijdstip volgeboekt.",
    "body.cancelled": "Annulering bevestigd",
    "body.cancelled.subtitle": "Uw reservering is geannuleerd.",
    "body.cancelled.intro": "Begrepen. Bedankt dat u ons hebt laten weten — dat is waardevol voor onze organisatie.",
    "body.reminder": "We verwachten u!",
    "body.reminder.subtitle": "Uw tafel is klaar.",
    "body.reminder.intro": "We zijn druk bezig in de keuken: uw tafel is klaar!",
    "body.review": "Bedankt voor uw bezoek!",
    "body.review.subtitle": "Uw mening is belangrijk voor ons.",
    "body.review.intro": "We hopen dat u een fijne tijd heeft gehad. Een online review helpt ons enorm.",
    "body.modified": "Reservering gewijzigd",
    "body.modified.subtitle": "Uw reservering is bijgewerkt.",
    "body.modified.intro": "Hier is uw nieuwe overzicht.",
    "body.noshow": "We hebben op u gewacht",
    "body.noshow.subtitle": "Uw tafel bleef leeg.",
    "body.noshow.intro": "We verwachtten u, maar u bent niet verschenen. Onvoorziene omstandigheden gebeuren, dat begrijpen we.",
    "body.cancelled_by_restaurant": "Het spijt ons oprecht",
    "body.cancelled_by_restaurant.subtitle": "We moeten helaas uw reservering annuleren.",
    "body.cancelled_by_restaurant.intro": "Dit is het bericht dat we haten te schrijven, maar we kunnen u helaas niet ontvangen zoals gepland.",
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
    "subject.confirmed": "Reservation confirmed!",
    "subject.pending": "Request received (Validation in progress ⏳)",
    "subject.validated": "Reservation confirmed!",
    "subject.refused": "Your request could not be confirmed",
    "subject.cancelled": "Cancellation confirmed",
    "subject.modified": "Reservation modified",
    "subject.reminder": "We're expecting you soon!",
    "subject.noshow": "We waited for you",
    "subject.review": "Thank you for your visit!",
    "subject.cancelled_by_restaurant": "We are sincerely sorry...",
    "greeting": "Hello",
    "body.confirmed": "Reservation confirmed!",
    "body.confirmed.subtitle": "Your table is reserved.",
    "body.confirmed.intro": "Everything is ready to welcome you.",
    "body.pending": "Request pending",
    "body.pending.subtitle": "We are checking availability for your group.",
    "body.pending.intro": "To ensure a quality welcome, Allisson personally checks the schedule before confirming your reservation.",
    "body.validated": "Reservation confirmed!",
    "body.validated.subtitle": "Your table is reserved.",
    "body.validated.intro": "Everything is ready to welcome you.",
    "body.refused": "Request not confirmed",
    "body.refused.subtitle": "We are getting back to you about your reservation.",
    "body.refused.intro": "As agreed, Allisson personally checked our schedule. Unfortunately, we are fully booked at this time.",
    "body.cancelled": "Cancellation confirmed",
    "body.cancelled.subtitle": "Your reservation has been cancelled.",
    "body.cancelled.intro": "Noted. Thank you for letting us know — it's valuable for our organization.",
    "body.reminder": "We're expecting you!",
    "body.reminder.subtitle": "Your table is ready.",
    "body.reminder.intro": "We're busy in the kitchen: your table is ready!",
    "body.review": "Thank you for your visit!",
    "body.review.subtitle": "Your opinion matters to us.",
    "body.review.intro": "We hope you had a great time at our table. An online review helps us a lot.",
    "body.modified": "Reservation modified",
    "body.modified.subtitle": "Your reservation has been updated.",
    "body.modified.intro": "Here is your new summary.",
    "body.noshow": "We waited for you",
    "body.noshow.subtitle": "Your table remained empty.",
    "body.noshow.intro": "We were expecting you, but you didn't show up. Unexpected things happen, we understand.",
    "body.cancelled_by_restaurant": "We are sincerely sorry",
    "body.cancelled_by_restaurant.subtitle": "We must unfortunately cancel your reservation.",
    "body.cancelled_by_restaurant.intro": "This is the message we hate to write, but we unfortunately cannot welcome you as planned.",
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
    "subject.confirmed": "Reservierung bestätigt!",
    "subject.pending": "Anfrage erhalten (Validierung läuft ⏳)",
    "subject.validated": "Reservierung bestätigt!",
    "subject.refused": "Ihre Anfrage konnte nicht bestätigt werden",
    "subject.cancelled": "Stornierung bestätigt",
    "subject.modified": "Reservierung geändert",
    "subject.reminder": "Wir erwarten Sie bald!",
    "subject.noshow": "Wir haben auf Sie gewartet",
    "subject.review": "Vielen Dank für Ihren Besuch!",
    "subject.cancelled_by_restaurant": "Es tut uns aufrichtig leid...",
    "greeting": "Hallo",
    "body.confirmed": "Reservierung bestätigt!",
    "body.confirmed.subtitle": "Ihr Tisch ist reserviert.",
    "body.confirmed.intro": "Alles ist bereit, um Sie zu empfangen.",
    "body.pending": "Anfrage in Bearbeitung",
    "body.pending.subtitle": "Wir prüfen die Verfügbarkeit für Ihre Gruppe.",
    "body.pending.intro": "Um einen qualitativ hochwertigen Empfang zu gewährleisten, überprüft Allisson persönlich den Zeitplan.",
    "body.validated": "Reservierung bestätigt!",
    "body.validated.subtitle": "Ihr Tisch ist reserviert.",
    "body.validated.intro": "Alles ist bereit, um Sie zu empfangen.",
    "body.refused": "Anfrage nicht bestätigt",
    "body.refused.subtitle": "Wir melden uns bezüglich Ihrer Reservierung.",
    "body.refused.intro": "Wie vereinbart hat Allisson unseren Zeitplan persönlich überprüft. Leider sind wir zu dieser Zeit ausgebucht.",
    "body.cancelled": "Stornierung bestätigt",
    "body.cancelled.subtitle": "Ihre Reservierung wurde storniert.",
    "body.cancelled.intro": "Verstanden. Danke, dass Sie uns informiert haben — das ist wertvoll für unsere Organisation.",
    "body.reminder": "Wir erwarten Sie!",
    "body.reminder.subtitle": "Ihr Tisch ist bereit.",
    "body.reminder.intro": "Wir sind in der Küche beschäftigt: Ihr Tisch ist bereit!",
    "body.review": "Vielen Dank für Ihren Besuch!",
    "body.review.subtitle": "Ihre Meinung ist uns wichtig.",
    "body.review.intro": "Wir hoffen, Sie hatten eine tolle Zeit. Eine Online-Bewertung hilft uns sehr.",
    "body.modified": "Reservierung geändert",
    "body.modified.subtitle": "Ihre Reservierung wurde aktualisiert.",
    "body.modified.intro": "Hier ist Ihre neue Zusammenfassung.",
    "body.noshow": "Wir haben auf Sie gewartet",
    "body.noshow.subtitle": "Ihr Tisch blieb leer.",
    "body.noshow.intro": "Wir haben Sie erwartet, aber Sie sind nicht erschienen. Unvorhergesehenes passiert, wir verstehen das.",
    "body.cancelled_by_restaurant": "Es tut uns aufrichtig leid",
    "body.cancelled_by_restaurant.subtitle": "Wir müssen Ihre Reservierung leider stornieren.",
    "body.cancelled_by_restaurant.intro": "Dies ist die Nachricht, die wir hassen zu schreiben, aber wir können Sie leider nicht wie geplant empfangen.",
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
    "subject.confirmed": "Prenotazione confermata!",
    "subject.pending": "Richiesta ricevuta (Validazione in corso ⏳)",
    "subject.validated": "Prenotazione confermata!",
    "subject.refused": "La tua richiesta non ha potuto essere confermata",
    "subject.cancelled": "Cancellazione confermata",
    "subject.modified": "Prenotazione modificata",
    "subject.reminder": "Ti aspettiamo presto!",
    "subject.noshow": "Ti abbiamo aspettato",
    "subject.review": "Grazie per la tua visita!",
    "subject.cancelled_by_restaurant": "Siamo sinceramente dispiaciuti...",
    "greeting": "Ciao",
    "body.confirmed": "Prenotazione confermata!",
    "body.confirmed.subtitle": "Il tuo tavolo è riservato.",
    "body.confirmed.intro": "Tutto è pronto per accoglierti.",
    "body.pending": "Richiesta in attesa",
    "body.pending.subtitle": "Stiamo verificando la disponibilità per il tuo gruppo.",
    "body.pending.intro": "Per garantirti un'accoglienza di qualità, Allisson verifica personalmente il programma.",
    "body.validated": "Prenotazione confermata!",
    "body.validated.subtitle": "Il tuo tavolo è riservato.",
    "body.validated.intro": "Tutto è pronto per accoglierti.",
    "body.refused": "Richiesta non confermata",
    "body.refused.subtitle": "Ti ricontattiamo riguardo alla tua prenotazione.",
    "body.refused.intro": "Come concordato, Allisson ha verificato personalmente il nostro programma. Purtroppo siamo al completo.",
    "body.cancelled": "Cancellazione confermata",
    "body.cancelled.subtitle": "La tua prenotazione è stata cancellata.",
    "body.cancelled.intro": "Capito. Grazie per averci avvisato — è prezioso per la nostra organizzazione.",
    "body.reminder": "Ti aspettiamo!",
    "body.reminder.subtitle": "Il tuo tavolo è pronto.",
    "body.reminder.intro": "Siamo impegnati in cucina: il tuo tavolo è pronto!",
    "body.review": "Grazie per la tua visita!",
    "body.review.subtitle": "La tua opinione è importante per noi.",
    "body.review.intro": "Speriamo che tu abbia trascorso un bel momento. Una recensione online ci aiuta molto.",
    "body.modified": "Prenotazione modificata",
    "body.modified.subtitle": "La tua prenotazione è stata aggiornata.",
    "body.modified.intro": "Ecco il tuo nuovo riepilogo.",
    "body.noshow": "Ti abbiamo aspettato",
    "body.noshow.subtitle": "Il tuo tavolo è rimasto vuoto.",
    "body.noshow.intro": "Ti aspettavamo, ma non ti sei presentato. Gli imprevisti capitano, lo capiamo.",
    "body.cancelled_by_restaurant": "Siamo sinceramente dispiaciuti",
    "body.cancelled_by_restaurant.subtitle": "Dobbiamo purtroppo cancellare la tua prenotazione.",
    "body.cancelled_by_restaurant.intro": "Questo è il messaggio che odiamo scrivere, ma purtroppo non possiamo accoglierti come previsto.",
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
    case "reservation.modified":
      return "subject.modified";
    case "reservation.reminder":
      return "subject.reminder";
    case "reservation.noshow":
      return "subject.noshow";
    case "reservation.review":
      return "subject.review";
    case "reservation.cancelled_by_restaurant":
      return "subject.cancelled_by_restaurant";
    case "admin.notification":
      return "subject.pending"; // Not used for admin emails
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
    case "reservation.modified":
      return "body.modified";
    case "reservation.reminder":
      return "body.reminder";
    case "reservation.noshow":
      return "body.noshow";
    case "reservation.review":
      return "body.review";
    case "reservation.cancelled_by_restaurant":
      return "body.cancelled_by_restaurant";
    case "admin.notification":
      return "body.pending"; // Not used for admin emails
  }
}

const VALID_EMAIL_TYPES: EmailJobType[] = [
  "reservation.confirmed",
  "reservation.pending",
  "reservation.validated",
  "reservation.refused",
  "reservation.cancelled",
  "reservation.modified",
  "reservation.reminder",
  "reservation.noshow",
  "reservation.review",
  "reservation.cancelled_by_restaurant",
  "admin.notification",
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
 * Base64-encoded PNG icons for email templates
 * Using Data URIs for maximum email client compatibility (no external requests)
 */
const ICON_DATA = {
  // Header icons (32x32)
  checkGreen: "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA20lEQVR4nGNgGAWjYBTQGISGhjJrh+hP1A4x+KITqn9UI9BYkr6Wh+ov1Qk1+I/A+hMG0HID+jggFIfl2qEG92geBaHgODdYjMXnD/VC9RRHLR/cwa4RaCwJyqugPKsdajAZZDDZCS7E4L5mkKE8ST7RCdWfgJpq9ZficwRVLcfmAHyOoLrlIKAfqi8NMoCQI2hiOQxohRrLaYca3MVi+Ep7e3sWuuRzzSBDeVwhQTOfExsSdC3hNHGEBE19TnR00MNy3NFBh4oFWxaFlBP6E0BsDAWjYBSMgqEKACcHCQJrtxlyAAAAAElFTkSuQmCC",
  hourglassOrange: "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABGElEQVR4nO2XOw7CMAyG2VBsLsEl6DV6Bpi4EsXpDDtTy8g5uAKDLQaeSlMQQ4FAS40QljJU/W1/ip1Xp/ONtp10+2IxZYI5E6yYcC1Tsyi/nw6vxbX3hbmL5WIGAwhhIhZPjQ7CJBwgNTETclPJi1ipid8qh1yCWJiF+jjtxe+tpLf2BxD9EsDGdzEsg30Ilh4ANk0AZGUnH5lg9EzvNE5bAmT1ARIzYIs7XwY8PIIokls8lNqd860NUBG4EiJEU8vYwvCawE0x9cYh/z4OwW0lvzvVn5z2sE4PXyG/AcCaJWDNJmTNZciaG5GQiZhw//JW7HzIRLqHEUHe5HGcKx3HqH0hwT/AqfUSiPbDRLSfZlvtx2mbdgYe6wEvWOWezQAAAABJRU5ErkJggg==",
  xRed: "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA4ElEQVR4nO2WQQ7CIBREOQx/uEw3TTUu9OQFdvUU1mhorFGKLdR+WcgkLJowzCvwASGKioo+yEpZGaKza1bKRiTKENUv/irVLwzQGeA2NKKLBg6xXtfXeZ5+oPsOAPEQgfB1AFbKZjLQAkQw3H0T1WKNWqV2/oAa6FvgNAlXah/qa5U6rgpPgWALj4FgD1+AuBqgZw+fg/hZuAfx9tfjbLCHOw1r7k37CBCqjk2lAxsupkTZwrXbhN5ysEDomVJLOaw2DxcPsUHohENmcwib+zIyua9jk/tBYnM/yYqK/kZ3U4HI6j6aPWwAAAAASUVORK5CYII=",
  xGray: "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA40lEQVR4nO2WQQ7CIBBFOWA3TTUu9AQMmxn3MtxVT2GbGho1RrAtCLKQn7Bowuc/CgMIUVVV9UFAupHIF9sATRfsR9M+/aSbGIAzEI+2SeSrIt6t9dq+1vPw27G+AoAACDc8FgBN9z7QEoQvfPpG04oYyaPeeGbTK9QHN9xsfX0l8T4qPAQiW/gaiOzhcxASeQDiPnv4/J/4UfgrhDtrHgF5yB5uNa05aQfALoevOpJKeTfccolmC5d08m7C5BBqptRCDqvk4eKubBAq4JBJDgGlLyMofh1T+QdJU/RJVlX1N7oBdeX5AbXD1PsAAAAASUVORK5CYII=",
  bellBlue: "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA40lEQVR4nO1SOwrCQBQMWEVrL5JCL+AFLLyAv2JfAplNZfVeIFaSi1hZpfEGHkBv4Q1EeRE1EYWNoJUPBpZhZ5idfZ73YqJo2VW48m/HgAuFK18bQjokyxtjZUuQo0LPpoIqr3dVUzMxSdo3kBNZ3rsaGchBNSG4V0kjC7JyBnLf9WlA7qtGtRUjFiWblk2lEcv9Qog0UzKMedAEpBqk2SORlaJ0/wzFFxKh3pHr0HNHf6MfdmQgMyWN5bHz90Mm1z3i6d0oSVYdAu8aLyN4N59zuxZzNFq3KObAeRljDlRzM7gAacZT9xseSIYAAAAASUVORK5CYII=",
  starPurple: "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAACIUlEQVR4nJ1TO2tUYRC98W1hq8Qy2KQTtVUQ/AEipBFBsFjdmd3snVlWyzNZVtwtLLSzSGW08Bf4Ah+FFmpnSoOCif4AHwSMyvnuXrPZDbvgwIXvfjPfPM45k2VjrGa4IBar/HjO/sfm568fEot1sXimjuc8X2ni4MSHmuOYeLxTx5oYOlWDqMefdN/AUZ5rjqtqsagWP9Xxnr6RRGKxLIYV8bgnFht8KI5XWZZN8ROPJ/27H2K4zVg1vB3OM8UqDOBPtdGereU4cxHYVwYA2FVtto9X8s50msBwXy2+jI5mschqZeA4qzbas+yaEGxxXGr1DqhHna2zKu/q9Vt7xaJXYJaY6wHYQx+7Tfh5KEkpsjdxTj2+J4fFC47Qx6yXsDIspc/xWxxd+sxu7heP1wkzi/UkDfH4RFCliVNzcw92DoC/Kh53N0fHEu8GMNvB7ikNdXzOxPFVDA/FcGSIxbGJMjKZZFEmsrisjl9Fm3hcqdzZnRI5uhxHB0ZTixv0MUYNT8vR1HC+wCnHjFpcS2Dbwul/YDu65YrwXIKtOU6UAh1RO6lkZ6R2Ev2VvDNNqVAyI06KiyJL5xYOs2rJYDkOuy0LUbwUcV/5m0a5q8eHJH9WK9bhZckk8etjslGsEVa4VluSpERcTovltJBUuaGWcMgXTpLRfpJWH4I18Xiz7dIOG9Uuhm/UmHo8SvjlmJn4cDurOc6q4WPCr4nKuOC/JmdtdjHj1WAAAAAASUVORK5CYII=",
  // Detail icons (18x18)
  calendarGray: "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAABs0lEQVR4nLWTvWtUURDFt/GjTCGCNqmsg50RCVoIFhZaWlm5JjO7ec48F8tzdtfKFJIu9oIQwdgaUck/IFhJmiR2gkiKQCCCH8zdvN2byHNNkYEp7ryZ3z0zb26jcZw257gshnlx3mk6zlTxlvWmxHFlLADASTW+VOfvoRu/qXevx3dxvhjE8foucLoWpAaq45eUtKLARFJg+BiwUNZuL55SZyHGn+rs14LEuC6OV3msZb2pUBFtDvMcy2rYqgc5t8X5NI8VBSb22yyyCxfUuVPfmvONOL9E8SgGT6CiO12BxbChjve1oLb3LopxL2DqXBTjSpqZY3kww+5tdW6KY7cCj4FhNbVp/CxOxN/cV/dEnG9nDZcax26IHXLcVMdDNT7KXYz35ju9C1XubImzLcetZvPZiQMQKfuTavx0YBH/cvwQYyflG++nlYjWy/7kCGT8IM7voaiaR27awXk1PI/Ba4mrgxrcSFtvXEtJzQePzx3ek7rWxfFVHUvDC5ztpCxUSYmZOMxZ99q4OapxLd+fqBmAMDMEpcMYE+O78NFss9p4xWJo/fM1Z4X5hUep/W/7A3kjEEGTbhQ6AAAAAElFTkSuQmCC",
  clockGray: "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAABm0lEQVR4nJWUsVLCQBCGU4kvgDrjaK9Wii+go5XoK1hq7kjIbuz3EuUBaHwKa1sRXwC0QW2RVlsrnD8JGJIQhp1ZJrm5+9jd/79YVkm4bmvd9sMaEs/WMnEpsqpZWJN502zG6VQsr5rEc5x2pRSivHBPs/mMD0oHhzRLPcr4uRMBST4cX3bnQ0h+NMvQpuBosu44rSpy8t7w5ViR+cLeHCxuB5XI0ObbrZk/IHlEptewBzBF5n2mTeUbQsnpSv5B5gmZXW94cpLMrjldxGCLNpeBEIqlq8n0oxfIGpFJPGtJkIa6bMbXvqxZ2pPDqC0/OCsBvWdnh7C94Dw+G9Ys/CRy1wtBviFF5hepSe6v6G4zVdEFzjoc7i9sDYFqAImALA/Z1qb2iB1rnq0FoW5kI+0pTeZFsfRy8sNsi2CT0Byc5uSHqWB7mKxoqNlwXdnWLCPNMsjdO9gdtgcMZrNKK5GRYvNtN8Odwk2AQerkpncxTEiMVGR8zCRReDAXMoU57Up008n0Cz4jPcxERFZKIXloq6o9OUCm1SqKP+DlIqY4dRxaAAAAAElFTkSuQmCC",
  usersGray: "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAADAElEQVR4nN1WPWgUURBeMYL4X0hA0CSKSrQI1loE0gXUKkFu31xORU+wSGEhWp2gkMt7a2JA8C9YpbKzEEEQRbCwMlUkp8FoihQhBu52ZjcirMzd7u27y57cbsyBDjx4zJufb+bNzHuG8a9SrtdrU4B3ePG+5QCkwCsKyOPF+5Y6f5T1tkjA+SoAwHnmtQyANO3LgfNgWcK+1Mro5/zUu7z8LMy1JAsKnAvh3dMDBfQwvArn/IY6fzbobZYCZ/3of45knK58mjoU4GoZhMAvG9oREmhIu/fHGv9JlZ+m9IZEPmY6h/ToFTgHg3PeV3jls1mWZZ3YjqxzdECB08d9LQEtCfRcAn6qpjjs+6f1usyr7QxcZV3fhlWZG04f+1jjeNS0T0tBK/WtFbkEOhxhvQ3m8VkzNtgX+9TRT0YLclqxoAS9UEDjSuDVfNo91iiDfMYyFVnWwUJwNRG2J8MMpNwjStCiFuVXOVTq+Rt9XZ4bQ6Uethnap0X2WSNopd2jCmhBA/H2/qC3Y70AcllvmxT4SneuhHs8Ungk43QFU84vpHejF72dSZ0r8LZLga+1oL7dBefwH5XyaeqQAj9rd/V+Qni74jrn7EnAN/qDFVW8kZQXuL9cfGHRfBjPrOwxmiSWZR0tkwW2acShMWHvUwJntNaZaFaXZbW0z7CtWM4DkqZ9Yr0A2IaRlCyBZ6vvPWA2yW9JAZ5JDEAB3QwB0MmmAZh0SsvcjcQApMCpwFB9EVqp4l4l8BYv3kcUYdBFU+sAQNN+C30PeDwXJFBOCSxqhVZknj4zWMfPwHQi57lery34bilBL3MZb6sUdE0CLTV8ZICWWIZlWSf4tiX6pFgpt1sz/rFmTFecLUug6/5argOz4OtU6ifldscGoAQOREeJJSnwdn7wx+5AlvfM47MGT/hAbACS77n2+XQl0D0FpfaGoKHUzjLVqwuzlYufAcBhP+Jf5d+OSZ1N65rUyTqs68+C4dgAPMPbpEy7f827HYPK/wzT7mdbSW0Y/z39BrKHdtm77zKxAAAAAElFTkSuQmCC",
  messageCircleGray: "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAABfElEQVR4nJVUQVLCQBDMSf0AesK7elL8gJaeRL/g1ey4ITN5wExC8QBfBOIHQC6oV+SqP8CaTUqRZAlM1aQ2ldne6eneBMGaiKLeQZhkLU1dB9vEPfMeEBOgTIBksZyG+BWQY2ufdteCmDg7AZKPfCMPdBMQt13m64EDRH63CR/7QZC/gXgWYnrhO+wx4UuD8qm1JbCcjnbCs5C6zTr6IXWbCmZQ3v7RNImgtlzVCZBYgxyVOov5qphd568YZWJQ+lWngwfINUA8BJSxe1FZHTJyXEdpNZy6JIuHhPcDiPnc0UrSG19HQGKrvoVxepvvzVqBPgq521XFBqXvp813utdSdlpLzawHctSs7TXyYudYed4aCOXFEI9K8qvZNp0RUHpdkl9NpbZXk21iyCjiQyCeA/G0dO/U7mp7BVOz+UDAdcJzQ/IVdrKjyiIFU9sXN32ow1SJNQ1KojMpFJ56QZZpupuOMq74jYx0Jsy8U0d/BbTXgJjPNH8l9sQPXRYPk3KyrQUAAAAASUVORK5CYII=",
  settingsGray: "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAABgElEQVR4nL2TPS8EcRDGz0sIlVqBmpIgevEJVnEhIjmHmTu3M0uu4vnfqRUaIVHS+AAqEQUJSp2aiIQPoPGSuV2SvdfV3CRb/Se/fZ6ZZ1KpdtSaYJoDZFlckcStkF8e+xeAtTRH4h5Z3XfNJ+6GfUy0hJC6Eiu+SPGQEyzwFgYBdFKwO0yCHIl7IsUH+ZhvrMR3S/ZXEncEoKdeT6GAAVZcGWw9KI/XNGSz6CfFOwsuPO+sq5nqQgh7JsV1nbkgU1ETlKZa+k9Zv8tbfz7AaDXokBUvqYS1WsBIuABkYg8kOGfBbVIQgO6KA3XbcZC6U1t5UhBvYbCiKEA2/hCG7nNjA0NJQBS4RQPlBJNxkI+JMHBIt4Lk8/u9lrPIQUccpNi0INoQm0E876yLFMfWy1qarZWq7o4F938bEaSrba4rZlhxGSnfabBKO4sQ9ntXNjOymxPckuI1urU3m09duXZDUSZCmNm0mYkrsuAkisYBi1sW2etr6DsKF7eaT1vqB0344VpX5Vo2AAAAAElFTkSuQmCC",
  infoGray: "iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAABfElEQVR4nJVUQVLCQBDMSf0AesK7elL8gJaeRL/g1ey4ITN5wExC8QBfBOIHQC6oV+SqP8CaTUqRZAlM1aQ2ldne6eneBMGaiKLeQZhkLU1dB9vEPfMeEBOgTIBksZyG+BWQY2ufdteCmDg7AZKPfCMPdBMQt13m64EDRH63CR/7QZC/gXgWYnrhO+wx4UuD8qm1JbCcjnbCs5C6zTr6IXWbCmZQ3v7RNImgtlzVCZBYgxyVOov5qphd568YZWJQ+lWngwfINUA8BJSxe1FZHTJyXEdpNZy6JIuHhPcDiPnc0UrSG19HQGKrvoVxepvvzVqBPgq521XFBqXvp813utdSdlpLzawHctSs7TXyYudYed4aCOXFEI9K8qvZNp0RUHpdkl9NpbZXk21iyCjiQyCeA/G0dO/U7mp7BVOz+UDAdcJzQ/IVdrKjyiIFU9sXN32ow1SJNQ1KojMpFJ56QZZpupuOMq74jYx0Jsy8U0d/BbTXgJjPNH8l9sQPXRYPk3KyrQUAAAAASUVORK5CYII=",
};

/**
 * PNG icons for email templates using Data URIs (base64 encoded)
 * No external requests needed - maximum email client compatibility
 */
const EMAIL_ICONS = {
  // Header icons (32x32)
  check: `<img src="data:image/png;base64,${ICON_DATA.checkGreen}" alt="✓" width="32" height="32" style="display: block;" />`,
  pending: `<img src="data:image/png;base64,${ICON_DATA.hourglassOrange}" alt="⏳" width="32" height="32" style="display: block;" />`,
  validated: `<img src="data:image/png;base64,${ICON_DATA.checkGreen}" alt="✓" width="32" height="32" style="display: block;" />`,
  refused: `<img src="data:image/png;base64,${ICON_DATA.xRed}" alt="✗" width="32" height="32" style="display: block;" />`,
  cancelled: `<img src="data:image/png;base64,${ICON_DATA.xGray}" alt="✗" width="32" height="32" style="display: block;" />`,
  reminder: `<img src="data:image/png;base64,${ICON_DATA.bellBlue}" alt="🔔" width="32" height="32" style="display: block;" />`,
  review: `<img src="data:image/png;base64,${ICON_DATA.starPurple}" alt="⭐" width="32" height="32" style="display: block;" />`,
  // Detail icons (18x18)
  calendar: `<img src="data:image/png;base64,${ICON_DATA.calendarGray}" alt="📅" width="18" height="18" style="display: block;" />`,
  clock: `<img src="data:image/png;base64,${ICON_DATA.clockGray}" alt="🕐" width="18" height="18" style="display: block;" />`,
  users: `<img src="data:image/png;base64,${ICON_DATA.usersGray}" alt="👥" width="18" height="18" style="display: block;" />`,
  message: `<img src="data:image/png;base64,${ICON_DATA.messageCircleGray}" alt="💬" width="18" height="18" style="display: block;" />`,
  options: `<img src="data:image/png;base64,${ICON_DATA.settingsGray}" alt="⚙️" width="18" height="18" style="display: block;" />`,
  reason: `<img src="data:image/png;base64,${ICON_DATA.infoGray}" alt="ℹ️" width="18" height="18" style="display: block;" />`,
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
    case "reservation.modified":
      return { icon: EMAIL_ICONS.check, bgColor: "#dbeafe", iconBgColor: "#dbeafe" };
    case "reservation.reminder":
      return { icon: EMAIL_ICONS.reminder, bgColor: "#dbeafe", iconBgColor: "#dbeafe" };
    case "reservation.noshow":
      return { icon: EMAIL_ICONS.cancelled, bgColor: "#f3f4f6", iconBgColor: "#f3f4f6" };
    case "reservation.review":
      return { icon: EMAIL_ICONS.review, bgColor: "#ede9fe", iconBgColor: "#ede9fe" };
    case "reservation.cancelled_by_restaurant":
      return { icon: EMAIL_ICONS.refused, bgColor: "#fee2e2", iconBgColor: "#fee2e2" };
    case "admin.notification":
      return { icon: EMAIL_ICONS.pending, bgColor: "#fef3c7", iconBgColor: "#fef3c7" };
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
    case "reservation.modified": return "body.modified";
    case "reservation.reminder": return "body.reminder";
    case "reservation.noshow": return "body.noshow";
    case "reservation.review": return "body.review";
    case "reservation.cancelled_by_restaurant": return "body.cancelled_by_restaurant";
    case "admin.notification": return "body.pending";
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
    case "reservation.modified": return "body.modified.subtitle";
    case "reservation.reminder": return "body.reminder.subtitle";
    case "reservation.noshow": return "body.noshow.subtitle";
    case "reservation.review": return "body.review.subtitle";
    case "reservation.cancelled_by_restaurant": return "body.cancelled_by_restaurant.subtitle";
    case "admin.notification": return "body.pending.subtitle";
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
    case "reservation.modified": return "body.modified.intro";
    case "reservation.reminder": return "body.reminder.intro";
    case "reservation.noshow": return "body.noshow.intro";
    case "reservation.review": return "body.review.intro";
    case "reservation.cancelled_by_restaurant": return "body.cancelled_by_restaurant.intro";
    case "admin.notification": return "body.pending.intro";
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
 * Render admin notification email template.
 * Simple French-only template for admin notifications.
 */
function renderAdminNotificationTemplate(data: TemplateData & { adminUrl?: string }): string {
  const safeFirstName = escapeHtml(data.firstName);
  const safeLastName = escapeHtml(data.lastName);
  const formattedDate = formatDateForDisplay(data.dateKey, "fr");
  const serviceLabel = data.service === "lunch" ? "Déjeuner" : "Dîner";
  const adminUrl = data.adminUrl ?? "#";
  const safeNote = data.note ? escapeHtml(data.note) : "";
  const hasNote = safeNote.length > 0;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle réservation en attente</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6;">
  <div style="background-color: #f3f4f6; padding: 40px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
            
            <!-- Header -->
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center; background-color: #fef3c7; border-bottom: 1px solid #fcd34d;">
                <div style="display: inline-block; background-color: #ffffff; border-radius: 50%; padding: 12px; margin-bottom: 15px;">
                  ${EMAIL_ICONS.pending}
                </div>
                <h1 style="color: #92400e; margin: 0; font-size: 20px; font-weight: 700;">Nouvelle réservation en attente</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 30px;">
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">
                  Une nouvelle réservation nécessite votre validation :
                </p>

                <!-- Détails -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 15px;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                        <strong style="color: #111827;">Client :</strong> ${safeFirstName} ${safeLastName}
                      </p>
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                        <strong style="color: #111827;">Date :</strong> ${formattedDate}
                      </p>
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                        <strong style="color: #111827;">Heure :</strong> ${escapeHtml(data.timeKey)} (${serviceLabel})
                      </p>
                      <p style="margin: 0${hasNote ? " 0 8px 0" : ""}; font-size: 14px; color: #6b7280;">
                        <strong style="color: #111827;">Couverts :</strong> ${data.partySize} personnes
                      </p>${hasNote ? `
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong style="color: #111827;">Note :</strong> <em>"${safeNote}"</em>
                      </p>` : ""}
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background-color: #2c5530; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        Voir dans l'admin
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                  La Moulinière — Notification automatique
                </p>
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

  // Special handling for admin notification (French only, different template)
  if (emailType === "admin.notification") {
    return {
      subject: `🔔 Nouvelle réservation en attente — ${data.firstName} ${data.lastName} (${data.partySize} pers.)`,
      html: renderAdminNotificationTemplate(data as TemplateData & { adminUrl?: string }),
    };
  }

  const effectiveLocale = translations[locale] ? locale : FALLBACK_LOCALE;
  const subject = t(effectiveLocale, getSubjectKey(emailType));

  // Use modern template for all other email types
  return {
    subject,
    html: renderModernTemplate(emailType, effectiveLocale, data),
  };
}
