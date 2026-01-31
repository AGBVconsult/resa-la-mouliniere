/**
 * Cron jobs configuration.
 * 
 * Contract §7:
 * - Every minute: email.processQueue({ now })
 * - 0 3 daily: jobs.dailyFinalize({ dateKey, now })
 * - 0 4 daily: jobs.cleanup({ now })
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

const internalAny = internal as any;

// Process email queue every minute
// Note: Convex crons evaluate args at runtime, but we use Date.now() in handler for safety
crons.interval(
  "process-email-queue",
  { minutes: 1 },
  internal.emails.processQueue,
  {}
);

// Enqueue reminder emails every 15 minutes (H-2 reminders)
// Sends reminders 2 hours before each reservation
crons.interval(
  "enqueue-reminders",
  { minutes: 15 },
  internal.emails.enqueueReminders,
  {}
);

// Enqueue review emails at 06:30 daily (J+1 review requests)
// Excludes reservations with status: no-show, cancelled, refused, incident
crons.cron(
  "enqueue-reviews",
  "30 6 * * *",
  internal.emails.enqueueReviewEmails,
  {}
);

// Cleanup old email jobs at 04:00 daily
// Contract §7: emailJobs en `sent` de plus de 90 jours
crons.cron(
  "email-cleanup",
  "0 4 * * *",
  internal.emails.cleanup,
  {}
);

// Reaper: reset stuck jobs every hour
// TICKET: stuck threshold not specified in contract/PRD
crons.interval(
  "email-reaper",
  { hours: 1 },
  internal.emails.reaper,
  {}
);

// Daily finalize at 03:00 - mark confirmed as noshow, seated as completed
crons.cron(
  "daily-finalize",
  "0 3 * * *",
  internal.jobs.dailyFinalize,
  {}
);

// Daily cleanup at 04:00 - delete expired tokens and idempotency keys
crons.cron(
  "daily-cleanup",
  "0 4 * * *",
  internal.jobs.cleanup,
  {}
);

// CRM nightly check (DST-safe): Convex runs in UTC, so run hourly and check local hour in handler
crons.hourly(
  "crm-nightly-check",
  { minuteUTC: 0 },
  internalAny.crm.nightlyCheck,
  {}
);

// CRM purge/anonymisation: monthly job
crons.monthly(
  "crm-purge-old-clients",
  { day: 1, hourUTC: 2, minuteUTC: 0 },
  internalAny.crm.purgeOldClients,
  {}
);

// Generate slots from weekly templates daily at 01:00 UTC
// Creates slots for the next 6 months (180 days) based on template configuration
crons.daily(
  "generate-slots-from-templates",
  { hourUTC: 1, minuteUTC: 0 },
  internalAny.weeklyTemplates.generateFromTemplates,
  { daysAhead: 180 }
);

export default crons;
