/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as assignmentLogs from "../assignmentLogs.js";
import type * as availability from "../availability.js";
import type * as clients from "../clients.js";
import type * as crm from "../crm.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as emails from "../emails.js";
import type * as floor from "../floor.js";
import type * as floorplan from "../floorplan.js";
import type * as groupRequests from "../groupRequests.js";
import type * as idempotency from "../idempotency.js";
import type * as jobs from "../jobs.js";
import type * as lib_adjacency from "../lib/adjacency.js";
import type * as lib_dateUtils from "../lib/dateUtils.js";
import type * as lib_email_ops from "../lib/email/ops.js";
import type * as lib_email_resend from "../lib/email/resend.js";
import type * as lib_email_retry from "../lib/email/retry.js";
import type * as lib_email_templates from "../lib/email/templates.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_formatters from "../lib/formatters.js";
import type * as lib_idempotency from "../lib/idempotency.js";
import type * as lib_pushover from "../lib/pushover.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_setPredictor from "../lib/setPredictor.js";
import type * as lib_shadowMetrics from "../lib/shadowMetrics.js";
import type * as lib_snapshot from "../lib/snapshot.js";
import type * as lib_stateMachine from "../lib/stateMachine.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as lib_turnstile from "../lib/turnstile.js";
import type * as notifications from "../notifications.js";
import type * as planning from "../planning.js";
import type * as reservations from "../reservations.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as slots from "../slots.js";
import type * as specialPeriods from "../specialPeriods.js";
import type * as tables from "../tables.js";
import type * as tags from "../tags.js";
import type * as weeklyTemplates from "../weeklyTemplates.js";
import type * as widget from "../widget.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assignmentLogs: typeof assignmentLogs;
  availability: typeof availability;
  clients: typeof clients;
  crm: typeof crm;
  crons: typeof crons;
  email: typeof email;
  emails: typeof emails;
  floor: typeof floor;
  floorplan: typeof floorplan;
  groupRequests: typeof groupRequests;
  idempotency: typeof idempotency;
  jobs: typeof jobs;
  "lib/adjacency": typeof lib_adjacency;
  "lib/dateUtils": typeof lib_dateUtils;
  "lib/email/ops": typeof lib_email_ops;
  "lib/email/resend": typeof lib_email_resend;
  "lib/email/retry": typeof lib_email_retry;
  "lib/email/templates": typeof lib_email_templates;
  "lib/errors": typeof lib_errors;
  "lib/formatters": typeof lib_formatters;
  "lib/idempotency": typeof lib_idempotency;
  "lib/pushover": typeof lib_pushover;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/rbac": typeof lib_rbac;
  "lib/scoring": typeof lib_scoring;
  "lib/setPredictor": typeof lib_setPredictor;
  "lib/shadowMetrics": typeof lib_shadowMetrics;
  "lib/snapshot": typeof lib_snapshot;
  "lib/stateMachine": typeof lib_stateMachine;
  "lib/tokens": typeof lib_tokens;
  "lib/turnstile": typeof lib_turnstile;
  notifications: typeof notifications;
  planning: typeof planning;
  reservations: typeof reservations;
  seed: typeof seed;
  settings: typeof settings;
  slots: typeof slots;
  specialPeriods: typeof specialPeriods;
  tables: typeof tables;
  tags: typeof tags;
  weeklyTemplates: typeof weeklyTemplates;
  widget: typeof widget;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
