# PRD-008 : Système d'Emails

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-008 |
| **Titre** | Système d'Emails Transactionnels |
| **Statut** | ✅ **Validé - Prêt pour implémentation** |
| **Priorité** | P0 - Critique |
| **Version** | 1.3 |
| **Date création** | 2025-12-21 |
| **Dernière MAJ** | 2025-12-21 |
| **Responsable** | AGBVconsult |
| **Dépendances** | PRD-001 (Widget), PRD-012 (Settings) |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-21 | Création initiale — 10 types d'emails, Resend, templates HTML riches |
| 1.1 | 2025-12-21 | Corrections P0 : Outbox pattern, cron timezone, idempotency, unsubscribe, ICS |
| 1.2 | 2025-12-21 | Corrections finales : Idempotence via option Resend, ICS base64 + SEQUENCE |
| 1.3 | 2025-12-21 | **Validation finale** : Payload figé dans job, parsing timezone correct, cron retry explicite, promesse SLA adoucie |

---

## Table des Matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Architecture Technique](#2-architecture-technique)
3. [Catalogue des Emails](#3-catalogue-des-emails)
4. [Templates & Design](#4-templates--design)
5. [Contenu par Email](#5-contenu-par-email)
6. [Internationalisation](#6-internationalisation)
7. [Outbox Pattern & Retry](#7-outbox-pattern--retry)
8. [Crons & Scheduling](#8-crons--scheduling)
9. [Notifications Admin](#9-notifications-admin)
10. [Opt-Out & Unsubscribe](#10-opt-out--unsubscribe)
11. [Génération ICS](#11-génération-ics)
12. [Configuration (PRD-012)](#12-configuration-prd-012)
13. [Schémas de Données](#13-schémas-de-données)
14. [Intégration Resend](#14-intégration-resend)
15. [Tests & Monitoring](#15-tests--monitoring)
16. [Écarts à Implémenter](#16-écarts-à-implémenter)

---

## 1. Résumé Exécutif

### 1.1 Objectif

Fournir un système d'emails transactionnels fiable et multilingue pour accompagner le parcours client : confirmation, rappels, modifications, annulations, et demande d'avis.

### 1.2 Décisions Clés

| Décision | Choix | Justification |
|----------|-------|---------------|
| Fournisseur | **Resend** | Moderne, bon DX, templates React |
| Expéditeur | `La Moulinière <noreply@lamouliniere.be>` | Professionnel, domaine vérifié |
| Reply-To | `info@lamouliniere.be` | Réponses vers boîte principale |
| Style | HTML riche + plain-text fallback | Branding + délivrabilité |
| Langue | `reservation.language` | Cohérent avec widget |
| Avis | Google (@gmail/@googlemail) / TripAdvisor (autre) | Maximiser les reviews |
| Pattern envoi | **Outbox + payload figé** | Fiabilité + idempotence Resend |
| Cron | **Horaire (scheduled) + Minute (retry)** | DST correct + retry fiable |
| Calendrier | **ICS base64 + SEQUENCE** | Compatibilité + mise à jour |
| Modification | **Pas de deadline** | Client peut modifier jusqu'au service |
| Idempotence | **Option Resend + payload identique** | Éviter 409 sur retry |

### 1.3 Emails Implémentés (P0)

| # | Email | Trigger | ICS |
|---|-------|---------|:---:|
| 1 | Confirmation réservation | `status: confirmed` | ✅ |
| 2 | En attente de validation | `status: pending` | ❌ |
| 3 | Validation admin | `pending → confirmed` | ✅ |
| 4 | Refus admin | `pending → refused` | ❌ |
| 5 | Annulation client | `→ cancelled` (via token) | ❌ |
| 6 | Annulation admin | `→ cancelled` (par admin) | ❌ |
| 7 | Rappel J-1 | Cron 24h avant service | ❌ |
| 8 | Demande d'avis | J+1 après `completed` | ❌ |
| 9 | Accusé grand groupe | `groupRequest` créée | ❌ |
| 10 | Modification confirmée | Après `modifyReservation` | ✅ |

---

## 2. Architecture Technique

### 2.1 Stack avec Outbox Pattern (Payload Figé)

```
┌─────────────────────────────────────────────────────────────────┐
│                 ARCHITECTURE EMAILS (OUTBOX)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Convex    │     │  emailJobs  │     │   Resend    │       │
│  │  Mutations  │────▶│  (payload   │────▶│     API     │       │
│  │             │     │   figé)     │     │             │       │
│  └─────────────┘     └──────┬──────┘     └─────────────┘       │
│                             │                                   │
│  Principe clé:              │                                   │
│  ─────────────              │                                   │
│  À la création du job,      │                                   │
│  on stocke TOUT le payload: │                                   │
│  • html (rendu React)       │                                   │
│  • text (plain-text)        │                                   │
│  • icsContentBase64         │                                   │
│  • subject                  │                                   │
│                             │                                   │
│  L'action d'envoi ne fait   │                                   │
│  que "send" sans recalcul.  │                                   │
│                             │                                   │
│  ➡️ Garantit payload        │                                   │
│     identique sur retry     │                                   │
│     (évite 409 Resend)      │                                   │
│                             │                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Configuration Expéditeur

```typescript
const EMAIL_CONFIG = {
  from: "La Moulinière <noreply@lamouliniere.be>",
  replyTo: "info@lamouliniere.be",
  
  baseHeaders: {
    "X-Entity-Ref-ID": "lamouliniere",
  },
};
```

### 2.3 Domaine & DNS

| Type | Nom | Valeur | But |
|------|-----|--------|-----|
| TXT | `@` | `v=spf1 include:resend.com ~all` | SPF |
| CNAME | `resend._domainkey` | `[provided by Resend]` | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:...` | DMARC |

---

## 3. Catalogue des Emails

| ID | Nom Technique | Sujet (FR) | ICS | Unsubscribe |
|----|---------------|------------|:---:|:-----------:|
| `confirmation` | `reservation_confirmed` | ✓ Votre réservation est confirmée | ✅ | ❌ |
| `pending` | `reservation_pending` | 🕐 Votre demande est en attente | ❌ | ❌ |
| `validated` | `reservation_validated` | ✓ Bonne nouvelle ! Confirmée | ✅ | ❌ |
| `refused` | `reservation_refused` | Concernant votre demande | ❌ | ❌ |
| `cancelled_client` | `reservation_cancelled_client` | Annulation confirmée | ❌ | ❌ |
| `cancelled_admin` | `reservation_cancelled_admin` | Information importante | ❌ | ❌ |
| `reminder` | `reservation_reminder` | 📅 Rappel : votre table demain | ❌ | ❌ |
| `review` | `review_request` | ⭐ Votre avis compte ! | ❌ | ✅ |
| `group_ack` | `group_request_ack` | Demande grand groupe reçue | ❌ | ❌ |
| `modified` | `reservation_modified` | ✓ Modification confirmée | ✅ | ❌ |

---

## 4. Templates & Design

### 4.1 Design System

| Élément | Valeur |
|---------|--------|
| Primary | #1E3A5F (bleu marine) |
| Secondary | #D4AF37 (or) |
| Success | #2E7D32 (vert) |
| Warning | #F9A825 (ambre) |
| Error | #C62828 (rouge) |
| Headings | Georgia, serif |
| Body | Arial, Helvetica, sans-serif |

### 4.2 Structure

```
HEADER: Logo + tagline
HERO: Icône + titre + sous-titre
RESERVATION CARD: Date, heure, convives, options
ACTIONS: Boutons (calendrier, modifier, annuler)
INFOS: Adresse, téléphone, Google Maps
FOOTER: Réseaux sociaux, copyright, (unsubscribe si review)
ATTACHMENT: reservation.ics (si applicable)
```

---

## 5. Contenu par Email

### 5.1 En Attente de Validation (`reservation_pending`)

**Texte promesse** (adouci) :

```
Pour les groupes de {partySize} personnes, nous vérifions 
manuellement la disponibilité. Nous vous répondrons 
dans les plus brefs délais.
```

**Note** : Pas de promesse "sous 24h" car pas de SLA automatique.

---

### 5.2 Demande d'Avis (`review_request`)

**Logique plateforme** (corrigée) :

```typescript
function isGoogleUser(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return (
    normalizedEmail.endsWith("@gmail.com") ||
    normalizedEmail.endsWith("@googlemail.com")
  );
}

function getReviewPlatform(email: string): "google" | "tripadvisor" {
  return isGoogleUser(email) ? "google" : "tripadvisor";
}
```

---

## 6. Internationalisation

### 6.1 Langues Supportées

| Code | Langue |
|------|--------|
| `fr` | Français |
| `nl` | Néerlandais |
| `en` | Anglais |
| `de` | Allemand |
| `it` | Italien |

### 6.2 Format Dates (Timezone Brussels)

```typescript
import { formatInTimeZone } from "date-fns-tz";
import { fr, nl, enUS, de, it } from "date-fns/locale";

const RESTAURANT_TIMEZONE = "Europe/Brussels";

function formatDateLocalized(date: Date, locale: Locale): string {
  const patterns: Record<Locale, string> = {
    fr: "EEEE d MMMM yyyy",
    nl: "EEEE d MMMM yyyy",
    en: "EEEE, MMMM d, yyyy",
    de: "EEEE, d. MMMM yyyy",
    it: "EEEE d MMMM yyyy",
  };
  
  return formatInTimeZone(
    date, 
    RESTAURANT_TIMEZONE, 
    patterns[locale], 
    { locale: localeMap[locale] }
  );
}
```

---

## 7. Outbox Pattern & Retry

### 7.1 Principe : Payload Figé

**Règle critique** : Resend rejette une même `idempotencyKey` si le payload diffère (HTTP 409).

**Solution** : Stocker le payload complet dans `emailJobs` à la création :

```typescript
// À la création du job (dans mutation métier)
const htmlContent = await renderToString(
  EmailTemplate({ ...templateData })
);
const textContent = renderTextVersion(templateData);
const icsBase64 = reservation ? generateICSBase64(reservation) : undefined;

await ctx.db.insert("emailJobs", {
  // ... autres champs
  
  // ⚠️ PAYLOAD FIGÉ - ne recalcule RIEN à l'envoi
  htmlContent,           // HTML pré-rendu
  textContent,           // Plain-text pré-rendu
  icsContentBase64,      // ICS pré-encodé
  subject,               // Sujet pré-interpolé
  
  // Pas de templateData volatile (dates "now", etc.)
});
```

### 7.2 Action d'Envoi (Sans Recalcul)

```typescript
export const processEmailJob = action({
  args: { jobId: v.id("emailJobs") },
  handler: async (ctx, { jobId }) => {
    // 1. Garde-fou exclusivité
    const { canProcess } = await ctx.runMutation(
      internal.emails.startProcessingJob, 
      { jobId }
    );
    if (!canProcess) return;
    
    const job = await ctx.runQuery(internal.emails.getJob, { jobId });
    if (!job) return;
    
    try {
      // 2. Envoyer avec payload DÉJÀ FIGÉ (pas de recalcul)
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: job.to,
        subject: job.subject,           // Figé
        html: job.htmlContent,          // Figé
        text: job.textContent,          // Figé
        replyTo: EMAIL_CONFIG.replyTo,
        headers: job.headers,           // Figé
        attachments: job.icsContentBase64 ? [{
          filename: "reservation.ics",
          content: job.icsContentBase64,
          contentType: "text/calendar",
        }] : undefined,
      }, {
        idempotencyKey: job.idempotencyKey,
      });
      
      // 3. Succès
      await ctx.runMutation(internal.emails.markJobSent, {
        jobId,
        resendId: result.id,
      });
      
      if (job.reservationId && job.sentAtField) {
        await ctx.runMutation(internal.reservations.markEmailSent, {
          reservationId: job.reservationId,
          field: job.sentAtField,
        });
      }
      
    } catch (error) {
      await ctx.runMutation(internal.emails.handleJobFailure, {
        jobId,
        errorMessage: String(error),
      });
    }
  },
});
```

### 7.3 Garde-Fou Exclusivité

```typescript
export const startProcessingJob = mutation({
  args: { jobId: v.id("emailJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    
    if (!job || job.status !== "queued") {
      return { canProcess: false };
    }
    
    if (job.nextRetryAt && job.nextRetryAt > Date.now()) {
      return { canProcess: false };
    }
    
    await ctx.db.patch(jobId, { 
      status: "sending",
      lastAttemptAt: Date.now(),
    });
    
    return { canProcess: true };
  },
});
```

### 7.4 Configuration Retry

```typescript
const RETRY_CONFIG = {
  maxAttempts: 5,
  
  getNextRetryDelay: (attempt: number): number => {
    const delays = [
      1 * 60 * 1000,      // 1 minute
      5 * 60 * 1000,      // 5 minutes
      15 * 60 * 1000,     // 15 minutes
      60 * 60 * 1000,     // 1 heure
      4 * 60 * 60 * 1000, // 4 heures
    ];
    return delays[Math.min(attempt, delays.length - 1)];
  },
};
```

---

## 8. Crons & Scheduling

### 8.1 Deux Crons Distincts

```typescript
// crons.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();

// ═══ CRON 1: Emails Programmés (horaire) ═══
// Rappels J-1 et demandes d'avis J+1
crons.hourly(
  "process-scheduled-emails",
  { minuteUTC: 0 },
  internal.emails.processScheduledEmails
);

// ═══ CRON 2: Retry Jobs en Échec (toutes les minutes) ═══
crons.interval(
  "retry-failed-email-jobs",
  { minutes: 1 },
  internal.emails.processRetryQueue
);

export default crons;
```

### 8.2 Cron Horaire : Emails Programmés

```typescript
import { formatInTimeZone } from "date-fns-tz";
import { addDays, subDays } from "date-fns";

const RESTAURANT_TIMEZONE = "Europe/Brussels";

export const processScheduledEmails = internalAction({
  handler: async (ctx) => {
    const now = new Date();
    
    // Heure locale Brussels
    const currentHourLocal = parseInt(
      formatInTimeZone(now, RESTAURANT_TIMEZONE, "H")
    );
    
    const settings = await ctx.runQuery(internal.settings.get);
    
    // Rappels J-1
    if (currentHourLocal === settings.emails.reminderHour) {
      await processReminders(ctx, now);
    }
    
    // Demandes d'avis J+1
    if (currentHourLocal === settings.emails.reviewRequestHour) {
      await processReviewRequests(ctx, now, settings);
    }
  },
});

async function processReminders(ctx: ActionCtx, now: Date) {
  // ⚠️ Calculer "demain" EN TIMEZONE BRUSSELS
  const tomorrowLocal = addDays(now, 1);
  const tomorrowStr = formatInTimeZone(
    tomorrowLocal, 
    RESTAURANT_TIMEZONE, 
    "yyyy-MM-dd"
  );
  
  const reservations = await ctx.runQuery(
    internal.reservations.getConfirmedForDate,
    { date: tomorrowStr, withoutReminder: true }
  );
  
  for (const reservation of reservations) {
    await ctx.runMutation(internal.emails.createEmailJob, {
      type: "reservation_reminder",
      reservationId: reservation._id,
    });
  }
}

async function processReviewRequests(
  ctx: ActionCtx, 
  now: Date,
  settings: Settings
) {
  // ⚠️ Calculer la date cible EN TIMEZONE BRUSSELS
  const targetDateLocal = subDays(now, settings.emails.reviewRequestDelayDays);
  const targetDateStr = formatInTimeZone(
    targetDateLocal, 
    RESTAURANT_TIMEZONE, 
    "yyyy-MM-dd"
  );
  
  const reservations = await ctx.runQuery(
    internal.reservations.getCompletedForDate,
    { date: targetDateStr, withoutReviewRequest: true }
  );
  
  for (const reservation of reservations) {
    const isOptedOut = await ctx.runQuery(
      internal.optouts.isOptedOut,
      { email: reservation.email }
    );
    
    if (!isOptedOut) {
      await ctx.runMutation(internal.emails.createEmailJob, {
        type: "review_request",
        reservationId: reservation._id,
      });
    }
  }
}
```

### 8.3 Cron Minute : Retry Queue

```typescript
export const processRetryQueue = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Récupérer les jobs en attente de retry
    const pendingJobs = await ctx.runQuery(
      internal.emails.getJobsReadyForRetry,
      { now }
    );
    
    // Traiter chaque job
    for (const job of pendingJobs) {
      // Schedule l'action d'envoi
      await ctx.scheduler.runAfter(0, internal.emails.processEmailJob, {
        jobId: job._id,
      });
    }
  },
});

// Query associée
export const getJobsReadyForRetry = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("emailJobs")
      .withIndex("by_next_retry", (q) => 
        q.eq("status", "queued")
      )
      .filter((q) => 
        q.and(
          q.neq(q.field("nextRetryAt"), undefined),
          q.lte(q.field("nextRetryAt"), now)
        )
      )
      .take(50);  // Limiter par batch
  },
});
```

---

## 9. Notifications Admin

| Notification | Trigger | Configurable |
|--------------|---------|:------------:|
| Nouvelle réservation pending | `status: pending` | ✅ |
| Annulation client | Via token | ✅ |
| Demande grand groupe | `groupRequest` | ✅ |

**Pas de SLA automatique** : L'admin surveille via le dashboard.

---

## 10. Opt-Out & Unsubscribe

### 10.1 Scope

Seul `review_request` propose un opt-out.

### 10.2 Headers

```typescript
const reviewHeaders = {
  ...EMAIL_CONFIG.baseHeaders,
  "List-Unsubscribe": `<https://app.lamouliniere.be/unsubscribe/${token}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
};
```

### 10.3 Endpoint One-Click (RFC 8058)

```typescript
// POST /api/unsubscribe/{token}
// Retourne 200/202 sans redirect
export async function POST(
  request: Request, 
  { params }: { params: { token: string } }
) {
  const { token } = params;
  
  const pendingOptout = await db.query("pendingOptouts")
    .withIndex("by_token", q => q.eq("token", token))
    .first();
  
  if (pendingOptout) {
    await db.insert("optouts", {
      email: pendingOptout.email,
      type: "review_request",
      token,
      createdAt: Date.now(),
    });
    await db.delete(pendingOptout._id);
  }
  
  // 200 OK sans redirect (RFC 8058)
  return new Response("OK", { status: 200 });
}
```

---

## 11. Génération ICS

### 11.1 Stratégie de Mise à Jour

| Champ | Valeur | But |
|-------|--------|-----|
| `UID` | `{reservationId}@lamouliniere.be` | Identifiant stable |
| `SEQUENCE` | `reservation.icsSequence` | Incrément à chaque modification |
| `METHOD` | `PUBLISH` | Standard envoi email |

### 11.2 Champ icsSequence (Ajout PRD-001)

```typescript
// Ajouter à la table reservations
icsSequence: v.optional(v.number()),  // Défaut: 0
```

### 11.3 Parsing Timezone Correct

```typescript
import { toDate, formatInTimeZone } from "date-fns-tz";

const RESTAURANT_TIMEZONE = "Europe/Brussels";

function generateICS(reservation: Reservation): string {
  const { _id, date, time, partySize, firstName, lastName, icsSequence } = reservation;
  
  // ⚠️ Parser l'heure locale Brussels correctement
  // toDate avec timeZone interprète la string comme heure locale
  const dateTimeStr = `${date}T${time}:00`;
  const startLocal = toDate(dateTimeStr, { timeZone: RESTAURANT_TIMEZONE });
  
  const endLocal = new Date(startLocal.getTime() + 2 * 60 * 60 * 1000);
  
  // Formatter en UTC pour ICS
  const formatICS = (d: Date) => 
    formatInTimeZone(d, "UTC", "yyyyMMdd'T'HHmmss'Z'");
  
  const uid = `${_id}@lamouliniere.be`;
  const sequence = icsSequence ?? 0;
  const dtstamp = formatICS(new Date());
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//La Moulinière//Réservation//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
SEQUENCE:${sequence}
DTSTAMP:${dtstamp}
DTSTART:${formatICS(startLocal)}
DTEND:${formatICS(endLocal)}
SUMMARY:Réservation La Moulinière - ${partySize} convives
DESCRIPTION:Réservation pour ${partySize} personnes\\nContact: ${firstName} ${lastName}
LOCATION:La Moulinière, Visserskaai 17, 8400 Oostende, Belgique
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

function generateICSBase64(reservation: Reservation): string {
  const icsContent = generateICS(reservation);
  return Buffer.from(icsContent, "utf-8").toString("base64");
}
```

---

## 12. Configuration (PRD-012)

### 12.1 Ajouts au Schema Settings

```typescript
emails: {
  fromName: v.string(),              // "La Moulinière"
  fromEmail: v.string(),             // "noreply@lamouliniere.be"
  replyToEmail: v.string(),          // "info@lamouliniere.be"
  googleReviewUrl: v.string(),
  tripadvisorUrl: v.string(),
  reminderHour: v.number(),          // 10 (heure locale Brussels)
  reviewRequestHour: v.number(),     // 10
  reviewRequestDelayDays: v.number(), // 1
  sendReminders: v.boolean(),
  sendReviewRequests: v.boolean(),
},

adminNotifications: {
  email: v.string(),
  onPendingReservation: v.boolean(),
  onClientCancellation: v.boolean(),
  onGroupRequest: v.boolean(),
},
```

---

## 13. Schémas de Données

### 13.1 Table `emailJobs`

```typescript
emailJobs: defineTable({
  // ═══ RÉFÉRENCE ═══
  reservationId: v.optional(v.id("reservations")),
  groupRequestId: v.optional(v.id("groupRequests")),
  
  // ═══ TYPE ═══
  type: v.union(
    v.literal("reservation_confirmed"),
    v.literal("reservation_pending"),
    v.literal("reservation_validated"),
    v.literal("reservation_refused"),
    v.literal("reservation_cancelled_client"),
    v.literal("reservation_cancelled_admin"),
    v.literal("reservation_reminder"),
    v.literal("review_request"),
    v.literal("group_request_ack"),
    v.literal("reservation_modified"),
    v.literal("admin_notification")
  ),
  
  // ═══ DESTINATAIRE ═══
  to: v.string(),
  locale: v.union(
    v.literal("fr"), v.literal("nl"), v.literal("en"),
    v.literal("de"), v.literal("it")
  ),
  
  // ═══ PAYLOAD FIGÉ (pré-rendu à la création) ═══
  subject: v.string(),                // Sujet pré-interpolé
  htmlContent: v.string(),            // HTML pré-rendu
  textContent: v.string(),            // Plain-text pré-rendu
  headers: v.optional(v.any()),       // Headers email figés
  icsContentBase64: v.optional(v.string()),
  icsSequence: v.optional(v.number()),
  unsubscribeToken: v.optional(v.string()),
  
  // ═══ IDEMPOTENCE ═══
  idempotencyKey: v.string(),
  
  // ═══ CHAMP À MARQUER ═══
  sentAtField: v.optional(v.string()),
  
  // ═══ RESEND ═══
  resendId: v.optional(v.string()),
  
  // ═══ STATUT ═══
  status: v.union(
    v.literal("queued"),
    v.literal("sending"),
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("bounced"),
    v.literal("failed")
  ),
  
  // ═══ RETRY ═══
  attempts: v.number(),
  nextRetryAt: v.optional(v.number()),
  lastAttemptAt: v.optional(v.number()),
  
  // ═══ TIMESTAMPS ═══
  createdAt: v.number(),
  sentAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),
  
  // ═══ ERREUR ═══
  errorMessage: v.optional(v.string()),
})
  .index("by_reservation", ["reservationId"])
  .index("by_type", ["type"])
  .index("by_status", ["status"])
  .index("by_created", ["createdAt"])
  .index("by_next_retry", ["status", "nextRetryAt"])
  .index("by_resend_id", ["resendId"])
  .index("by_idempotency", ["idempotencyKey"])
```

### 13.2 Table `optouts`

```typescript
optouts: defineTable({
  email: v.string(),
  type: v.literal("review_request"),
  token: v.string(),
  createdAt: v.number(),
})
  .index("by_email_type", ["email", "type"])
  .index("by_token", ["token"])
```

### 13.3 Table `pendingOptouts`

```typescript
pendingOptouts: defineTable({
  email: v.string(),
  token: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),  // Token valide 30 jours
})
  .index("by_token", ["token"])
```

### 13.4 Ajout à `reservations` (PRD-001)

```typescript
icsSequence: v.optional(v.number()),  // Défaut 0, incrémenté à chaque modification
```

---

## 14. Intégration Resend

### 14.1 Création Job avec Payload Figé

```typescript
export const createEmailJob = internalMutation({
  args: {
    type: v.string(),
    reservationId: v.optional(v.id("reservations")),
    groupRequestId: v.optional(v.id("groupRequests")),
  },
  handler: async (ctx, args) => {
    const reservation = args.reservationId 
      ? await ctx.db.get(args.reservationId)
      : null;
    
    const templateData = buildTemplateData(args.type, reservation);
    
    // ⚠️ PRÉ-RENDRE tout le contenu
    const htmlContent = await renderEmailHtml(args.type, templateData);
    const textContent = renderEmailText(args.type, templateData);
    const subject = interpolateSubject(args.type, templateData);
    
    // ICS si applicable
    let icsContentBase64: string | undefined;
    let icsSequence: number | undefined;
    if (reservation && needsICS(args.type)) {
      icsContentBase64 = generateICSBase64(reservation);
      icsSequence = reservation.icsSequence ?? 0;
    }
    
    // Headers figés
    let headers = { ...EMAIL_CONFIG.baseHeaders };
    let unsubscribeToken: string | undefined;
    if (args.type === "review_request" && reservation) {
      unsubscribeToken = generateSecureToken();
      await ctx.db.insert("pendingOptouts", {
        email: reservation.email,
        token: unsubscribeToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      headers = {
        ...headers,
        "List-Unsubscribe": `<https://app.lamouliniere.be/unsubscribe/${unsubscribeToken}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };
    }
    
    // Idempotency key
    const idempotencyKey = args.type === "reservation_modified" && icsSequence !== undefined
      ? `${args.reservationId}:${args.type}:${icsSequence}`
      : `${args.reservationId ?? args.groupRequestId}:${args.type}`;
    
    const jobId = await ctx.db.insert("emailJobs", {
      type: args.type,
      reservationId: args.reservationId,
      groupRequestId: args.groupRequestId,
      to: reservation?.email ?? "",
      locale: reservation?.language ?? "fr",
      subject,
      htmlContent,
      textContent,
      headers,
      icsContentBase64,
      icsSequence,
      unsubscribeToken,
      idempotencyKey,
      sentAtField: getSentAtField(args.type),
      status: "queued",
      attempts: 0,
      createdAt: Date.now(),
    });
    
    // Déclencher l'envoi immédiat
    await ctx.scheduler.runAfter(0, internal.emails.processEmailJob, { jobId });
    
    return jobId;
  },
});
```

### 14.2 Webhooks Resend

```typescript
export async function handleResendWebhook(payload: ResendWebhookPayload) {
  const { type, data } = payload;
  
  const job = await db.query("emailJobs")
    .withIndex("by_resend_id", q => q.eq("resendId", data.email_id))
    .first();
  
  if (!job) return;
  
  switch (type) {
    case "email.delivered":
      await db.patch(job._id, { 
        status: "delivered",
        deliveredAt: Date.now(),
      });
      break;
    case "email.bounced":
      await db.patch(job._id, { 
        status: "bounced",
        errorMessage: data.bounce_type,
      });
      break;
  }
}
```

---

## 15. Tests & Monitoring

### 15.1 Tests

| Test | Description |
|------|-------------|
| Payload identique | Vérifier que retry envoie exactement le même payload |
| ICS parsing | toDate avec timeZone fonctionne correctement |
| ICS SEQUENCE | Incrémente à chaque modification |
| Gmail detection | @gmail.com et @googlemail.com détectés |
| Cron timezone | Heure correcte en été et hiver |
| Retry queue | Jobs avec nextRetryAt traités |

### 15.2 Dashboard Monitoring

| Métrique | Query |
|----------|-------|
| Queue size | `status = queued` |
| Failed jobs | `status = failed` |
| Retry pending | `attempts > 1 AND status = queued` |

---

## 16. Écarts à Implémenter

### 16.1 Priorité P0 (MVP)

| Fonctionnalité | Effort |
|----------------|:------:|
| Setup Resend + DNS | Faible |
| Table `emailJobs` (payload figé) | Moyen |
| Tables `optouts` + `pendingOptouts` | Faible |
| Pré-rendu HTML/text à création job | Moyen |
| 10 templates React Email | Élevé |
| Génération ICS (toDate timezone) | Faible |
| Cron horaire (scheduled emails) | Faible |
| Cron minute (retry queue) | Faible |
| Page unsubscribe one-click | Faible |
| Champ `icsSequence` sur reservations | Faible |

### 16.2 Priorité P1 (Post-MVP)

| Fonctionnalité | Effort |
|----------------|:------:|
| Webhooks Resend | Moyen |
| ICS d'annulation (STATUS:CANCELLED) | Faible |
| Dashboard monitoring | Moyen |

---

## Annexe A: Checklist Implémentation

```
□ Compte Resend créé + domaine vérifié
□ API key dans Convex env
□ Table emailJobs avec payload figé (htmlContent, textContent)
□ Tables optouts + pendingOptouts créées
□ Champ icsSequence ajouté à reservations
□ Pré-rendu HTML/text dans createEmailJob
□ Idempotency via option Resend (pas header)
□ ICS parsing avec toDate(..., { timeZone })
□ ICS base64 avec SEQUENCE
□ Cron horaire processScheduledEmails
□ Cron minute processRetryQueue
□ Dates calculées en timezone Brussels
□ Gmail detection: @gmail.com + @googlemail.com
□ Endpoint unsubscribe POST 200 sans redirect
□ Texte pending adouci (pas "sous 24h")
□ Tests payload identique sur retry
```

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0 | 2025-12-21 | Claude | Création initiale |
| 1.1 | 2025-12-21 | Claude | Outbox, cron timezone, idempotency, unsubscribe, ICS |
| 1.2 | 2025-12-21 | Claude | Idempotence option Resend, ICS base64 + SEQUENCE |
| 1.3 | 2025-12-21 | Claude | **Validation finale** : Payload figé, toDate timezone, cron retry minute, promesse SLA adoucie, Gmail @googlemail.com |
