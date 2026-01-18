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
import type * as availability from "../availability.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as emails from "../emails.js";
import type * as floor from "../floor.js";
import type * as globalSettings from "../globalSettings.js";
import type * as groupRequests from "../groupRequests.js";
import type * as idempotency from "../idempotency.js";
import type * as lib_dateUtils from "../lib/dateUtils.js";
import type * as lib_defaultSettings from "../lib/defaultSettings.js";
import type * as lib_email_ops from "../lib/email/ops.js";
import type * as lib_email_resend from "../lib/email/resend.js";
import type * as lib_email_retry from "../lib/email/retry.js";
import type * as lib_email_templates from "../lib/email/templates.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_idempotency from "../lib/idempotency.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_stateMachine from "../lib/stateMachine.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as lib_turnstile from "../lib/turnstile.js";
import type * as lib_validations from "../lib/validations.js";
import type * as reservations from "../reservations.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as slots from "../slots.js";
import type * as specialPeriods from "../specialPeriods.js";
import type * as weeklyTemplates from "../weeklyTemplates.js";
import type * as widget from "../widget.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  availability: typeof availability;
  crons: typeof crons;
  email: typeof email;
  emails: typeof emails;
  floor: typeof floor;
  globalSettings: typeof globalSettings;
  groupRequests: typeof groupRequests;
  idempotency: typeof idempotency;
  "lib/dateUtils": typeof lib_dateUtils;
  "lib/defaultSettings": typeof lib_defaultSettings;
  "lib/email/ops": typeof lib_email_ops;
  "lib/email/resend": typeof lib_email_resend;
  "lib/email/retry": typeof lib_email_retry;
  "lib/email/templates": typeof lib_email_templates;
  "lib/errors": typeof lib_errors;
  "lib/idempotency": typeof lib_idempotency;
  "lib/rbac": typeof lib_rbac;
  "lib/stateMachine": typeof lib_stateMachine;
  "lib/tokens": typeof lib_tokens;
  "lib/turnstile": typeof lib_turnstile;
  "lib/validations": typeof lib_validations;
  reservations: typeof reservations;
  seed: typeof seed;
  settings: typeof settings;
  slots: typeof slots;
  specialPeriods: typeof specialPeriods;
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
