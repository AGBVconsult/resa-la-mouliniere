# Rapport d'implémentation — Réduire les réservations non abouties (`bookingDrafts`)

_Analyse du 2026-07-19 — La Moulinière. Aucune modification de code n'a été effectuée._

---

## 1. Résumé exécutif

La table `bookingDrafts` capte aujourd'hui **une partie seulement** des réservations
abandonnées, et **rien n'est fait des données captées** : elles sont enregistrées mais
jamais affichées à l'équipe, jamais relancées, jamais nettoyées.

Trois constats structurants :

1. **Le brouillon n'est créé qu'à l'étape 3→4** (après saisie du contact). Or la majorité
   des abandons d'un tunnel de réservation se produisent **avant** cette étape (choix
   convives, date, créneau). Ces abandons ne sont pas dans la table.
2. **La capacité de récupération existe déjà à moitié dans le code mais est inerte** :
   la query `list` (dashboard admin) n'est branchée à aucune interface, le `cleanup` n'est
   pas déclenché par un cron, et le champ `lastStep` est écrit en dur à `4`.
3. **Aucun canal de relance** (email/SMS) n'est branché sur ces brouillons, alors que toute
   l'infrastructure d'envoi (Resend + file `emailJobs`) est déjà en place et éprouvée.

L'objectif « réduire au maximum les réservations non abouties » se décompose en deux
leviers complémentaires : **(A) diminuer le taux d'abandon** (UX du tunnel) et
**(B) récupérer les abandons** (relance). Ce rapport traite les deux, avec un chiffrage
d'effort et un ordre de priorité.

---

## 2. Architecture actuelle

### 2.1 Schéma (`convex/schema.ts:633`)

```ts
bookingDrafts: defineTable({
  restaurantId: v.id("restaurants"),
  sessionId: v.string(),          // UUID généré côté widget
  firstName, lastName, email, phone,
  language: v.optional(language),
  adults, childrenCount, babyCount,
  dateKey, service, timeKey, note: v.optional(...),
  lastStep: v.number(),           // « 4 = infos pratiques, 5 = récap »
  referralSource: v.optional(v.string()),
  convertedAt, reservationId,     // DEPRECATED (rétrocompat)
  createdAt, updatedAt, expiresAt, // TTL 7 jours
})
  .index("by_sessionId", ["sessionId"])
  .index("by_restaurant_date", ["restaurantId", "dateKey"])
  .index("by_expiresAt", ["expiresAt"])
```

### 2.2 Fonctions (`convex/bookingDrafts.ts`)

| Fonction | Type | Rôle | État |
|---|---|---|---|
| `save` | mutation | Upsert par `sessionId` | **Actif** (appelé au step 3→4) |
| `deleteDraft` | mutation | Supprime après confirmation | **Actif** (appelé au succès) |
| `list` | query | Liste pour dashboard admin | ⚠️ **Aucun consommateur** |
| `cleanup` | internalMutation | Purge des drafts expirés | ⚠️ **Jamais déclenché** (absent de `crons.ts`) |

### 2.3 Flux réel (`src/app/widget/components/Widget.tsx`)

```
Step 1 (convives) → 1b (bébé) → 2 (date/heure) → 3 (contact)
   → [saveDraft ICI, lastStep=4]  → 4 (infos pratiques) → 5 (récap/CGV)
   → [confirmation → deleteDraft]  → 6 (succès)
```

- `sessionId` = `generateUUID()` recréé **à chaque montage du widget** (`useState`).
- `saveDraft(...)` est **fire-and-forget** (`.catch(() => {})`), avec `lastStep: 4` **en dur**.
- À la confirmation, `deleteDraft({ sessionId })`.

**Conséquence :** tout brouillon encore présent en base = un client ayant saisi ses
coordonnées **sans confirmer**. C'est un signal commercial de forte valeur (contact
complet + intention datée) — aujourd'hui totalement inexploité.

---

## 3. Diagnostic — écarts et angles morts

### 3.1 Bloquants / bugs latents

- **C1 — `cleanup` orphelin.** `internal.bookingDrafts.cleanup` n'est référencé nulle part
  dans `convex/crons.ts`. Les brouillons expirés (`expiresAt`) ne sont **jamais purgés** →
  accumulation illimitée et **risque RGPD** (données contact conservées sans limite ni
  base légale claire).
- **C2 — `list` non branché.** La query existe mais aucun composant admin ne l'appelle
  (seul `Widget.tsx` référence `bookingDrafts`). **L'équipe ne voit jamais** les
  réservations non abouties → impossible de rappeler le client à la main.
- **C3 — `lastStep` inexploitable.** Toujours écrit à `4`. Impossible de distinguer un
  abandon « infos pratiques » (step 4) d'un abandon « récap/CGV » (step 5), pourtant très
  différents en intention.

### 3.2 Angle mort principal : les abandons précoces ne sont pas captés

Le brouillon naît à l'étape contact. **Les abandons steps 1/1b/2 — statistiquement les plus
nombreux — n'entrent jamais dans la table.** On ne mesure donc qu'une fraction du problème,
et on ne peut relancer personne qui n'a pas laissé d'email (par nature, avant le step 3).
Les événements GA4 (`trackStepView`, `trackNoSlotsAvailable`…) existent mais vivent
**séparément** de Convex : pas de jointure, pas d'alerte, pas d'action possible côté back.

### 3.3 Identité et reprise de session

- **C4 — Pas de reprise.** `sessionId` régénéré à chaque chargement → un client qui recharge
  la page repart de zéro **et** crée un second brouillon. Aucune restauration de la saisie.
- **C5 — Pas de dédup par personne.** Un même email peut générer N brouillons (N sessions).
  Le « nombre de réservations non abouties » est donc **surévalué** et non dédupliqué.

### 3.4 Conformité (RGPD)

- **C6 — Consentement de relance non capté.** `clients` porte `marketingConsent*`, mais
  `bookingDrafts` ne capte aucun consentement. Toute relance commerciale par email suppose
  une base légale (intérêt légitime documenté **ou** consentement) + lien de désinscription.

### 3.5 Pilotage

- **C7 — Aucun KPI.** Pas de taux de conversion tunnel, pas de taux d'abandon par étape,
  pas de délai avant abandon, pas de suivi de l'efficacité d'une éventuelle relance.

---

## 4. Recommandations d'implémentation

Classées par rapport **impact / effort**. Effort indicatif : ⚡ faible (≤ ½ j),
⚙️ moyen (1–2 j), 🏗️ conséquent (> 2 j).

### Levier B — Récupérer les abandons déjà captés (contact présent)

#### R1 — Brancher le cron de nettoyage ⚡ _(corrige C1)_
Ajouter dans `convex/crons.ts` un déclenchement quotidien de `internal.bookingDrafts.cleanup`
(ex. `0 4 * * *`). Purge des drafts expirés → hygiène de données + conformité. Le `cleanup`
actuel traite 100 lignes/exécution ; le passer en boucle jusqu'à épuisement si le volume est
élevé.

#### R2 — Dashboard « Réservations non abouties » ⚙️ _(corrige C2, C3)_
Créer une page admin (ex. `src/app/(admin)/admin/abandons/`) consommant `bookingDrafts.list`,
avec pour chaque ligne : contact, party size, date/service/créneau souhaités, étape atteinte,
ancienneté, source (`referralSource`), et **actions rapides** : « Appeler », « Envoyer un
lien de reprise », « Créer la réservation manuellement », « Ignorer ». C'est le levier le plus
rapidement rentable : l'équipe rappelle un contact chaud, avec toutes les infos déjà saisies.
> Prérequis : `list` renvoie tous les drafts sans pagination ni filtre d'expiration — ajouter
> pagination, tri par `updatedAt`, et exclusion des expirés.

#### R3 — Email de relance automatique (« panier abandonné ») 🏗️ _(nouveau)_
Réutiliser l'infra existante (`emails.enqueue` + `emailJobs` + Resend, cf.
`convex/emails.ts`). Ajouter :
1. un type `booking.recovery` dans `EmailJobType` + template i18n (fr/nl/en/de/it/es —
   les langues sont déjà gérées) contenant un **lien de reprise** pré-rempli ;
2. un cron `enqueueDraftRecovery` (ex. toutes les 30 min) qui sélectionne les drafts
   `updatedAt` vieux de **1–2 h** (fenêtre de politesse), non convertis, avec email valide et
   base légale OK, puis `enqueue` un email — **une seule relance par draft** (via `dedupeKey`,
   mécanisme déjà présent dans `enqueue`).
3. marquer le draft (`recoveryEmailSentAt`) pour ne pas relancer deux fois.

Séquence recommandée : **1 relance à H+1–2h** (la plus rentable), option J+1 si non converti.
Ne jamais relancer un draft dont la date souhaitée est déjà passée.

#### R4 — Lien de reprise de session ⚙️ _(corrige C4, alimente R2/R3)_
Générer un token de reprise (réutiliser le pattern `reservation/[token]` déjà présent dans
`src/app/reservation/[token]`) pointant vers `/widget?draft=<token>` qui réhydrate
`BookingState` depuis le draft. Indispensable pour que R2 et R3 aient un CTA efficace
(« Reprendre ma réservation en 1 clic »).

### Levier A — Réduire le taux d'abandon en amont

#### R5 — Capter les abandons précoces (steps 1–2) ⚙️ _(corrige l'angle mort 3.2)_
Faire un premier `saveDraft` **dès la sélection d'un créneau (step 2→3)**, avant le contact,
puis mettre à jour le draft à chaque étape. Deux implications :
- rendre `firstName/lastName/email/phone` **optionnels** dans `save` (schéma déjà `v.string()` —
  passer en `v.optional`) pour permettre un draft « anonyme » sans contact ;
- écrire le **vrai** `lastStep` (2, 3, 4, 5) au lieu de `4` en dur → funnel exploitable.
Un draft sans email ne sera pas relançable par mail, mais alimente les **KPI d'abandon par
étape** (R8) et les décisions UX.

#### R6 — Persistance locale + reprise à chaud ⚡ _(corrige C4)_
Stocker `sessionId` + `BookingState` en `localStorage` et réhydrater au montage du widget.
Bénéfice immédiat : un rechargement de page ne perd plus la saisie et ne duplique plus le
draft. Faible effort, fort impact anti-abandon « accidentel ».

#### R7 — Réduction des frictions du tunnel ⚙️ _(analyse UX à mener)_
Croiser les événements GA4 déjà instrumentés (`trackNoSlotsAvailable`,
`trackContactFormError`, `trackStepView`) avec `lastStep` (une fois R5 en place) pour cibler :
- **« pas de créneau dispo »** : proposer dates/services alternatifs au lieu d'une impasse ;
- **erreurs de formulaire contact** : identifier le champ bloquant (`trackContactFormError`) ;
- **abandon step 5 (CGV/récap)** : politique d'annulation/empreinte perçue comme risquée →
  travailler le wording rassurant.

### Gouvernance & mesure (transverse)

#### R8 — KPIs & agrégats ⚙️ _(corrige C7)_
Ajouter une query admin d'agrégation : taux de conversion tunnel, taux d'abandon **par
étape** (nécessite R5), délai moyen avant abandon, taux de récupération post-relance (R3),
répartition par `referralSource`. Socle de pilotage pour prioriser les optimisations UX.

#### R9 — Conformité RGPD ⚡ _(corrige C1, C6)_
- Documenter la **base légale** de la relance (intérêt légitime : réservation entamée) et
  informer dans la politique de confidentialité.
- Ajouter un **lien de désinscription** dans l'email de relance (R3).
- Confirmer la purge automatique (R1) et l'aligner sur une durée de rétention explicite
  (7 j actuels = raisonnable pour un draft).
- Ne jamais relancer un contact ayant confirmé, annulé, ou s'étant désinscrit.

#### R10 — Dédup par email/téléphone ⚡ _(corrige C5)_
Ajouter un index `by_restaurant_email` et, dans le dashboard/KPI, regrouper les drafts d'un
même contact pour ne pas surcompter et ne pas sur-solliciter.

---

## 5. Feuille de route proposée

| Phase | Contenu | Effort | Effet attendu |
|---|---|---|---|
| **P0 — Hygiène & visibilité** | R1 (cron cleanup) · R2 (dashboard) · R3 partiel (relance manuelle depuis le dashboard) | ⚙️ | L'équipe voit et rappelle les contacts chauds. Fin de l'accumulation RGPD. |
| **P1 — Récupération auto** | R3 (email auto) · R4 (lien de reprise) · R9 (RGPD) | 🏗️ | Récupération sans intervention humaine, 24/7. |
| **P2 — Réduction des abandons** | R5 (capter steps précoces + vrai `lastStep`) · R6 (localStorage) · R8 (KPI) | ⚙️ | Mesure fine du funnel + moins d'abandons accidentels. |
| **P3 — Optimisation continue** | R7 (frictions ciblées) · R10 (dédup) | ⚙️ | Amélioration itérative pilotée par les KPI. |

**Recommandation de démarrage :** P0 d'abord — effort modéré, aucun risque, et il transforme
immédiatement une table dormante en outil commercial actionnable. R1 (le cron) devrait être
corrigé sans attendre, indépendamment du reste.

---

## 6. Points d'attention techniques

- **`save` fire-and-forget** : acceptable pour ne pas bloquer le tunnel, mais on perd le
  signal d'échec. Pour R5, garder le fire-and-forget mais logger les échecs côté client.
- **Champs `convertedAt` / `reservationId`** marqués deprecated : le modèle actuel
  **supprime** le draft à la conversion plutôt que de le marquer converti. Choix cohérent,
  mais il **empêche de mesurer le taux de conversion** au niveau de la table (on ne garde que
  les échecs). Pour R8, envisager de **marquer** (soft-convert) au lieu de supprimer, avec
  purge différée — sinon s'appuyer sur GA4 pour le dénominateur.
- **Multi-restaurant** : `save` prend le restaurant `isActive` unique ; cohérent avec le reste
  du code (`enqueueReminders` skip si plusieurs actifs). À garder en tête si extension.
- **Volume d'emails** : plafonner la relance (1/draft) et respecter la fenêtre de politesse
  pour préserver la réputation d'expédition Resend et éviter le spam.

---

_Fin du rapport. Aucun fichier de code n'a été modifié ; ce document est une note d'analyse._
