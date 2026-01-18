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

// Process email queue every minute
crons.interval(
  "process-email-queue",
  { minutes: 1 },
  internal.emails.processQueue,
  { now: Date.now(), limit: 10 }
);

// Enqueue reminder emails at 18:00 daily (J-1 reminders)
// TICKET: Should be 18:00 in restaurant timezone, using UTC for now
crons.cron(
  "enqueue-reminders",
  "0 18 * * *",
  internal.emails.enqueueReminders,
  { now: Date.now() }
);

// Enqueue review emails at 10:00 daily (J+1 review requests)
// Excludes reservations with status "incident" to avoid sending review requests to clients who had issues
crons.cron(
  "enqueue-reviews",
  "0 10 * * *",
  internal.emails.enqueueReviewEmails,
  { now: Date.now() }
);

// Cleanup old email jobs at 04:00 daily
// Contract §7: emailJobs en `sent` de plus de 90 jours
crons.cron(
  "email-cleanup",
  "0 4 * * *",
  internal.emails.cleanup,
  { now: Date.now() }
);

// Reaper: reset stuck jobs every hour
// TICKET: stuck threshold not specified in contract/PRD
crons.interval(
  "email-reaper",
  { hours: 1 },
  internal.emails.reaper,
  { now: Date.now() }
);

// TICKET: jobs.dailyFinalize not implemented yet
// crons.cron("daily-finalize", "0 3 * * *", internal.jobs.dailyFinalize, { now: Date.now() });

// TICKET: jobs.cleanup (tokens/idempotency) not implemented yet
// crons.cron("daily-cleanup", "0 4 * * *", internal.jobs.cleanup, { now: Date.now() });

export default crons;
