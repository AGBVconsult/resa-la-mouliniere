/**
 * Email queue and worker.
 * 
 * emailJobs table from schema:
 * - type: EmailJobType
 * - status: "queued" | "sent" | "failed"
 * - dedupeKey: string (unique per intent)
 * - attemptCount, nextRetryAt, lastAttemptAt, lastErrorCode
 * 
 * Contract: email.processQueue, email.sendJob (Actions)
 */

import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import { Errors } from "./lib/errors";
import { renderTemplate, type TemplateData, type EmailJobType } from "./lib/email/templates";
import { sendEmail } from "./lib/email/resend";
import { computeBackoffMs, shouldMarkFailed, MAX_ATTEMPTS } from "./lib/email/retry";
import {
  buildReminderDedupeKey,
  buildReviewDedupeKey,
  computeTomorrowDateKey,
  computeYesterdayDateKey,
  isStuck,
  isExpiredByRetention,
  DEFAULT_RETENTION_POLICY,
  STUCK_THRESHOLD_MS,
} from "./lib/email/ops";

const emailJobType = v.union(
  v.literal("reservation.confirmed"),
  v.literal("reservation.pending"),
  v.literal("reservation.validated"),
  v.literal("reservation.refused"),
  v.literal("reservation.cancelled"),
  v.literal("reservation.reminder"),
  v.literal("reservation.review"),
  v.literal("admin.notification")
);

/**
 * Enqueue an email job (idempotent via dedupeKey).
 * 
 * dedupeKey format from contract: "reservationId#type#version" or similar stable key.
 * If a job with same dedupeKey exists in queued|sent status, return existing (no duplicate).
 */
export const enqueue = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    type: emailJobType,
    to: v.string(),
    subjectKey: v.string(),
    templateKey: v.string(),
    templateData: v.any(),
    dedupeKey: v.string(),
    icsBase64: v.optional(v.union(v.null(), v.string())),
  },
  handler: async (ctx, args) => {
    // Check for existing job with same dedupeKey (idempotent)
    const existing = await ctx.db
      .query("emailJobs")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", args.dedupeKey))
      .unique();

    // If exists and not failed, return existing (stability + idempotence)
    if (existing && (existing.status === "queued" || existing.status === "sent")) {
      return { jobId: existing._id, created: false };
    }

    // If exists and failed, we could retry - but per contract, dedupeKey is UNIQUE
    // So we return existing even if failed (caller should use different dedupeKey for retry)
    if (existing) {
      return { jobId: existing._id, created: false };
    }

    const now = Date.now();

    const jobId = await ctx.db.insert("emailJobs", {
      restaurantId: args.restaurantId,
      type: args.type,
      to: args.to,
      subjectKey: args.subjectKey,
      templateKey: args.templateKey,
      templateData: args.templateData,
      icsBase64: args.icsBase64 ?? null,
      status: "queued",
      attemptCount: 0,
      nextRetryAt: null, // null means ready to send immediately
      lastAttemptAt: null,
      lastErrorCode: null,
      dedupeKey: args.dedupeKey,
      createdAt: now,
      updatedAt: now,
    });

    // Log without PII (no to, templateData)
    console.log("Email job enqueued", { jobId, type: args.type, dedupeKey: args.dedupeKey });

    return { jobId, created: true };
  },
});

/**
 * Claim due jobs for processing (anti-concurrence).
 * Returns jobs that are queued and ready (nextRetryAt is null or <= now).
 */
export const _claimDueJobs = internalMutation({
  args: {
    limit: v.number(),
    now: v.number(),
  },
  handler: async (ctx, { limit, now }) => {
    // Query queued jobs where nextRetryAt is null or <= now
    const dueJobs = await ctx.db
      .query("emailJobs")
      .withIndex("by_status_nextRetryAt", (q) => q.eq("status", "queued"))
      .filter((q) =>
        q.or(
          q.eq(q.field("nextRetryAt"), null),
          q.lte(q.field("nextRetryAt"), now)
        )
      )
      .take(limit);

    const claimedIds: Id<"emailJobs">[] = [];

    for (const job of dueJobs) {
      // Mark as "processing" by updating status
      // Note: schema has status as "queued" | "sent" | "failed"
      // We use attemptCount increment + lastAttemptAt as processing marker
      // to avoid adding a new status not in schema
      await ctx.db.patch(job._id, {
        lastAttemptAt: now,
        updatedAt: now,
      });
      claimedIds.push(job._id);
    }

    return claimedIds;
  },
});

/**
 * Get job by ID for processing.
 */
export const _getJob = internalQuery({
  args: { jobId: v.id("emailJobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

/**
 * Mark job as sent.
 */
export const _markSent = internalMutation({
  args: {
    jobId: v.id("emailJobs"),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, messageId }) => {
    const now = Date.now();
    await ctx.db.patch(jobId, {
      status: "sent",
      updatedAt: now,
      lastErrorCode: null,
    });
    // Log without PII
    console.log("Email job sent", { jobId, messageId });
  },
});

/**
 * Mark job as failed or schedule retry.
 */
export const _markFailure = internalMutation({
  args: {
    jobId: v.id("emailJobs"),
    errorCode: v.string(),
  },
  handler: async (ctx, { jobId, errorCode }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return;

    const now = Date.now();
    const newAttemptCount = job.attemptCount + 1;

    if (shouldMarkFailed(newAttemptCount)) {
      // Max attempts reached, mark as failed
      await ctx.db.patch(jobId, {
        status: "failed",
        attemptCount: newAttemptCount,
        lastErrorCode: errorCode,
        updatedAt: now,
      });
      console.log("Email job failed (max attempts)", { jobId, attemptCount: newAttemptCount });
    } else {
      // Schedule retry with backoff
      const backoffMs = computeBackoffMs(newAttemptCount + 1);
      const nextRetryAt = backoffMs ? now + backoffMs : null;

      await ctx.db.patch(jobId, {
        attemptCount: newAttemptCount,
        nextRetryAt,
        lastErrorCode: errorCode,
        updatedAt: now,
      });
      console.log("Email job retry scheduled", { jobId, attemptCount: newAttemptCount, nextRetryAt });
    }
  },
});

/**
 * Get reservation data for email rendering.
 */
export const _getReservationForEmail = internalQuery({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, { reservationId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) return null;

    // Get manage token
    const tokenDoc = await ctx.db
      .query("reservationTokens")
      .withIndex("by_reservation_type", (q) =>
        q.eq("reservationId", reservationId).eq("type", "manage")
      )
      .unique();

    return {
      reservation,
      manageToken: tokenDoc?.token ?? null,
    };
  },
});

/**
 * Process email queue (Action - can make HTTP calls).
 * Contract: email.processQueue({ now }) -> { processedCount }
 */
export const processQueue = internalAction({
  args: {
    now: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { now, limit = 10 }): Promise<{ processedCount: number }> => {
    // Get settings (including resend API key) via internal mutation
    const settings = await ctx.runMutation(internal.settings.getSecretsInternal, {});
    
    if (!settings) {
      console.log("Email processQueue: no settings found");
      return { processedCount: 0 };
    }

    // Claim due jobs
    const jobIds = await ctx.runMutation(internal.emails._claimDueJobs, { limit, now });

    if (jobIds.length === 0) {
      return { processedCount: 0 };
    }

    let processedCount = 0;

    for (const jobId of jobIds) {
      const job = await ctx.runQuery(internal.emails._getJob, { jobId });
      if (!job) continue;

      // Skip if already sent (race condition protection)
      if (job.status === "sent") continue;

      try {
        // Render template
        const templateData = job.templateData as TemplateData;
        const rendered = renderTemplate(job.type, templateData.language ?? "en", templateData);

        // Send via Resend
        if (!settings.resendApiKey) {
          await ctx.runMutation(internal.emails._markFailure, { jobId, errorCode: "API_KEY_NOT_CONFIGURED" });
          continue;
        }
        const result = await sendEmail(settings.resendApiKey, {
          from: `${settings.resendFromName ?? "La Moulinière"} <${settings.resendFromEmail ?? "no-reply@example.com"}>`,
          to: job.to,
          subject: rendered.subject,
          html: rendered.html,
        });

        if (result.success) {
          await ctx.runMutation(internal.emails._markSent, { jobId, messageId: result.messageId });
          processedCount++;
        } else {
          await ctx.runMutation(internal.emails._markFailure, { jobId, errorCode: result.errorCode ?? "UNKNOWN" });
        }
      } catch {
        // Render or other error
        await ctx.runMutation(internal.emails._markFailure, { jobId, errorCode: "RENDER_ERROR" });
      }
    }

    return { processedCount };
  },
});

/**
 * Send a single job (Action).
 * Contract: email.sendJob({ jobId }) -> { ok: true }
 */
export const sendJob = internalAction({
  args: {
    jobId: v.id("emailJobs"),
  },
  handler: async (ctx, { jobId }): Promise<{ ok: boolean }> => {
    const job = await ctx.runQuery(internal.emails._getJob, { jobId });
    if (!job) {
      throw Errors.INVALID_INPUT("jobId", "Job not found");
    }

    if (job.status === "sent") {
      return { ok: true }; // Already sent
    }

    const settings = await ctx.runMutation(internal.settings.getSecretsInternal, {});
    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    // Render template
    const templateData = job.templateData as TemplateData;
    const rendered = renderTemplate(job.type, templateData.language ?? "en", templateData);

    if (!settings.resendApiKey) {
      throw Errors.INVALID_INPUT("resendApiKey", "API key not configured");
    }

    const result = await sendEmail(settings.resendApiKey, {
      from: `${settings.resendFromName ?? "La Moulinière"} <${settings.resendFromEmail ?? "no-reply@example.com"}>`,
      to: job.to,
      subject: rendered.subject,
      html: rendered.html,
    });

    if (result.success) {
      await ctx.runMutation(internal.emails._markSent, { jobId, messageId: result.messageId });
      return { ok: true };
    } else {
      await ctx.runMutation(internal.emails._markFailure, { jobId, errorCode: result.errorCode ?? "UNKNOWN" });
      return { ok: false };
    }
  },
});

// ============================================================================
// Ops: Reminders, Cleanup, Reaper
// ============================================================================

/**
 * Enqueue reminder emails for confirmed reservations tomorrow (J-1).
 * Called by cron at 18:00 local time.
 * 
 * Contract: reservation.reminder email type exists.
 * Dedupe via dedupeKey = "reminder:{reservationId}"
 */
export const enqueueReminders = internalMutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, { now }) => {
    // Get active restaurant
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      console.log("enqueueReminders: no active restaurant");
      return { scanned: 0, enqueued: 0, alreadyExists: 0, dateKey: null };
    }
    if (activeRestaurants.length > 1) {
      console.log("enqueueReminders: multiple active restaurants, skipping");
      return { scanned: 0, enqueued: 0, alreadyExists: 0, dateKey: null };
    }

    const restaurant = activeRestaurants[0];
    const tomorrowDateKey = computeTomorrowDateKey(restaurant.timezone, now);

    // Find confirmed reservations for tomorrow
    // Use by_restaurant_date_service index (can't filter by status in index, filter in memory)
    const reservationsLunch = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", tomorrowDateKey).eq("service", "lunch")
      )
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    const reservationsDinner = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", tomorrowDateKey).eq("service", "dinner")
      )
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    const reservations = [...reservationsLunch, ...reservationsDinner];

    let enqueued = 0;
    let alreadyExists = 0;

    for (const reservation of reservations) {
      const dedupeKey = buildReminderDedupeKey(reservation._id);

      // Check if already exists via index
      const existing = await ctx.db
        .query("emailJobs")
        .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
        .unique();

      if (existing) {
        alreadyExists++;
        continue;
      }

      // Enqueue reminder
      await ctx.db.insert("emailJobs", {
        restaurantId: restaurant._id,
        type: "reservation.reminder",
        to: reservation.email,
        subjectKey: "email.reservation.reminder.subject",
        templateKey: "reservation.reminder",
        templateData: {
          firstName: reservation.firstName,
          lastName: reservation.lastName,
          dateKey: reservation.dateKey,
          timeKey: reservation.timeKey,
          service: reservation.service,
          partySize: reservation.partySize,
          language: reservation.language,
        },
        icsBase64: null,
        status: "queued",
        attemptCount: 0,
        nextRetryAt: null,
        lastAttemptAt: null,
        lastErrorCode: null,
        dedupeKey,
        createdAt: now,
        updatedAt: now,
      });

      enqueued++;
    }

    // Log without PII
    console.log("enqueueReminders completed", {
      dateKey: tomorrowDateKey,
      scanned: reservations.length,
      enqueued,
      alreadyExists,
    });

    return {
      scanned: reservations.length,
      enqueued,
      alreadyExists,
      dateKey: tomorrowDateKey,
    };
  },
});

/**
 * Enqueue review emails for completed reservations yesterday (J+1).
 * Called by cron at 10:00 local time.
 * 
 * IMPORTANT: Excludes reservations with status "incident" to avoid
 * sending review requests to clients who had issues.
 * 
 * Contract: reservation.review email type exists.
 * Dedupe via dedupeKey = "review:{reservationId}"
 */
export const enqueueReviewEmails = internalMutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, { now }) => {
    // Get active restaurant
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      console.log("enqueueReviewEmails: no active restaurant");
      return { scanned: 0, enqueued: 0, alreadyExists: 0, skippedIncident: 0, dateKey: null };
    }
    if (activeRestaurants.length > 1) {
      console.log("enqueueReviewEmails: multiple active restaurants, skipping");
      return { scanned: 0, enqueued: 0, alreadyExists: 0, skippedIncident: 0, dateKey: null };
    }

    const restaurant = activeRestaurants[0];
    const yesterdayDateKey = computeYesterdayDateKey(restaurant.timezone, now);

    // Find completed reservations for yesterday
    // Use by_restaurant_date_service index (can't filter by status in index, filter in memory)
    const reservationsLunch = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", yesterdayDateKey).eq("service", "lunch")
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const reservationsDinner = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", yesterdayDateKey).eq("service", "dinner")
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const reservations = [...reservationsLunch, ...reservationsDinner];

    let enqueued = 0;
    let alreadyExists = 0;
    let skippedIncident = 0;

    for (const reservation of reservations) {
      // Check if reservation had an incident event (status was changed to "incident" at some point)
      // We check the reservationEvents table for any incident status change
      const incidentEvent = await ctx.db
        .query("reservationEvents")
        .withIndex("by_reservation", (q) => q.eq("reservationId", reservation._id))
        .filter((q) => q.eq(q.field("toStatus"), "incident"))
        .first();

      if (incidentEvent) {
        skippedIncident++;
        console.log("enqueueReviewEmails: skipping incident reservation", { reservationId: reservation._id });
        continue;
      }

      const dedupeKey = buildReviewDedupeKey(reservation._id);

      // Check if already exists via index
      const existing = await ctx.db
        .query("emailJobs")
        .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
        .unique();

      if (existing) {
        alreadyExists++;
        continue;
      }

      // Enqueue review email
      await ctx.db.insert("emailJobs", {
        restaurantId: restaurant._id,
        type: "reservation.review",
        to: reservation.email,
        subjectKey: "email.reservation.review.subject",
        templateKey: "reservation.review",
        templateData: {
          firstName: reservation.firstName,
          lastName: reservation.lastName,
          dateKey: reservation.dateKey,
          timeKey: reservation.timeKey,
          service: reservation.service,
          partySize: reservation.partySize,
          language: reservation.language,
        },
        icsBase64: null,
        status: "queued",
        attemptCount: 0,
        nextRetryAt: null,
        lastAttemptAt: null,
        lastErrorCode: null,
        dedupeKey,
        createdAt: now,
        updatedAt: now,
      });

      enqueued++;
    }

    // Log without PII
    console.log("enqueueReviewEmails completed", {
      dateKey: yesterdayDateKey,
      scanned: reservations.length,
      enqueued,
      alreadyExists,
      skippedIncident,
    });

    return {
      scanned: reservations.length,
      enqueued,
      alreadyExists,
      skippedIncident,
      dateKey: yesterdayDateKey,
    };
  },
});

/**
 * Cleanup old email jobs.
 * Contract §7: emailJobs en `sent` de plus de 90 jours.
 * 
 * Process in batches to avoid timeouts.
 */
export const cleanup = internalMutation({
  args: {
    now: v.number(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { now, batchSize = 200 }) => {
    let deletedSent = 0;
    let deletedFailed = 0;

    // Cleanup sent jobs older than retention
    const sentThreshold = now - DEFAULT_RETENTION_POLICY.sentRetentionMs;
    const oldSentJobs = await ctx.db
      .query("emailJobs")
      .withIndex("by_status_nextRetryAt", (q) => q.eq("status", "sent"))
      .filter((q) => q.lt(q.field("updatedAt"), sentThreshold))
      .take(batchSize);

    for (const job of oldSentJobs) {
      await ctx.db.delete(job._id);
      deletedSent++;
    }

    // Cleanup failed jobs older than retention
    const failedThreshold = now - DEFAULT_RETENTION_POLICY.failedRetentionMs;
    const remainingBatch = batchSize - deletedSent;
    
    if (remainingBatch > 0) {
      const oldFailedJobs = await ctx.db
        .query("emailJobs")
        .withIndex("by_status_nextRetryAt", (q) => q.eq("status", "failed"))
        .filter((q) => q.lt(q.field("updatedAt"), failedThreshold))
        .take(remainingBatch);

      for (const job of oldFailedJobs) {
        await ctx.db.delete(job._id);
        deletedFailed++;
      }
    }

    const totalDeleted = deletedSent + deletedFailed;

    // Log thresholds in ISO for audit
    console.log("emails.cleanup completed", {
      deletedSent,
      deletedFailed,
      sentThresholdISO: new Date(sentThreshold).toISOString(),
      failedThresholdISO: new Date(failedThreshold).toISOString(),
    });

    // If batch was full, schedule continuation
    if (totalDeleted >= batchSize) {
      await ctx.scheduler.runAfter(0, internal.emails.cleanup, { now, batchSize });
    }

    return { deletedSent, deletedFailed };
  },
});

/**
 * Reaper: reset stuck jobs and handle orphans.
 * 
 * A job is "stuck" if:
 * - status = "queued"
 * - lastAttemptAt is set (meaning it was claimed for processing)
 * - lastAttemptAt is older than STUCK_THRESHOLD_MS
 * 
 * TICKET: stuck threshold not specified in contract/PRD, using 10 minutes.
 */
export const reaper = internalMutation({
  args: {
    now: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { now, limit = 100 }) => {
    let reset = 0;
    let failed = 0;
    let orphaned = 0;

    // Find queued jobs that might be stuck
    // We can't directly query by lastAttemptAt, so we query queued and filter
    const queuedJobs = await ctx.db
      .query("emailJobs")
      .withIndex("by_status_nextRetryAt", (q) => q.eq("status", "queued"))
      .take(limit);

    for (const job of queuedJobs) {
      // Check if stuck
      if (!isStuck(job.lastAttemptAt, now, STUCK_THRESHOLD_MS)) {
        continue;
      }

      // Check if orphan (reservation deleted)
      // TICKET: emailJobs doesn't have reservationId field, can't detect orphans directly
      // We skip orphan detection for now as templateData.reservationId is not guaranteed

      if (job.attemptCount >= MAX_ATTEMPTS) {
        // Max attempts reached, mark as failed
        await ctx.db.patch(job._id, {
          status: "failed",
          lastErrorCode: "REAPER_STUCK_MAX_ATTEMPTS",
          updatedAt: now,
        });
        failed++;
        console.log("Reaper: job failed (max attempts)", { jobId: job._id, attempts: job.attemptCount });
      } else {
        // Reset to queued with immediate retry
        // Note: We do NOT increment attemptCount as crash is not a real attempt per contract
        await ctx.db.patch(job._id, {
          nextRetryAt: now, // Immediate retry
          lastAttemptAt: null, // Clear processing marker
          updatedAt: now,
        });
        reset++;
        console.log("Reaper: job reset", { jobId: job._id, attempts: job.attemptCount });
      }
    }

    console.log("emails.reaper completed", { scanned: queuedJobs.length, reset, failed, orphaned });

    return { scanned: queuedJobs.length, reset, failed, orphaned };
  },
});

/**
 * Get operational stats for admin dashboard.
 * 
 * Autorisation: internal only (called by admin endpoints if needed).
 */
export const getOpsStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Count by status using index (limited to avoid scan)
    const queuedJobs = await ctx.db
      .query("emailJobs")
      .withIndex("by_status_nextRetryAt", (q) => q.eq("status", "queued"))
      .take(1000);

    const sentJobs = await ctx.db
      .query("emailJobs")
      .withIndex("by_status_nextRetryAt", (q) => q.eq("status", "sent"))
      .take(1000);

    const failedJobs = await ctx.db
      .query("emailJobs")
      .withIndex("by_status_nextRetryAt", (q) => q.eq("status", "failed"))
      .take(1000);

    const now = Date.now();

    // Estimate stuck jobs
    const stuckEstimate = queuedJobs.filter(
      (job) => isStuck(job.lastAttemptAt, now, STUCK_THRESHOLD_MS)
    ).length;

    // Recent failures (last 24h)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentFailures24h = failedJobs.filter(
      (job) => job.updatedAt > oneDayAgo
    ).length;

    return {
      queued: queuedJobs.length,
      sent: sentJobs.length,
      failed: failedJobs.length,
      stuckEstimate,
      recentFailures24h,
      // Note: counts are capped at 1000 for performance
      countsCapped: queuedJobs.length >= 1000 || sentJobs.length >= 1000 || failedJobs.length >= 1000,
    };
  },
});
