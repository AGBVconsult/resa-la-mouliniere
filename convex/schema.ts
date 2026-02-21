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
  v.literal("refused"),
  v.literal("incident")
);

const reservationSource = v.union(
  v.literal("online"),
  v.literal("admin"),
  v.literal("phone"),
  v.literal("walkin")
);

const tableZone = v.union(
  v.literal("salle"), 
  v.literal("terrasse"),
  v.literal("dining"),   // Deprecated, pour migration
  v.literal("terrace")   // Deprecated, pour migration
);
const combinationDirection = v.union(v.literal("horizontal"), v.literal("vertical"), v.literal("none"));

const emailJobType = v.union(
  v.literal("reservation.confirmed"),
  v.literal("reservation.pending"),
  v.literal("reservation.validated"),
  v.literal("reservation.refused"),
  v.literal("reservation.cancelled"),
  v.literal("reservation.modified"),
  v.literal("reservation.reminder"),
  v.literal("reservation.noshow"),
  v.literal("reservation.review"),
  v.literal("reservation.cancelled_by_restaurant"),
  v.literal("admin.notification")
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
    adminNotificationEmail: v.optional(v.string()), // Email to receive admin notifications (pending reservations)
    // Pushover push notifications
    pushoverUserKey: v.optional(v.string()),    // User Key from pushover.net
    pushoverApiToken: v.optional(v.string()),   // API Token from app
    pushoverEnabled: v.optional(v.boolean()),   // Toggle on/off
    maxPartySizeWidget: v.number(),
    manageTokenExpireBeforeSlotMs: v.number(),
    rateLimit: v.object({ windowMs: v.number(), maxRequests: v.number() }),
    // Progressive filling settings - slots after threshold are hidden until previous slot has min fill rate
    progressiveFilling: v.optional(v.object({
      enabled: v.boolean(),
      lunchThreshold: v.string(), // HH:MM - slots >= this time require previous slot fill (e.g. "13:00")
      dinnerThreshold: v.string(), // HH:MM - slots >= this time require previous slot fill (e.g. "19:00")
      minFillPercent: v.number(), // 0-100 - minimum fill % of previous slot to show next (e.g. 20)
    })),
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
    createdByPeriodId: v.optional(v.id("specialPeriods")),
  })
    .index("by_restaurant_slotKey", ["restaurantId", "slotKey"])
    .index("by_restaurant_date_service", ["restaurantId", "dateKey", "service"])
    .index("by_createdByPeriodId", ["createdByPeriodId"]),

  tables: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    zone: tableZone,
    capacity: v.number(),
    // Positionnement sur grille (en unités de cellule)
    positionX: v.optional(v.number()), // Migration: anciennement gridX
    positionY: v.optional(v.number()), // Migration: anciennement gridY
    gridX: v.optional(v.number()), // Deprecated, pour migration
    gridY: v.optional(v.number()), // Deprecated, pour migration
    // Dimensions (en cellules, défaut 1x1)
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    // Combinaison de tables
    combinationDirection: v.optional(combinationDirection),
    // État
    isActive: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_restaurant_name", ["restaurantId", "name"])
    .index("by_restaurant_isActive", ["restaurantId", "isActive"])
    .index("by_restaurant_zone", ["restaurantId", "zone"]),

  reservations: defineTable({
    restaurantId: v.id("restaurants"),
    dateKey: v.string(),
    service,
    timeKey: v.string(),
    slotKey: v.string(),

    clientId: v.optional(v.id("clients")),

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
    primaryTableId: v.optional(v.id("tables")), // Table cliquée lors de l'assignation (affichée dans le listing)

    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),

    cancelledAt: v.union(v.null(), v.number()),
    refusedAt: v.union(v.null(), v.number()),
    seatedAt: v.union(v.null(), v.number()),
    completedAt: v.union(v.null(), v.number()),
    noshowAt: v.union(v.null(), v.number()),
    markedNoshowAt: v.optional(v.union(v.null(), v.number())),
  })
    .index("by_restaurant_slotKey", ["restaurantId", "slotKey"])
    .index("by_restaurant_date_service", ["restaurantId", "dateKey", "service"])
    .index("by_restaurant_status", ["restaurantId", "status"]),

  // Track all status changes for analytics (punctuality, CRM, etc.)
  reservationEvents: defineTable({
    reservationId: v.id("reservations"),
    restaurantId: v.id("restaurants"),
    eventType: v.union(
      v.literal("status_change"),
      v.literal("table_assignment"),
      v.literal("created"),
      v.literal("updated")
    ),
    // Status change details
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    // Timing data for analytics
    scheduledTime: v.optional(v.string()), // e.g., "18:30" - the reservation time
    actualTime: v.number(), // When the action happened (timestamp)
    // Computed delay in minutes (positive = late, negative = early)
    delayMinutes: v.optional(v.number()),
    // Who performed the action
    performedBy: v.optional(v.string()), // User ID or "system"
    // Additional metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_restaurant_date", ["restaurantId", "createdAt"])
    .index("by_eventType", ["restaurantId", "eventType", "createdAt"]),

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
    .index("by_reservation_type", ["reservationId", "type"])
    .index("by_expiresAt", ["expiresAt"]),

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
      // Slots configuration for exceptional openings (status=modified)
      lunchSlots: v.optional(v.array(v.object({
        timeKey: v.string(),
        capacity: v.number(),
        isActive: v.boolean(),
        maxGroupSize: v.union(v.number(), v.null()),
      }))),
      dinnerSlots: v.optional(v.array(v.object({
        timeKey: v.string(),
        capacity: v.number(),
        isActive: v.boolean(),
        maxGroupSize: v.union(v.number(), v.null()),
      }))),
      lunchActiveDays: v.optional(v.array(v.number())), // Days for lunch service
      dinnerActiveDays: v.optional(v.array(v.number())), // Days for dinner service
    }),
    createdBy: v.string(), // userId Clerk
    createdAt: v.number(),
    updatedAt: v.number(),
    // Statistics fields for future analytics
    stats: v.optional(v.object({
      totalSlotsCreated: v.number(), // Number of slots created by this period
      totalSlotsModified: v.number(), // Number of existing slots modified
      totalDaysAffected: v.number(), // Number of days in the period
      totalCapacity: v.number(), // Sum of all slot capacities
      reservationsCount: v.optional(v.number()), // Reservations made during this period (updated async)
      reservationsPartySize: v.optional(v.number()), // Total party size of reservations
      revenue: v.optional(v.number()), // Revenue generated (if tracked)
    })),
    // Metadata for auditing
    deletedAt: v.optional(v.number()), // Soft delete timestamp
    deletedBy: v.optional(v.string()), // Who deleted it
    notes: v.optional(v.string()), // Admin notes
    tags: v.optional(v.array(v.string())), // Tags for categorization (e.g., "noel", "ete", "weekend")
    isRecurring: v.optional(v.boolean()), // If this period should recur yearly
    recurringSourceId: v.optional(v.id("specialPeriods")), // Reference to original period if copied
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

  clients: defineTable({
    primaryPhone: v.string(),
    phones: v.optional(v.array(v.string())),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    emails: v.optional(v.array(v.string())),
    searchText: v.string(),
    preferredLanguage: v.optional(language),
    totalVisits: v.number(),
    totalNoShows: v.number(),
    totalRehabilitatedNoShows: v.number(),
    totalCancellations: v.number(),
    totalLateCancellations: v.number(),
    totalDeparturesBeforeOrder: v.number(),
    score: v.number(),
    scoreVersion: v.string(),
    scoreBreakdown: v.optional(v.object({
      visits: v.number(),
      noshows: v.number(),
      lateCancels: v.number(),
    })),
    clientStatus: v.union(
      v.literal("new"),
      v.literal("regular"),
      v.literal("vip"),
      v.literal("bad_guest")
    ),
    isBlacklisted: v.optional(v.boolean()),
    needsRebuild: v.optional(v.boolean()),
    needsRebuildReason: v.optional(v.union(
      v.literal("reservation_backdated_edit"),
      v.literal("manual_merge"),
      v.literal("manual_correction"),
      v.literal("migration")
    )),
    needsRebuildAt: v.optional(v.number()),
    dietaryRestrictions: v.optional(v.array(v.string())),
    preferredZone: v.optional(v.string()),
    preferredTable: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.array(v.object({
      id: v.string(),
      content: v.string(),
      type: v.union(
        v.literal("preference"),
        v.literal("incident"),
        v.literal("info"),
        v.literal("alert")
      ),
      author: v.string(),
      createdAt: v.number(),
    }))),
    notesUpdatedAt: v.optional(v.number()),
    marketingConsent: v.optional(v.boolean()),
    marketingConsentAt: v.optional(v.number()),
    marketingConsentSource: v.optional(v.string()),
    acquisitionSource: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.string()),
    deletionReason: v.optional(v.string()),
    firstSeenAt: v.number(),
    lastVisitAt: v.optional(v.number()),
    lastUpdatedAt: v.number(),
    // Aggregated reservation stats
    totalReservations: v.optional(v.number()),
    lastTableId: v.optional(v.id("tables")),
    preferredTableId: v.optional(v.id("tables")),
    preferredService: v.optional(v.union(v.literal("lunch"), v.literal("dinner"))),
    avgPartySize: v.optional(v.number()),
    avgMealDurationMinutes: v.optional(v.number()),
    avgDelayMinutes: v.optional(v.number()),
    // Comportement client
    isLateClient: v.optional(v.boolean()),
    isSlowClient: v.optional(v.boolean()),
  })
    .index("by_primaryPhone", ["primaryPhone"])
    .index("by_email", ["email"])
    .index("by_lastVisitAt", ["lastVisitAt"])
    .index("by_score", ["score"])
    .index("by_status", ["clientStatus"])
    .index("by_needsRebuild", ["needsRebuild"])
    .index("by_deletedAt", ["deletedAt"])
    .searchIndex("search_client", {
      searchField: "searchText",
      filterFields: ["clientStatus", "preferredLanguage", "deletedAt"],
    }),

  crmDailyFinalizations: defineTable({
    dateKey: v.string(),
    status: v.union(v.literal("running"), v.literal("success"), v.literal("failed")),
    leaseExpiresAt: v.number(),
    lockOwner: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    processedReservations: v.number(),
    processedClients: v.number(),
    errorMessage: v.optional(v.string()),
    attempt: v.number(),
    version: v.string(),
  })
    .index("by_dateKey", ["dateKey"])
    .index("by_status", ["status"]),

  clientLedger: defineTable({
    dateKey: v.string(),
    clientId: v.id("clients"),
    reservationId: v.id("reservations"),
    outcome: v.union(
      v.literal("completed"),
      v.literal("completed_rehabilitated"),
      v.literal("noshow"),
      v.literal("cancelled"),
      v.literal("late_cancelled"),
      v.literal("departure_before_order")
    ),
    points: v.number(),
    createdAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_dateKey", ["dateKey"])
    .index("by_reservationId", ["reservationId"]),

  // PRD-011: Assignment Logs for Shadow Learning
  assignmentLogs: defineTable({
    // Versioning
    schemaVersion: v.literal(4),
    scoringVersion: v.union(v.literal("V0"), v.literal("V1"), v.literal("V2")),
    isTest: v.optional(v.boolean()),

    // Reservation snapshot
    restaurantId: v.id("restaurants"),
    reservationId: v.id("reservations"),
    reservationVersion: v.number(),
    date: v.string(),
    time: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    partySize: v.number(),
    partySizeCategory: v.union(
      v.literal("solo"),
      v.literal("couple"),
      v.literal("small_group"),
      v.literal("medium_group"),
      v.literal("large_group")
    ),
    childrenCount: v.optional(v.number()),
    babiesCount: v.optional(v.number()),

    // Tables snapshot (hybrid)
    tablesSnapshot: v.object({
      availableCount: v.number(),
      takenCount: v.number(),
      totalCount: v.number(),
      stateHash: v.string(),
      availableSample: v.array(v.id("tables")),
      takenSample: v.array(v.id("tables")),
      availableIds: v.optional(v.array(v.id("tables"))),
      takenIds: v.optional(v.array(v.id("tables"))),
      isFullSnapshot: v.boolean(),
    }),

    // Service occupancy
    serviceOccupancy: v.object({
      totalCovers: v.number(),
      totalCapacity: v.number(),
      capacitySource: v.literal("active_tables"),
      occupancyRate: v.number(),
      reservationsCount: v.number(),
      zoneOccupancies: v.object({
        salle: v.number(),
        terrasse: v.number(),
      }),
    }),

    // Human choice
    assignedTables: v.array(v.id("tables")),
    assignedTableNames: v.array(v.string()),
    assignedZone: v.union(v.literal("salle"), v.literal("terrasse"), v.literal("mixed")),
    assignedCapacity: v.number(),
    assignedIsAdjacent: v.boolean(),
    assignedBy: v.string(),
    assignmentMethod: v.union(
      v.literal("manual_click"),
      v.literal("suggestion_accepted"),
      v.literal("auto_vip"),
      v.literal("full_auto")
    ),

    // ML Prediction (optional, Phase 2+)
    mlPrediction: v.optional(v.object({
      predictedSet: v.array(v.id("tables")),
      predictedZone: v.union(v.literal("salle"), v.literal("terrasse"), v.literal("mixed")),
      predictedCapacity: v.number(),
      predictedIsAdjacent: v.boolean(),
      confidence: v.number(),
      alternativeSets: v.array(v.object({
        tableSet: v.array(v.id("tables")),
        zone: v.union(v.literal("salle"), v.literal("terrasse"), v.literal("mixed")),
        capacity: v.number(),
        isAdjacent: v.boolean(),
        confidence: v.number(),
      })),
      scoringDetails: v.object({
        capacityScore: v.number(),
        clientPreferenceScore: v.number(),
        zoneScore: v.number(),
        balanceScore: v.number(),
        adjacencyBonus: v.number(),
        characteristicsScore: v.number(),
      }),
    })),

    // Shadow metrics (comparison prediction vs choice)
    shadowMetrics: v.optional(v.object({
      exactSetMatch: v.boolean(),
      partialMatchRatio: v.number(),
      adjacencyMatch: v.boolean(),
      zoneMatch: v.boolean(),
      errorSeverity: v.union(
        v.literal("none"),
        v.literal("minor"),
        v.literal("major"),
        v.literal("critical")
      ),
      capacityWasteRatio: v.number(),
      wastePerSeat: v.number(),
      comparedAt: v.number(),
    })),

    // Feedback (outcome tracking)
    feedback: v.optional(v.object({
      outcome: v.union(
        v.literal("completed"),
        v.literal("noshow"),
        v.literal("cancelled"),
        v.literal("table_changed")
      ),
      actualSeatedAt: v.optional(v.number()),
      actualCompletedAt: v.optional(v.number()),
      tableChanged: v.boolean(),
      feedbackRecordedAt: v.number(),
    })),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_date", ["date"])
    .index("by_date_service", ["date", "service"])
    .index("by_scoring_version", ["scoringVersion"])
    .index("by_zone", ["assignedZone"])
    .index("by_created", ["createdAt"]),

  // Tags globaux pour les clients
  tags: defineTable({
    name: v.string(),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_name", ["name"]),
});
