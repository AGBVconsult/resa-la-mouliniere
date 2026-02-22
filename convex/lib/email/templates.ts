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
  language?: "fr" | "nl" | "en" | "de" | "it" | "es";
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
  | "footer.signature"
  | "footer.signature.negative"
  | "footer.signature.review"
  | "payment.title"
  | "payment.text"
  | "address"
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
    "body.confirmed.intro": "Votre table est réservée. Tout est prêt pour vous recevoir.",
    "body.pending": "Demande bien reçue",
    "body.pending.subtitle": "Nous vérifions la disponibilité pour votre groupe.",
    "body.pending.intro": "Nous avons bien reçu votre demande. Pour vous garantir un accueil soigné, et comme nous travaillons en duo, Allisson vérifie personnellement le planning avant de confirmer votre réservation. Vous recevrez un email de confirmation dès que possible.",
    "body.validated": "Réservation confirmée !",
    "body.validated.subtitle": "Votre table est réservée.",
    "body.validated.intro": "Tout est prêt pour vous recevoir.",
    "body.refused": "Demande non confirmée",
    "body.refused.subtitle": "Nous revenons vers vous concernant votre réservation.",
    "body.refused.intro": "Comme convenu, Allisson a vérifié personnellement notre planning. Malheureusement, nous sommes complets à cet horaire et la configuration de la salle ne nous permet pas de vous installer confortablement.",
    "body.cancelled": "Annulation confirmée",
    "body.cancelled.subtitle": "Votre réservation a bien été annulée.",
    "body.cancelled.intro": "C'est bien noté : votre réservation est annulée. Merci de nous avoir prévenus — c'est précieux pour notre organisation.",
    "body.reminder": "On vous attend tout à l'heure !",
    "body.reminder.subtitle": "Votre table est prête.",
    "body.reminder.intro": "On s'active en cuisine : votre table est prête ! Un empêchement de dernière minute ? Pour nous éviter une table vide, un petit clic pour annuler nous aide beaucoup.",
    "body.review": "Merci pour votre visite !",
    "body.review.subtitle": "Votre avis compte pour nous.",
    "body.review.intro": "Nous espérons que vous avez passé un bon moment à notre table. Si c'est le cas, un petit avis en ligne nous aide énormément.",
    "body.modified": "Réservation modifiée",
    "body.modified.subtitle": "Votre réservation a bien été mise à jour.",
    "body.modified.intro": "Voici votre nouveau récapitulatif.",
    "body.noshow": "On vous a attendu(e)",
    "body.noshow.subtitle": "Votre table est restée vide.",
    "body.noshow.intro": "Nous vous attendions, mais vous ne vous êtes pas présenté(e). Les imprévus font partie de la vie, nous le comprenons. Cependant, pour un duo comme le nôtre, chaque table compte. À l'avenir, un simple clic sur le lien « Annuler » de votre email de confirmation nous permet de libérer la place pour d'autres clients.",
    "body.cancelled_by_restaurant": "Nous sommes sincèrement désolés",
    "body.cancelled_by_restaurant.subtitle": "Nous devons malheureusement annuler votre réservation.",
    "body.cancelled_by_restaurant.intro": "C'est le message que nous détestons écrire, mais nous ne pourrons malheureusement pas vous accueillir comme prévu. Travaillant en duo, nous sommes contraints d'annuler votre réservation pour cause de force majeure (problème technique ou santé). Nous savons que cela perturbe vos plans et nous vous présentons nos plus plates excuses.",
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
    "footer": "Allisson & Benjamin",
    "footer.signature": "On se réjouit de vous accueillir,",
    "footer.signature.negative": "Bien à vous,",
    "footer.signature.review": "Au plaisir de vous accueillir à nouveau,",
    "payment.title": "Bon à savoir pour le règlement :",
    "payment.text": "Nous n'avons pas de terminal bancaire. Pour un règlement simple et rapide, nous utilisons Payconiq (comptes belges), vous pouvez aussi payer en espèces.",
    "address": "Visserskaai 17, 8400 Oostende",
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
    "body.review.intro": "We hopen dat u een fijne tijd aan onze tafel heeft gehad. Als dat het geval is, helpt een online review ons enorm.",
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
    "footer": "Allisson & Benjamin",
    "footer.signature": "We kijken ernaar uit u te verwelkomen,",
    "footer.signature.negative": "Met vriendelijke groeten,",
    "footer.signature.review": "We hopen u snel weer te mogen verwelkomen,",
    "payment.title": "Goed om te weten voor de betaling:",
    "payment.text": "We hebben geen betaalterminal. Voor een snelle en eenvoudige betaling gebruiken we Payconiq (Belgische rekeningen), u kunt ook contant betalen.",
    "address": "Visserskaai 17, 8400 Oostende",
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
    "body.review.intro": "We hope you had a great time at our table. If so, an online review helps us tremendously.",
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
    "footer": "Allisson & Benjamin",
    "footer.signature": "We look forward to welcoming you,",
    "footer.signature.negative": "Best regards,",
    "footer.signature.review": "We hope to welcome you again soon,",
    "payment.title": "Good to know for payment:",
    "payment.text": "We don't have a card terminal. For quick and easy payment, we use Payconiq (Belgian accounts), you can also pay in cash.",
    "address": "Visserskaai 17, 8400 Oostende",
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
    "body.review.intro": "Wir hoffen, Sie hatten eine tolle Zeit an unserem Tisch. Wenn ja, hilft uns eine Online-Bewertung sehr.",
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
    "footer": "Allisson & Benjamin",
    "footer.signature": "Wir freuen uns, Sie zu begrüßen,",
    "footer.signature.negative": "Mit freundlichen Grüßen,",
    "footer.signature.review": "Wir hoffen, Sie bald wieder begrüßen zu dürfen,",
    "payment.title": "Gut zu wissen für die Zahlung:",
    "payment.text": "Wir haben kein Kartenterminal. Für eine schnelle und einfache Zahlung nutzen wir Payconiq (belgische Konten), Sie können auch bar bezahlen.",
    "address": "Visserskaai 17, 8400 Oostende",
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
    "body.review.intro": "Speriamo che tu abbia trascorso un bel momento al nostro tavolo. Se è così, una recensione online ci aiuta tantissimo.",
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
    "footer": "Allisson & Benjamin",
    "footer.signature": "Non vediamo l'ora di accoglierti,",
    "footer.signature.negative": "Cordiali saluti,",
    "footer.signature.review": "Speriamo di accoglierti di nuovo presto,",
    "payment.title": "Buono a sapersi per il pagamento:",
    "payment.text": "Non abbiamo un terminale per carte. Per un pagamento rapido e semplice, utilizziamo Payconiq (conti belgi), puoi anche pagare in contanti.",
    "address": "Visserskaai 17, 8400 Oostende",
    "reason": "Motivo",
  },
  es: {
    "subject.confirmed": "¡Reserva confirmada!",
    "subject.pending": "Solicitud recibida (Validación en curso ⏳)",
    "subject.validated": "¡Reserva confirmada!",
    "subject.refused": "Su solicitud no ha podido ser confirmada",
    "subject.cancelled": "Cancelación confirmada",
    "subject.modified": "Reserva modificada",
    "subject.reminder": "¡Le esperamos pronto!",
    "subject.noshow": "Le estuvimos esperando",
    "subject.review": "¡Gracias por su visita!",
    "subject.cancelled_by_restaurant": "Lo sentimos sinceramente...",
    "greeting": "Hola",
    "body.confirmed": "¡Reserva confirmada!",
    "body.confirmed.subtitle": "Su mesa está reservada.",
    "body.confirmed.intro": "Todo está listo para recibirle.",
    "body.pending": "Solicitud en trámite",
    "body.pending.subtitle": "Estamos verificando la disponibilidad para su grupo.",
    "body.pending.intro": "Para garantizarle una acogida de calidad, Allisson verifica personalmente la planificación antes de confirmar su reserva.",
    "body.validated": "¡Reserva confirmada!",
    "body.validated.subtitle": "Su mesa está reservada.",
    "body.validated.intro": "Todo está listo para recibirle.",
    "body.refused": "Solicitud no confirmada",
    "body.refused.subtitle": "Nos ponemos en contacto con usted respecto a su reserva.",
    "body.refused.intro": "Como acordado, Allisson ha verificado personalmente nuestra planificación. Lamentablemente, estamos completos a esa hora.",
    "body.cancelled": "Cancelación confirmada",
    "body.cancelled.subtitle": "Su reserva ha sido cancelada.",
    "body.cancelled.intro": "Entendido. Gracias por avisarnos — es muy valioso para nuestra organización.",
    "body.reminder": "¡Le esperamos!",
    "body.reminder.subtitle": "Su mesa está lista.",
    "body.reminder.intro": "Estamos trabajando en la cocina: ¡su mesa está lista!",
    "body.review": "¡Gracias por su visita!",
    "body.review.subtitle": "Su opinión es importante para nosotros.",
    "body.review.intro": "Esperamos que haya pasado un buen momento en nuestra mesa. Si es así, una reseña en línea nos ayuda enormemente.",
    "body.modified": "Reserva modificada",
    "body.modified.subtitle": "Su reserva ha sido actualizada.",
    "body.modified.intro": "Aquí tiene su nuevo resumen.",
    "body.noshow": "Le estuvimos esperando",
    "body.noshow.subtitle": "Su mesa quedó vacía.",
    "body.noshow.intro": "Le estábamos esperando, pero no se presentó. Los imprevistos ocurren, lo entendemos.",
    "body.cancelled_by_restaurant": "Lo sentimos sinceramente",
    "body.cancelled_by_restaurant.subtitle": "Lamentablemente debemos cancelar su reserva.",
    "body.cancelled_by_restaurant.intro": "Este es el mensaje que odiamos escribir, pero lamentablemente no podemos recibirle como estaba previsto.",
    "details.date": "Fecha",
    "details.time": "Hora",
    "details.guests": "personas",
    "details.adults": "Adultos",
    "details.children": "Niño",
    "details.babies": "Bebé",
    "manage.link": "Gestionar mi reserva",
    "edit.link": "Modificar mi reserva",
    "cancel.link": "Cancelar mi reserva",
    "review.link": "Dejar una reseña",
    "footer": "Allisson & Benjamin",
    "footer.signature": "Nos alegramos de recibirle,",
    "footer.signature.negative": "Atentamente,",
    "footer.signature.review": "Esperamos poder recibirle de nuevo pronto,",
    "payment.title": "Bueno saberlo para el pago:",
    "payment.text": "No tenemos terminal de tarjetas. Para un pago rápido y sencillo, utilizamos Payconiq (cuentas belgas), también puede pagar en efectivo.",
    "address": "Visserskaai 17, 8400 Oostende",
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
    es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  };
  
  const months: Record<Language, string[]> = {
    fr: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
    nl: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    it: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
    es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
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
  es: { highChair: "Trona", dogAccess: "Perro", wheelchair: "Silla de ruedas" },
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
 * Get colors for each email type (icons removed)
 */
function getEmailTypeConfig(type: EmailJobType): { bgColor: string } {
  switch (type) {
    case "reservation.confirmed":
    case "reservation.validated":
      return { bgColor: "#dcfce7" };
    case "reservation.pending":
    case "admin.notification":
      return { bgColor: "#fef3c7" };
    case "reservation.refused":
    case "reservation.cancelled_by_restaurant":
      return { bgColor: "#fee2e2" };
    case "reservation.cancelled":
    case "reservation.noshow":
      return { bgColor: "#f3f4f6" };
    case "reservation.modified":
    case "reservation.reminder":
      return { bgColor: "#dbeafe" };
    case "reservation.review":
      return { bgColor: "#ede9fe" };
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
  const footerSignature = t(locale, "footer.signature");
  const paymentTitle = t(locale, "payment.title");
  const paymentText = t(locale, "payment.text");
  const address = t(locale, "address");
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
  // Show payment info for confirmed, validated, reminder, modified emails
  const showPayment = type === "reservation.confirmed" || type === "reservation.validated" || type === "reservation.reminder" || type === "reservation.modified";
  // Show address only for positive emails (not for noshow, refused, cancelled_by_restaurant, cancelled)
  const showAddress = type === "reservation.confirmed" || type === "reservation.validated" || type === "reservation.reminder" || type === "reservation.modified" || type === "reservation.pending";
  // Different signatures for different email types
  const isNegativeEmail = type === "reservation.noshow" || type === "reservation.refused" || type === "reservation.cancelled_by_restaurant" || type === "reservation.cancelled";
  const isReviewEmail = type === "reservation.review";
  const signatureText = isReviewEmail 
    ? t(locale, "footer.signature.review") 
    : isNegativeEmail 
      ? t(locale, "footer.signature.negative") 
      : footerSignature;

  // Build details section HTML
  let detailsHtml = "";
  if (showDetails) {
    const addressRow = showAddress ? `
                  <!-- Adresse -->
                  <tr>
                    <td style="padding: 16px 20px;">
                      <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">• Adresse : <strong>${address}</strong></span>
                    </td>
                  </tr>` : "";
    
    detailsHtml = `
                <!-- Carte Détails -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; margin-bottom: 20px;">
                  <!-- Date -->
                  <tr>
                    <td style="padding: 16px 20px; border-bottom: 1px dashed #e5e7eb;">
                      <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">• Date : <strong>${formattedDate}</strong></span>
                    </td>
                  </tr>
                  <!-- Heure -->
                  <tr>
                    <td style="padding: 16px 20px;${showAddress ? " border-bottom: 1px dashed #e5e7eb;" : ""}">
                      <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #111827;">• Heure : <strong>${escapeHtml(data.timeKey)}</strong></span>
                    </td>
                  </tr>${addressRow}
                </table>`;
  }
  
  // Build payment section HTML
  let paymentHtml = "";
  if (showPayment) {
    paymentHtml = `
                <!-- Section Paiement -->
                <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                  <p style="margin: 0 0 8px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #92400e;">💳 ${paymentTitle}</p>
                  <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #78350f; line-height: 1.5;">${paymentText}</p>
                </div>`;
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
                      <a href="https://g.page/r/CWTZKcbsJS1JEAE/review" class="btn" style="display: block; background-color: #8b5cf6; color: #ffffff; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; font-size: 15px; text-align: center; border: 1px solid #8b5cf6;">${reviewLabel}</a>
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
            
            <!-- Header -->
            <tr>
              <td style="padding: 40px 30px 10px 30px; text-align: center; background-color: #ffffff;">
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
                ${paymentHtml}
                ${actionsHtml}

                <p style="text-align: center; margin-top: 30px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">${signatureText}<br><strong>${footer}</strong></p>

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
