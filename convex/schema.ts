import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const service = v.union(v.literal("lunch"), v.literal("dinner"));

const language = v.union(
  v.literal("fr"),
  v.literal("nl"),
  v.literal("en"),
  v.literal("de"),
  v.literal("it")
);

const reservationStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("seated"),
  v.literal("completed"),
  v.literal("noshow"),
  v.literal("cancelled"),
  v.literal("refused")
);

const reservationSource = v.union(
  v.literal("online"),
  v.literal("admin"),
  v.literal("phone"),
  v.literal("walkin")
);

const tableZone = v.union(v.literal("dining"), v.literal("terrace"));

const emailJobType = v.union(
  v.literal("reservation.confirmed"),
  v.literal("reservation.pending"),
  v.literal("reservation.validated"),
  v.literal("reservation.refused"),
  v.literal("reservation.cancelled"),
  v.literal("reservation.reminder"),
  v.literal("reservation.review")
);

const emailJobStatus = v.union(v.literal("queued"), v.literal("sent"), v.literal("failed"));

const groupRequestStatus = v.union(
  v.literal("pending"),
  v.literal("contacted"),
  v.literal("converted"),
  v.literal("declined")
);

const idempotencyAction = v.union(
  v.literal("reservations.create"),
  v.literal("reservations.updateByToken"),
  v.literal("reservations.cancelByToken"),
  v.literal("groupRequests.create")
);

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    timezone: v.string(),
    isActive: v.boolean(),
  }).index("by_isActive", ["isActive"]),

  settings: defineTable({
    restaurantId: v.id("restaurants"),
    publicWidgetEnabled: v.boolean(),
    appUrl: v.optional(v.string()), // Base URL for email links (e.g., https://lamouliniere.be)
    turnstileSiteKey: v.string(),
    turnstileSecretKey: v.string(),
    resendApiKey: v.optional(v.string()),
    resendFromEmail: v.string(),
    resendFromName: v.string(),
    maxPartySizeWidget: v.number(),
    manageTokenExpireBeforeSlotMs: v.number(),
    rateLimit: v.object({ windowMs: v.number(), maxRequests: v.number() }),
  }).index("by_restaurantId", ["restaurantId"]),

  slots: defineTable({
    restaurantId: v.id("restaurants"),
    dateKey: v.string(),
    service,
    timeKey: v.string(),
    slotKey: v.string(),
    isOpen: v.boolean(),
    capacity: v.number(),
    maxGroupSize: v.union(v.null(), v.number()),
    largeTableAllowed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_restaurant_slotKey", ["restaurantId", "slotKey"])
    .index("by_restaurant_date_service", ["restaurantId", "dateKey", "service"]),

  tables: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    zone: tableZone,
    capacity: v.number(),
    gridX: v.number(),
    gridY: v.number(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_restaurant_name", ["restaurantId", "name"])
    .index("by_restaurant_isActive", ["restaurantId", "isActive"]),

  reservations: defineTable({
    restaurantId: v.id("restaurants"),
    dateKey: v.string(),
    service,
    timeKey: v.string(),
    slotKey: v.string(),

    adults: v.number(),
    childrenCount: v.number(),
    babyCount: v.number(),
    partySize: v.number(),

    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    language,
    
    note: v.optional(v.string()),
    options: v.optional(v.array(v.string())),

    status: reservationStatus,
    source: reservationSource,

    tableIds: v.array(v.id("tables")),

    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),

    cancelledAt: v.union(v.null(), v.number()),
    refusedAt: v.union(v.null(), v.number()),
    seatedAt: v.union(v.null(), v.number()),
    completedAt: v.union(v.null(), v.number()),
    noshowAt: v.union(v.null(), v.number()),
  })
    .index("by_restaurant_slotKey", ["restaurantId", "slotKey"])
    .index("by_restaurant_date_service", ["restaurantId", "dateKey", "service"])
    .index("by_restaurant_status", ["restaurantId", "status"]),

  reservationTokens: defineTable({
    reservationId: v.id("reservations"),
    token: v.string(),
    type: v.literal("manage"),
    expiresAt: v.number(),
    usedAt: v.union(v.null(), v.number()),
    rotatedAt: v.union(v.null(), v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_reservation_type", ["reservationId", "type"]),

  groupRequests: defineTable({
    restaurantId: v.id("restaurants"),
    partySize: v.number(),
    preferredDateKey: v.string(),
    preferredService: service,
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    language,
    status: groupRequestStatus,
    reservationId: v.union(v.null(), v.id("reservations")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant_status", ["restaurantId", "status"])
    .index("by_restaurant_preferredDate", ["restaurantId", "preferredDateKey", "preferredService"]),

  emailJobs: defineTable({
    restaurantId: v.id("restaurants"),
    type: emailJobType,
    to: v.string(),
    subjectKey: v.string(),
    templateKey: v.string(),
    templateData: v.any(),
    icsBase64: v.union(v.null(), v.string()),
    status: emailJobStatus,
    attemptCount: v.number(),
    nextRetryAt: v.union(v.null(), v.number()),
    lastAttemptAt: v.union(v.null(), v.number()),
    lastErrorCode: v.union(v.null(), v.string()),
    dedupeKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_nextRetryAt", ["status", "nextRetryAt"])
    .index("by_dedupeKey", ["dedupeKey"]),

  idempotencyKeys: defineTable({
    key: v.string(),
    action: idempotencyAction,
    requestHash: v.string(),
    resultData: v.any(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expiresAt", ["expiresAt"]),

  // §5.10 specialPeriods
  specialPeriods: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(), // 2-50 caractères
    type: v.union(v.literal("holiday"), v.literal("closure"), v.literal("event")),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD, max 365j après startDate
    applyRules: v.object({
      status: v.union(v.literal("open"), v.literal("modified"), v.literal("closed")),
      services: v.array(service),
      activeDays: v.array(v.number()), // 1-7 ISO weekday
      overrideCapacity: v.optional(v.number()),
      maxGroupSize: v.optional(v.union(v.number(), v.null())),
      largeTableAllowed: v.optional(v.boolean()),
    }),
    createdBy: v.string(), // userId Clerk
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_type", ["restaurantId", "type"])
    .index("by_restaurant_dates", ["restaurantId", "startDate", "endDate"]),

  // §5.11 slotOverrides
  slotOverrides: defineTable({
    restaurantId: v.id("restaurants"),
    slotKey: v.string(), // ${dateKey}#${service}#${timeKey}
    origin: v.union(v.literal("manual"), v.literal("period")),
    patch: v.object({
      isOpen: v.optional(v.boolean()),
      capacity: v.optional(v.number()),
      maxGroupSize: v.optional(v.union(v.number(), v.null())),
      largeTableAllowed: v.optional(v.boolean()),
    }),
    specialPeriodId: v.optional(v.id("specialPeriods")), // requis si origin="period"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant_slotKey", ["restaurantId", "slotKey"])
    .index("by_restaurant_origin", ["restaurantId", "origin"])
    .index("by_specialPeriodId", ["specialPeriodId"]),

  // §5.13 weeklyTemplates
  weeklyTemplates: defineTable({
    restaurantId: v.id("restaurants"),
    dayOfWeek: v.number(), // 1-7 (ISO: 1=Lundi, 7=Dimanche)
    service,
    isOpen: v.boolean(),
    slots: v.array(v.object({
      timeKey: v.string(), // HH:MM
      capacity: v.number(), // 1-50
      isActive: v.boolean(),
      largeTableAllowed: v.boolean(),
      maxGroupSize: v.union(v.number(), v.null()),
    })),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_day_service", ["restaurantId", "dayOfWeek", "service"]),
});
