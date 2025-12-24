# CONTRACTS_CONTEXT — Copiable (source: spec/CONTRACTS.md)

## 1) Formats & clés temps
- timezone default: Europe/Brussels
- dateKey: YYYY-MM-DD
- timeKey: HH:MM
- service: "lunch" | "dinner"
- slotKey: ${dateKey}#${service}#${timeKey}
- slotStartAt: ms (server) from dateKey/timeKey/timezone
- dayKey: server "today" in restaurant timezone

## X) Décisions verrouillées (cross-cutting)
- Turnstile: uniquement via Convex Actions (jamais Query/Mutation)
- Resend: uniquement via Convex Actions (jamais Query/Mutation)
- UI messages: toujours messageKey (pas de texte brut en DB, pas de texte brut dans les erreurs)
- MVP mono-restaurant: toutes les tables portent restaurantId
- Admin UI: pas de création phone/walk-in via UI (sources DB possibles, non exposées)

## 2) Statuts & règles de groupe
ReservationStatus: pending|confirmed|seated|completed|noshow|cancelled|refused

Transitions autorisées:
- pending -> confirmed
- pending -> refused
- pending -> cancelled
- confirmed -> seated
- confirmed -> cancelled
- seated -> completed
- confirmed -> noshow (uniquement via job dailyFinalize)

Group rules:
- <=4 => confirmed
- 5–15 => pending
- >=16 => groupRequest (no reservation)

## 3) Erreurs normalisées (shape + codes + meta)
Shape: { code, messageKey, meta? }

Codes:
- VALIDATION_ERROR
- TURNSTILE_FAILED
- RATE_LIMITED
- SLOT_TAKEN
- INSUFFICIENT_CAPACITY
- TOKEN_INVALID
- TOKEN_EXPIRED
- VERSION_CONFLICT
- TABLE_CONFLICT
- FORBIDDEN
- NOT_FOUND

messageKey mapping (exact):
- VALIDATION_ERROR -> error.validation
- TURNSTILE_FAILED -> error.turnstileFailed
- RATE_LIMITED -> error.rateLimited
- SLOT_TAKEN -> error.slotTaken
- INSUFFICIENT_CAPACITY -> error.insufficientCapacity
- TOKEN_INVALID -> error.tokenInvalid
- TOKEN_EXPIRED -> error.tokenExpired
- VERSION_CONFLICT -> error.versionConflict
- TABLE_CONFLICT -> error.tableConflict
- FORBIDDEN -> error.forbidden
- NOT_FOUND -> error.notFound

Meta:
- VALIDATION_ERROR.meta: { fieldErrors: Record<string,string> } (values are messageKey)
- RATE_LIMITED.meta: { retryAfterMs: number }
- SLOT_TAKEN.meta: { slotKey: string, reason?: "closed" | "taken" }
- INSUFFICIENT_CAPACITY.meta: { slotKey: string, requestedPartySize: number, remainingCapacity: number }
- VERSION_CONFLICT.meta: { expectedVersion: number, actualVersion: number }
- TABLE_CONFLICT.meta: { slotKey: string, tableIds: string[] }

## 4) Tables + indexes + invariants critiques
- restaurants:
  - champs: name, timezone (DEFAULT Europe/Brussels), isActive (DEFAULT true)
  - index: by_isActive(isActive)
  - invariant: MVP => exactement 1 restaurant actif

- settings:
  - champs critiques: restaurantId, publicWidgetEnabled, turnstileSiteKey, turnstileSecretKey (secret), resendFromEmail, resendFromName, maxPartySizeWidget, manageTokenExpireBeforeSlotMs, rateLimit
  - index: by_restaurantId(restaurantId) UNIQUE
  - invariants:
    - 1 doc settings par restaurantId
    - turnstileSecretKey jamais renvoyé par une Query

- slots:
  - champs critiques: restaurantId, dateKey, service, timeKey, slotKey, isOpen, capacity, maxGroupSize, largeTableAllowed, updatedAt
  - index: by_restaurant_slotKey(restaurantId, slotKey) UNIQUE
  - index: by_restaurant_date_service(restaurantId, dateKey, service)
  - invariants:
    - slotKey cohérent avec dateKey/service/timeKey
    - effectiveOpen = isOpen && capacity>0 ; si effectiveOpen=false => aucune création de réservation

- tables:
  - champs critiques: restaurantId, name (UNIQUE), zone, capacity, gridX, gridY, isActive, updatedAt
  - index: by_restaurant_name(restaurantId, name) UNIQUE
  - index: by_restaurant_isActive(restaurantId, isActive)

- reservations:
  - champs critiques: restaurantId, dateKey, service, timeKey, slotKey, adults, childrenCount, babyCount, partySize (computed), status, source, tableIds, _version
  - indexes: by_restaurant_slotKey(restaurantId, slotKey), by_restaurant_date_service(restaurantId, dateKey, service), by_restaurant_status(restaurantId, status)
  - invariants:
    - capacité slot: somme partySize des statuts pending|confirmed|seated <= slots.capacity
    - tables: aucune table assignée à 2 réservations sur le même slotKey (pending|confirmed|seated)
    - optimistic concurrency: expectedVersion requis sur toute mutation “state change” + _version++

- reservationTokens:
  - champs critiques: reservationId, token (UNIQUE), type="manage", expiresAt, usedAt (DEFAULT null), rotatedAt (DEFAULT null), createdAt
  - index: by_token(token) UNIQUE
  - index: by_reservation_type(reservationId, type) UNIQUE
  - invariants:
    - 1 doc par (reservationId,type)
    - actif: usedAt=null && expiresAt>now
    - expiresAt = slotStartAt - settings.manageTokenExpireBeforeSlotMs
    - rotation: update doc (token, expiresAt, usedAt=null, rotatedAt=now)

- groupRequests:
  - champ critique: partySize >= 16
  - invariant: ne crée jamais de reservation automatiquement

- emailJobs:
  - champs critiques: restaurantId, type, to, subjectKey, templateKey, templateData, icsBase64, status(queued|sent|failed), attemptCount, nextRetryAt, lastAttemptAt, lastErrorCode, dedupeKey, createdAt, updatedAt
  - index: by_status_nextRetryAt(status, nextRetryAt)
  - index: by_dedupeKey(dedupeKey) UNIQUE
  - invariant: dedupeKey UNIQUE (intent email)

- idempotencyKeys:
  - champs critiques: key (UNIQUE), action, requestHash, resultData, expiresAt
  - invariant: si key existe et requestHash diffère => VALIDATION_ERROR, sinon return resultData

## 5) API Convex (signatures exactes)

Common output DTOs (exact):
- Slot: { slotKey, dateKey, service, timeKey, isOpen, capacity, remainingCapacity, maxGroupSize }
  - Slot.isOpen = effectiveOpen (pas slots.isOpen brut)
- ReservationAdmin = ReservationBase + PII (email/phone en clair)
- ReservationStaff = ReservationBase + { emailMasked, phoneMasked } (pas email/phone en clair)
- SettingsPublic: { restaurantId, publicWidgetEnabled, turnstileSiteKey, maxPartySizeWidget, timezone }
- SettingsAdmin: SettingsPublic + { resendFromEmail, resendFromName, manageTokenExpireBeforeSlotMs, rateLimit }

Queries:
- availability.getDay(args: { dateKey: string, partySize: number }) -> { lunch: Slot[], dinner: Slot[] }
- availability.getMonth(args: { year: number, month: number, partySize: number }) -> DayState[]
- reservations.getByToken(args: { token: string }) -> ReservationView
  - Preconditions / errors (exact):
    - token missing OR usedAt!=null -> TOKEN_INVALID
    - expiresAt <= now(server) -> TOKEN_EXPIRED
- reservations.listByService(args: { dateKey: string, service: "lunch"|"dinner" }) -> (ReservationAdmin[] | ReservationStaff[])
- reservations.listPending(args: { dateKey?: string }) -> ReservationAdmin[]
- reservations.getAdmin(args: { reservationId: Id<"reservations"> }) -> ReservationAdmin
- reservations.getStaff(args: { reservationId: Id<"reservations"> }) -> ReservationStaff
- floor.getTables(args: { dateKey: string, service: "lunch"|"dinner", timeKey?: string }) -> TableWithState[]
- admin.getSettings(args: { }) -> SettingsAdmin
- widget.getSettings(args: { lang: "fr"|"nl"|"en"|"de"|"it" }) -> SettingsPublic

Mutations (DB only):
- reservations._create(args: { restaurantId: Id<"restaurants">, dateKey: string, service: "lunch"|"dinner", timeKey: string, adults: number, childrenCount: number, babyCount: number, firstName: string, lastName: string, email: string, phone: string, language: "fr"|"nl"|"en"|"de"|"it", source: "online"|"admin"|"phone"|"walkin" }) -> { reservationId: Id<"reservations">, status: ReservationStatus, manageToken: string, tokenExpiresAt: number }
- reservations._cancel(args: { reservationId: Id<"reservations">, cancelledBy: "token"|"admin", now: number, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }
  - Preconditions / errors (exact):
    - status must be pending|confirmed else VALIDATION_ERROR
    - requires expectedVersion and increments _version
- reservations.adminConfirm(args: { reservationId: Id<"reservations">, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }
- reservations.adminRefuse(args: { reservationId: Id<"reservations">, reasonKey: string, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }
- reservations.adminCancel(args: { reservationId: Id<"reservations">, expectedVersion: number, now: number }) -> { reservationId: Id<"reservations">, newVersion: number }
  - Preconditions / errors (exact):
    - status must be pending|confirmed else VALIDATION_ERROR
    - enqueues emailJobs type reservation.cancelled
- reservations.checkIn(args: { reservationId: Id<"reservations">, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }
- reservations.checkOut(args: { reservationId: Id<"reservations">, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }
- floor.assignTables(args: { reservationId: Id<"reservations">, tableIds: Id<"tables">[], expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }
- floor.upsertTable(args: { tableId?: Id<"tables">, restaurantId: Id<"restaurants">, name: string, zone: "dining"|"terrace", capacity: number, gridX: number, gridY: number, isActive: boolean }) -> { tableId: Id<"tables"> }
- availability.adminOverrideSlot(args: { slotKey: string, restaurantId: Id<"restaurants">, patch: { isOpen?: boolean, capacity?: number, maxGroupSize?: number|null, largeTableAllowed?: boolean } }) -> { slotKey: string }
- admin.updateSettings(args: { patch: Partial<SettingsAdmin> }) -> { ok: true }
- admin.updateSecrets(args: { patch: { turnstileSecretKey?: string } }) -> { ok: true }

Actions:
- reservations.create(args: { payload: { dateKey: string, service: "lunch"|"dinner", timeKey: string, adults: number, childrenCount: number, babyCount: number, firstName: string, lastName: string, email: string, phone: string, language: "fr"|"nl"|"en"|"de"|"it" }, turnstileToken: string, idemKey: string }) -> ({ kind: "reservation", reservationId: Id<"reservations">, status: ReservationStatus, manageUrlPath: string } | { kind: "groupRequest", groupRequestId: Id<"groupRequests"> })
  - Preconditions / errors (exact):
    - if effectiveOpen=false => SLOT_TAKEN meta.reason="closed"
    - if insufficient capacity => INSUFFICIENT_CAPACITY
    - if partySize>=16 => groupRequest (no reservation)
    - idempotency via idempotencyKeys (requestHash mismatch => VALIDATION_ERROR fieldErrors.idemKey="error.validation")
    - rateLimitKey = ip else hash(userAgent + acceptLanguage + dayKey)
- groupRequests.create(args: { payload: { partySize: number, preferredDateKey: string, preferredService: "lunch"|"dinner", firstName: string, lastName: string, email: string, phone: string, message: string, language: "fr"|"nl"|"en"|"de"|"it" }, turnstileToken: string, idemKey: string }) -> { groupRequestId: Id<"groupRequests"> }
- reservations.cancelByToken(args: { token: string, idemKey: string }) -> { reservationId: Id<"reservations"> }
- email.processQueue(args: { now: number }) -> { processedCount: number }
- email.sendJob(args: { jobId: Id<"emailJobs"> }) -> { ok: true }

Crons:
- */1 * * * *: email.processQueue({ now }) (envoi + retry)
- 0 3 * * *: jobs.dailyFinalize({ dateKey, now }) (confirmed->noshow ; seated->completed)
- 0 4 * * *: jobs.cleanup({ now }) (purge tokens/idempotency/emailJobs)

## 6) RBAC & masking (rules)
Roles: owner|admin|staff via Clerk claims

Masking staff email/phone (DEFAULT):
- Email:
  - split local@domain
  - localPrefix = first min(3, len(local)) chars
  - result = ${localPrefix}***@${domain}
  - if invalid/absent => "***"
- Phone:
  - extract digits
  - if len(digits) <= 3 => "***"
  - else => "*" * (len(digits)-3) + last3digits
