# PRD-001 : Widget de Réservation

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-001 |
| **Titre** | Widget de Réservation Client |
| **Statut** | ✅ **Validé - Prêt pour implémentation** |
| **Priorité** | P0 - Critique |
| **Version** | 1.4 |
| **Date création** | 2025-12-20 |
| **Dernière MAJ** | 2025-12-21 |
| **Responsable** | AGBVconsult |
| **Dépendances** | PRD-012 (Settings), PRD-005 (Créneaux) |
| **Score Qualité** | 99/100 |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-20 | Création initiale |
| 1.1 | 2025-12-21 | Alignement code (3 compteurs, Policy, tokens, i18n) |
| 1.2 | 2025-12-21 | Prod-grade : API contracts, state machine, idempotence, erreurs |
| 1.3 | 2025-12-21 | Fixes : ErrorCode/messageKey séparés, IDEMPOTENCY_MISMATCH, TTL 24h |
| 1.4 | 2025-12-21 | **Corrections finales P0** : route unifiée, grand groupe flow, naming childrenCount/babyCount, messageKey complètes, enum syntax, normalizeService fail-fast, token expiresAt recalculé |

---

## Table des Matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Architecture](#2-architecture)
3. [Spécifications Fonctionnelles](#3-spécifications-fonctionnelles)
4. [Page de Gestion /reservation/{token}](#4-page-de-gestion-reservationtoken)
5. [Formulaire Grand Groupe](#5-formulaire-grand-groupe)
6. [Schémas de Données](#6-schémas-de-données)
7. [API Contracts](#7-api-contracts)
8. [State Machine Réservations](#8-state-machine-réservations)
9. [Gestion Erreurs & Codes](#9-gestion-erreurs--codes)
10. [Idempotence & Déduplication](#10-idempotence--déduplication)
11. [Race Conditions & UX](#11-race-conditions--ux)
12. [Génération Calendrier](#12-génération-calendrier)
13. [Internationalisation](#13-internationalisation)
14. [Analytics](#14-analytics)
15. [Sécurité](#15-sécurité)
16. [Conventions & Mappings](#16-conventions--mappings)
17. [Écarts à Implémenter](#17-écarts-à-implémenter)
18. [Intégration Autres PRDs](#18-intégration-autres-prds)

---

## 1. Résumé Exécutif

### 1.1 Objectif

Fournir un widget de réservation en ligne intégrable via iframe, permettant aux clients de réserver une table de manière autonome 24h/24, avec une expérience fluide, mobile-first et multilingue.

### 1.2 Règles Métier Clés

| Règle | Valeur | Source |
|-------|--------|--------|
| Seuil confirmation auto | 1-4 personnes | PRD-012 |
| Seuil validation admin | 5-15 personnes | PRD-012 |
| Seuil grand groupe | >15 personnes | PRD-012 |
| Délai min réservation | `minBookingDelayMinutes` | PRD-012 |
| Avance max réservation | `maxBookingAdvanceMonths` | PRD-012 |
| Expiration pending | **Manuel** (admin gère, pas d'auto-expiration) | Ce PRD |
| Places restantes | **Non affichées** | Ce PRD |

### 1.3 Décisions Architecturales

| Décision | Choix | Justification |
|----------|-------|---------------|
| Route gestion client | `/reservation/{token}` | User-friendly, cohérent |
| Tokens gestion | Table séparée `reservationTokens` | Flexibilité, sécurité |
| Idempotence | Key client + dédup 60s + hash validation + TTL 24h | Protection maximale |
| Format erreurs | `{ ok, code, messageKey, meta? }` | i18n-friendly, code ≠ messageKey |
| Race condition | 2 alternatives même service + 1 autre service | Maximiser conversion |
| partySize | **Calculé serveur** (pas en input) | Source de vérité unique |
| Naming convives | `childrenCount` / `babyCount` | Cohérent DB/API/Zod |
| normalizeService | **Fail-fast** (pas de fallback silencieux) | Éviter bugs silencieux |

---

## 2. Architecture

### 2.1 Mode d'Intégration : Iframe

```
┌─────────────────────────────────────────────────────────────────┐
│                 INTÉGRATION IFRAME                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Site La Moulinière (lamouliniere.be)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  <iframe                                                │   │
│  │    src="https://app.lamouliniere.be/widget?lang=fr"    │   │
│  │    style="width:100%; min-height:600px; border:none;"  │   │
│  │    allow="clipboard-write"                              │   │
│  │  />                                                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  postMessage Protocol:                                          │
│  • WIDGET_RESIZE { height: number }                            │
│  • WIDGET_READY  { version: string }                           │
│  • WIDGET_ERROR  { code: string, message: string }             │
│                                                                 │
│  Allowed Origin: lamouliniere.be, *.lamouliniere.be            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Flux de Réservation (5 étapes)

```
┌─────────────────────────────────────────────────────────────────┐
│                 PARCOURS UTILISATEUR                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   ÉTAPE 1   │    │   ÉTAPE 2   │    │   ÉTAPE 3   │         │
│  │  Convives   │ →  │ Date+Heure  │ →  │ Coordonnées │         │
│  │             │    │             │    │             │         │
│  │  Adults     │    │  Calendrier │    │  Prénom     │         │
│  │  Children   │    │  + légende  │    │  Nom        │         │
│  │  Babies     │    │  + slots    │    │  Email      │         │
│  │  [Options]  │    │  midi/soir  │    │  Tél (+XX)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                                                       │
│         │ Si total > 15                                        │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ GRAND GROUPE│ → Redirect immédiat vers formulaire          │
│  │ (> 15 pers) │    groupRequest (pas de réservation)         │
│  └─────────────┘                                               │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐                            │
│  │   ÉTAPE 4   │    │   ÉTAPE 5   │                            │
│  │   Policy    │ →  │ Confirmation│                            │
│  │             │    │             │    Statut selon total:     │
│  │  Récap      │    │  ✓ Réservé  │    • 1-4  → confirmed     │
│  │  Annulation │    │  Calendrier │    • 5-15 → pending       │
│  │  Règles     │    │  Partage    │                            │
│  │  Turnstile  │    │             │                            │
│  └─────────────┘    └─────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Seuils de Validation

```
┌─────────────────────────────────────────────────────────────────┐
│                 LOGIQUE DE SEUILS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  partySize = adults + childrenCount + babyCount                │
│  (calculé serveur uniquement)                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1 ─────── 4 │ 5 ─────────────── 15 │ 16 ────────► ∞   │   │
│  │              │                       │                  │   │
│  │  CONFIRMED   │       PENDING         │   GROUP REQUEST  │   │
│  │  (auto)      │    (admin valide)     │   (formulaire)   │   │
│  │              │                       │                  │   │
│  │  • Email     │  • Email "en attente" │  • Redirect UI   │   │
│  │    confirmation│  • Admin notifié    │  • groupRequests │   │
│  │  • Capacité  │  • Capacité réservée  │  • Admin contacte│   │
│  │    déduite   │    (bloquée)          │  • Pas de résa   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  UI Behavior:                                                   │
│  • Counters autorisent 1-200 (pas de limite UI)                │
│  • Si total > 15 → redirect IMMÉDIAT vers formulaire groupe    │
│  • Mutation reservations.create refuse strictement > 15        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Spécifications Fonctionnelles

### 3.1 Éléments UI Communs

#### Header avec Récap Progressif

```
┌─────────────────────────────────────────────────────────────────┐
│  LA MOULINIÈRE   ●──○──○──○──○   🌐 FR ▼                       │
│  👥 4 convives   📅 27 déc.   🕐 13:00                          │
└─────────────────────────────────────────────────────────────────┘

• Logo + indicateur d'étape (5 cercles)
• Sélecteur de langue (FR/NL/EN/DE/IT)
• Récap progressif : s'enrichit à chaque étape validée
• Footer : "Visserskaai 14 - Oostende • Powered by AGBV Consult"
```

### 3.2 Étape 1 : Convives

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              Qui sera présent ?                                 │
│         Sélectionnez le nombre de convives                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Adultes                    [ − ]    2    [ + ]        │   │
│  │                                                         │   │
│  │  Enfants (2-12 ans)         [ − ]    1    [ + ]        │   │
│  │                                                         │   │
│  │  Bébés (0-2 ans)            [ − ]    1    [ + ]        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🍼 Besoin d'une chaise haute ?              ○          │   │ ← Si babyCount > 0
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ♿ Chaise roulante / PMR                     ○          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🐕 Je viens avec mon chien                   ○          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Total: 4 convives                      [Continuer →]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Règles Métier Counters

| Champ | Min UI | Max UI | Notes |
|-------|:------:|:------:|-------|
| Adultes | 1 | 200 | Au moins 1 requis |
| Enfants | 0 | 200 | 2-12 ans |
| Bébés | 0 | 200 | 0-2 ans |
| **Total** | 1 | **200** | Si > 15 → **Redirect immédiat** vers formulaire groupe |

#### Comportement Grand Groupe

```typescript
// Dès que total > 15, redirect IMMÉDIAT (pas d'attente clic "Continuer")
useEffect(() => {
  const total = adults + childrenCount + babyCount;
  if (total > 15) {
    redirectToGroupForm({ adults, childrenCount, babyCount });
  }
}, [adults, childrenCount, babyCount]);
```

#### Options Dynamiques

| Option | Condition d'affichage | Champ DB |
|--------|----------------------|----------|
| Chaise haute | `babyCount > 0` | `requiresHighChair` |
| PMR | Toujours | `requiresWheelchair` |
| Chien | Toujours | `requiresDogAccess` |

### 3.3 Étape 2 : Date & Heure

#### État Initial : Calendrier Mensuel

```
┌─────────────────────────────────────────────────────────────────┐
│         Quand souhaitez-vous venir ?                           │
│      Choisissez une date et un créneau horaire                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        ◀     Décembre 2025     ▶                        │   │
│  │                                                         │   │
│  │  LUN   MAR   MER   JEU   VEN   SAM   DIM               │   │
│  │   1     2     3     4     5     6     7                │   │
│  │   ─     ─     ─     ─     ─     ─     ─                │   │
│  │  15    16    17    18    19    20    21                │   │
│  │   ─     ─     ─     ─     ─     ─    🟠🔵              │   │
│  │  22    23    24    25    26    27    28                │   │
│  │   ─     ─     ─     ─    🔵   🟠🔵  🟠🔵              │   │
│  │                                                         │   │
│  │                    Légende                              │   │
│  │         🟠 Midi disponible   🔵 Soir disponible        │   │
│  │         ─  Fermé/Complet                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Note** : Les places restantes ne sont **jamais affichées** (décision produit).

#### Règles

| Règle | Comportement |
|-------|--------------|
| Jours passés | Grisés, non cliquables |
| Jours fermés | Tiret (─), non cliquables |
| Créneaux complets | **Masqués** |
| Places disponibles | **Non affichées** |
| Limite future | `maxBookingAdvanceMonths` |

### 3.4 Étape 3 : Coordonnées

```
┌─────────────────────────────────────────────────────────────────┐
│              Vos coordonnées                                    │
│           Dernière étape avant validation.                      │
│                                                                 │
│  Prénom *                    Nom *                              │
│  ┌───────────────────┐      ┌───────────────────────┐          │
│  │ Benjamin          │      │ Vantilcke             │          │
│  └───────────────────┘      └───────────────────────┘          │
│                                                                 │
│  Email *                                                        │
│  ┌─────────────────────────────────────────────────┐           │
│  │ bvantilcke@gmail.com                            │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  Téléphone *                                                    │
│  ┌──────┐ ┌────────────────────────────────────────┐           │
│  │ 🇧🇪 ▼│ │ +32 486 64 68 61                      │           │
│  └──────┘ └────────────────────────────────────────┘           │
│                                                                 │
│  Message (Allergies, terrasse...)                               │
│  ┌─────────────────────────────────────────────────┐           │
│  │                                                 │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Étape 4 : Policy

```
┌─────────────────────────────────────────────────────────────────┐
│            Informations importantes                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Récapitulatif                                          │   │
│  │  Date         samedi 27 décembre                        │   │
│  │  Heure        13:00                                     │   │
│  │  Convives     4 (2 adultes, 1 enfant, 1 bébé)          │   │
│  │  Contact      Benjamin Vantilcke                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Politique d'annulation                                 │   │
│  │  [texte configurable PRD-012]                          │   │
│  │  ☐ J'ai lu et j'accepte la politique d'annulation *    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Informations pratiques                                 │   │
│  │  [texte configurable PRD-012]                          │   │
│  │  ☐ J'ai pris connaissance des informations pratiques * │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Vérification de sécurité                               │   │
│  │  [Cloudflare Turnstile]                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Retour]                    [Confirmer la réservation]       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Étape 5 : Confirmation

```
┌─────────────────────────────────────────────────────────────────┐
│                         ✓ / 🕐                                  │
│                                                                 │
│        Merci ! / Demande en attente                            │
│   Votre table est réservée / En attente de confirmation        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             Samedi 27 Décembre 2025                     │   │
│  │  🕐 Heure           13:00                               │   │
│  │  👥 Convives        4 convives                          │   │
│  │  👤 Contact         Benjamin Vantilcke                  │   │
│  │  📧 Email           bvantilcke@gmail.com                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────────┐  ┌───────────────────────┐          │
│  │  📅 Ajouter au        │  │  ↗️ Partager          │          │
│  │     calendrier ▼      │  │                       │          │
│  │  ────────────────     │  └───────────────────────┘          │
│  │  Google Calendar      │                                     │
│  │  Apple Calendar       │                                     │
│  │  Télécharger .ics     │                                     │
│  └───────────────────────┘                                     │
│                                                                 │
│  📧 Un email de confirmation a été envoyé.                     │
│     Vous pouvez modifier ou annuler via le lien dans l'email.  │
└─────────────────────────────────────────────────────────────────┘
```

#### Statut Visuel

| Condition | Icône | Couleur | Titre | Sous-titre |
|-----------|:-----:|:-------:|-------|------------|
| `partySize <= 4` | ✓ | Vert | "Merci !" | "Votre table est réservée" |
| `partySize >= 5` | 🕐 | Ambre | "Demande reçue" | "En attente de confirmation" |

---

## 4. Page de Gestion /reservation/{token}

### 4.1 Accès

```
URL: https://app.lamouliniere.be/reservation/{token}
Token: 32 caractères alphanumériques (table reservationTokens)
Expiration: 2h avant le service (recalculée si modification)
```

**Lien dans l'email de confirmation** :
```
Gérer votre réservation : https://app.lamouliniere.be/reservation/{token}
```

### 4.2 Périmètre de Modification

| Champ | Modifiable | Justification |
|-------|:----------:|---------------|
| Date | ✅ | Re-check capacité + **recalcul expiresAt** |
| Heure | ✅ | Re-check capacité + **recalcul expiresAt** |
| adults/childrenCount/babyCount | ✅ | Re-check capacité + potentiel repassage pending |
| Options (PMR, chien, chaise) | ✅ | Pas d'impact capacité |
| Message | ✅ | Pas d'impact capacité |
| Prénom | ❌ | Risque vol de réservation |
| Nom | ❌ | Risque vol de réservation |
| Email | ❌ | Confusion CRM |
| Téléphone | ❌ | Confusion CRM |

### 4.3 Recalcul Token expiresAt

```typescript
// Dans modifyReservation, si date ou time changent :
async function modifyReservation(input: ModifyInput) {
  // ... validation ...
  
  // Si date ou time modifiés, recalculer expiresAt du token
  if (input.date || input.time) {
    const newServiceTime = parseServiceTime(
      input.date ?? reservation.date,
      input.time ?? reservation.time
    );
    const newExpiresAt = newServiceTime - (2 * 60 * 60 * 1000); // 2h avant
    
    await db.patch(token._id, { expiresAt: newExpiresAt });
  }
  
  // ... reste de la modification ...
}
```

### 4.4 Comportement usedAt du Token

| Action | Marque usedAt ? | Comportement validateToken après |
|--------|:---------------:|----------------------------------|
| Modify | ❌ Non | Token reste utilisable |
| Cancel | ✅ Oui | Retourne `{ valid: true, canModify: false, canCancel: false }` + statut "cancelled" |

### 4.5 Règles Temporelles

| Situation | Comportement |
|-----------|--------------|
| > 2h avant service | Modification et annulation autorisées |
| ≤ 2h avant service | Message "Veuillez nous contacter par téléphone" |
| Token expiré | Message erreur + contact téléphone |
| Token déjà utilisé (annulation) | Affiche "Réservation déjà annulée" |

---

## 5. Formulaire Grand Groupe

### 5.1 Déclenchement

**Redirect IMMÉDIAT** quand `partySize > 15` (dès que le total dépasse 15 dans les counters).

### 5.2 Données Pré-remplies

Le formulaire reçoit les valeurs déjà saisies :
```typescript
redirectToGroupForm({
  adults,        // Pré-rempli
  childrenCount, // Pré-rempli
  babyCount,     // Pré-rempli
});
```

### 5.3 Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                 WORKFLOW GRAND GROUPE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  UI: total > 15 détecté                                        │
│       │                                                         │
│       ▼                                                         │
│  Redirect immédiat vers formulaire                              │
│       │                                                         │
│       ▼                                                         │
│  Client soumet                                                  │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────┐                                           │
│  │ groupRequests   │                                           │
│  │ status: pending │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│     ┌─────┴─────┐                                              │
│     ▼           ▼                                              │
│  Email        Email                                            │
│  Admin        Client                                           │
│  (notif)      (accusé réception)                               │
│                                                                 │
│  Admin traite la demande                                       │
│       │                                                         │
│       ├──► contacted (en discussion avec client)               │
│       │                                                         │
│       ├──► converted (réservation créée manuellement)          │
│       │       └──► reservationId renseigné                     │
│       │                                                         │
│       └──► declined (refusé, capacité insuffisante)            │
│                                                                 │
│  Note: Pas d'expiration automatique, traitement manuel.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Schémas de Données

### 6.1 Table `reservations`

```typescript
reservations: defineTable({
  // ═══ RÉFÉRENCE CLIENT ═══
  clientId: v.optional(v.id("clients")),
  
  // ═══ SNAPSHOT CLIENT ═══
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.string(),
  
  // ═══ CRÉNEAU ═══
  date: v.string(),                    // "YYYY-MM-DD" (timezone resto)
  time: v.string(),                    // "HH:MM" (timezone resto)
  service: v.union(v.literal("midi"), v.literal("soir")),
  
  // ═══ CONVIVES ═══
  partySize: v.number(),               // Calculé serveur: adults + childrenCount + babyCount
  adults: v.number(),
  childrenCount: v.optional(v.number()),  // ⚠️ Naming unifié
  babyCount: v.optional(v.number()),      // ⚠️ Naming unifié
  
  // ═══ OPTIONS ═══
  requiresHighChair: v.optional(v.boolean()),
  requiresDogAccess: v.optional(v.boolean()),
  requiresWheelchair: v.optional(v.boolean()),
  
  // ═══ STATUT ═══
  status: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("refused"),
    v.literal("cancelled"),
    v.literal("seated"),
    v.literal("completed"),
    v.literal("noshow")
  ),
  
  // ═══ SOURCE ═══
  source: v.union(
    v.literal("online"),
    v.literal("admin"),
    v.literal("phone"),
    v.literal("walkin")
  ),
  
  // ═══ COMMUNICATION ═══
  clientMessage: v.optional(v.string()),
  internalNotes: v.optional(v.string()),
  language: v.union(
    v.literal("fr"), v.literal("nl"), v.literal("en"),
    v.literal("de"), v.literal("it")
  ),
  
  // ═══ TIMESTAMPS ═══
  createdAt: v.number(),
  updatedAt: v.number(),
  cancelledAt: v.optional(v.number()),
  cancelReason: v.optional(v.string()),
  seatedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  
  // ═══ EMAILS ═══
  confirmationSentAt: v.optional(v.number()),
  reminderSentAt: v.optional(v.number()),
  reviewRequestSentAt: v.optional(v.number()),
  
  // ═══ TABLES ═══
  tableIds: v.optional(v.array(v.id("tables"))),
  
  // ═══ TEST ═══
  isTestData: v.optional(v.boolean()),
})
  .index("by_date_service", ["date", "service"])
  .index("by_client", ["clientId"])
  .index("by_status", ["status"])
  .index("by_email", ["email"])
```

### 6.2 Table `reservationTokens`

```typescript
reservationTokens: defineTable({
  reservationId: v.id("reservations"),
  token: v.string(),                     // 32 chars sécurisés
  type: v.literal("manage"),             // Token unique pour modify + cancel
  expiresAt: v.number(),                 // 2h avant service (RECALCULÉ si modif date/time)
  usedAt: v.optional(v.number()),        // Marqué SEULEMENT après annulation
})
  .index("by_token", ["token"])
  .index("by_reservation", ["reservationId"])
```

### 6.3 Table `groupRequests`

```typescript
groupRequests: defineTable({
  partySize: v.number(),                 // > 15
  preferredDate: v.string(),
  preferredService: v.union(
    v.literal("midi"),
    v.literal("soir"),
    v.literal("flexible")
  ),
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.string(),
  message: v.optional(v.string()),
  language: v.union(
    v.literal("fr"), v.literal("nl"), v.literal("en"),
    v.literal("de"), v.literal("it")
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("contacted"),
    v.literal("converted"),
    v.literal("declined")
  ),
  createdAt: v.number(),
  handledAt: v.optional(v.number()),
  handledBy: v.optional(v.string()),
  notes: v.optional(v.string()),
  reservationId: v.optional(v.id("reservations")),
})
  .index("by_status", ["status"])
  .index("by_date", ["createdAt"])
```

### 6.4 Table `idempotencyKeys`

```typescript
idempotencyKeys: defineTable({
  key: v.string(),                       // UUID généré côté client
  action: v.string(),                    // "reservation_create"
  requestHash: v.string(),               // SHA256 des params pour validation mismatch
  resultReservationId: v.optional(v.id("reservations")),
  resultData: v.optional(v.any()),       // Réponse complète mise en cache
  createdAt: v.number(),
  expiresAt: v.number(),                 // createdAt + IDEMPOTENCY_TTL_MS
})
  .index("by_key", ["key"])
  .index("by_expires", ["expiresAt"])    // Pour cleanup TTL
```

**Constantes Idempotence** :

```typescript
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
const DEDUP_WINDOW_MS = 60 * 1000;              // 60 secondes
```

---

## 7. API Contracts

### 7.1 Format Standard Réponse

```typescript
// Succès
type SuccessResponse<T> = {
  ok: true;
  data: T;
};

// Erreur métier
type ErrorResponse = {
  ok: false;
  code: ErrorCode;           // Code technique pour logique/analytics
  messageKey: MessageKey;    // Clé i18n pour affichage (DIFFÉRENT du code)
  meta?: Record<string, any>;
};

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

### 7.2 Mutation `reservations.create`

```typescript
// Input — NOTE: partySize n'est PAS dans l'input (calculé serveur)
type CreateReservationInput = {
  // Identité
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Créneau
  date: string;              // "YYYY-MM-DD"
  time: string;              // "HH:MM"
  service: "midi" | "soir";
  
  // Convives (partySize calculé: adults + childrenCount + babyCount)
  adults: number;            // 1-12
  childrenCount?: number;    // 0-10, naming unifié
  babyCount?: number;        // 0-5, naming unifié
  
  // Options
  requiresHighChair?: boolean;
  requiresDogAccess?: boolean;
  requiresWheelchair?: boolean;
  
  // Communication
  clientMessage?: string;
  language: "fr" | "nl" | "en" | "de" | "it";
  
  // Sécurité
  turnstileToken: string;
  idempotencyKey: string;    // UUID côté client
};

// Output (succès)
type CreateReservationOutput = {
  ok: true;
  data: {
    reservationId: string;
    partySize: number;       // Calculé serveur
    status: "confirmed" | "pending";
    managementUrl: string;   // https://app.lamouliniere.be/reservation/{token}
  };
};
```

### 7.3 Mutation `reservations.modify`

```typescript
type ModifyReservationInput = {
  token: string;
  
  // Optionnels - seuls les champs présents sont modifiés
  date?: string;
  time?: string;
  service?: "midi" | "soir";
  adults?: number;
  childrenCount?: number;
  babyCount?: number;
  requiresHighChair?: boolean;
  requiresDogAccess?: boolean;
  requiresWheelchair?: boolean;
  clientMessage?: string;
};

type ModifyReservationOutput = {
  ok: true;
  data: {
    reservationId: string;
    newPartySize: number;
    newStatus: "confirmed" | "pending";
    tokenExpiresAt: number;  // Recalculé si date/time modifiés
  };
};
```

### 7.4 Query `availability.getMonthOverview`

```typescript
type GetMonthOverviewInput = {
  year: number;
  month: number;             // 1-12
  partySize: number;
};

// Output — utilise "midi"/"soir" (cohérent avec DB)
type GetMonthOverviewOutput = {
  ok: true;
  data: {
    days: Array<{
      date: string;
      midi: "available" | "closed" | "full";
      soir: "available" | "closed" | "full";
      disabled: boolean;
    }>;
    timezone: string;
  };
};
```

---

## 8. State Machine Réservations

### 8.1 Diagramme d'États

```
┌─────────────────────────────────────────────────────────────────┐
│                 STATE MACHINE RESERVATIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────┐                             │
│                    │   pending   │ ◄─── Création (partySize≥5) │
│                    └──────┬──────┘                             │
│                           │                                     │
│            ┌──────────────┼──────────────┐                     │
│            ▼              ▼              ▼                     │
│     ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│     │ confirmed│   │  refused │   │cancelled │                │
│     └────┬─────┘   └──────────┘   └──────────┘                │
│          │                              ▲                      │
│          │                              │                      │
│     ┌────┴────────┬─────────────────────┤                     │
│     ▼             ▼                     │                      │
│ ┌────────┐   ┌──────────┐         ┌──────────┐                │
│ │ seated │   │ noshow   │         │(cancelled│                │
│ └───┬────┘   └──────────┘         │ by client)               │
│     │                              └──────────┘                │
│     ▼                                                          │
│ ┌───────────┐                                                  │
│ │ completed │                                                  │
│ └───────────┘                                                  │
│                                                                 │
│  Création directe (partySize 1-4) ──► confirmed                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Transitions Autorisées

| De | Vers | Acteur | Condition |
|----|------|--------|-----------|
| `(new)` | `pending` | System | `partySize >= 5` |
| `(new)` | `confirmed` | System | `partySize < 5` |
| `pending` | `confirmed` | Admin | Validation |
| `pending` | `refused` | Admin | Refus |
| `pending` | `cancelled` | Client (token) | Annulation |
| `confirmed` | `cancelled` | Client (token) | > 2h avant service |
| `confirmed` | `cancelled` | Admin | Toujours |
| `confirmed` | `seated` | Admin | Client arrivé |
| `confirmed` | `noshow` | Admin | Client absent |
| `seated` | `completed` | Admin/Auto | Fin de service |

---

## 9. Gestion Erreurs & Codes

### 9.1 Enum ErrorCode (Codes Techniques)

```typescript
export enum ErrorCode {
  // Validation
  INVALID_INPUT = "INVALID_INPUT",
  
  // Dates
  DATE_PAST = "DATE_PAST",
  DATE_TOO_FAR = "DATE_TOO_FAR",
  
  // Capacité
  SLOT_CLOSED = "SLOT_CLOSED",
  SLOT_TAKEN = "SLOT_TAKEN",
  CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED",
  PARTY_SIZE_EXCEEDED = "PARTY_SIZE_EXCEEDED",  // > 15
  
  // Sécurité
  TURNSTILE_FAILED = "TURNSTILE_FAILED",
  RATE_LIMITED = "RATE_LIMITED",
  
  // Tokens
  TOKEN_NOT_FOUND = "TOKEN_NOT_FOUND",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_USED = "TOKEN_USED",
  
  // Modification
  MODIFICATION_DEADLINE = "MODIFICATION_DEADLINE",
  
  // Idempotence
  DUPLICATE_SUBMIT = "DUPLICATE_SUBMIT",
  IDEMPOTENCY_MISMATCH = "IDEMPOTENCY_MISMATCH",
  
  // Général
  NOT_FOUND = "NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

### 9.2 Enum MessageKey (Clés i18n)

```typescript
export enum MessageKey {
  // Validation générale
  invalid_input = "invalid_input",
  required = "required",
  
  // Validation champs
  min_2_chars = "min_2_chars",
  max_50_chars = "max_50_chars",
  max_500_chars = "max_500_chars",
  invalid_email = "invalid_email",
  invalid_phone = "invalid_phone",
  invalid_date_format = "invalid_date_format",   // ⚠️ Ajouté
  invalid_time_format = "invalid_time_format",   // ⚠️ Ajouté
  invalid_service = "invalid_service",           // ⚠️ Ajouté (pour normalizeService fail-fast)
  
  // Convives
  min_1_adult = "min_1_adult",
  max_12_adults = "max_12_adults",
  max_10_children = "max_10_children",
  max_5_babies = "max_5_babies",
  max_15_total = "max_15_total",
  party_size_exceeded = "party_size_exceeded",   // > 15 sur mutation
  
  // Dates
  date_past = "date_past",
  date_too_far = "date_too_far",
  slot_closed = "slot_closed",
  
  // Capacité
  slot_taken = "slot_taken",
  capacity_exceeded = "capacity_exceeded",
  
  // Sécurité
  turnstile_failed = "turnstile_failed",
  rate_limited = "rate_limited",
  
  // Tokens
  token_not_found = "token_not_found",
  token_expired = "token_expired",
  token_used = "token_used",
  
  // Modification
  modification_deadline = "modification_deadline",
  
  // Idempotence
  duplicate_submit = "duplicate_submit",
  idempotency_mismatch = "idempotency_mismatch",
  
  // Policies
  policy_required = "policy_required",
  rules_required = "rules_required",
  
  // Général
  not_found = "not_found",
  internal_error = "internal_error",
}
```

### 9.3 Mapping Code → MessageKey

```typescript
// ⚠️ Utiliser la syntaxe enum correcte
export const codeToMessageKey: Record<ErrorCode, MessageKey> = {
  [ErrorCode.INVALID_INPUT]: MessageKey.invalid_input,
  [ErrorCode.DATE_PAST]: MessageKey.date_past,
  [ErrorCode.DATE_TOO_FAR]: MessageKey.date_too_far,
  [ErrorCode.SLOT_CLOSED]: MessageKey.slot_closed,
  [ErrorCode.SLOT_TAKEN]: MessageKey.slot_taken,
  [ErrorCode.CAPACITY_EXCEEDED]: MessageKey.capacity_exceeded,
  [ErrorCode.PARTY_SIZE_EXCEEDED]: MessageKey.party_size_exceeded,
  [ErrorCode.TURNSTILE_FAILED]: MessageKey.turnstile_failed,
  [ErrorCode.RATE_LIMITED]: MessageKey.rate_limited,
  [ErrorCode.TOKEN_NOT_FOUND]: MessageKey.token_not_found,
  [ErrorCode.TOKEN_EXPIRED]: MessageKey.token_expired,
  [ErrorCode.TOKEN_USED]: MessageKey.token_used,
  [ErrorCode.MODIFICATION_DEADLINE]: MessageKey.modification_deadline,
  [ErrorCode.DUPLICATE_SUBMIT]: MessageKey.duplicate_submit,
  [ErrorCode.IDEMPOTENCY_MISMATCH]: MessageKey.idempotency_mismatch,
  [ErrorCode.NOT_FOUND]: MessageKey.not_found,
  [ErrorCode.INTERNAL_ERROR]: MessageKey.internal_error,
};
```

### 9.4 Exemples Réponses Erreur

```typescript
// Créneau plus disponible avec alternatives
{
  ok: false,
  code: ErrorCode.SLOT_TAKEN,
  messageKey: MessageKey.slot_taken,
  meta: {
    alternatives: [
      { date: "2025-12-27", time: "19:30", service: "soir" },
      { date: "2025-12-27", time: "20:00", service: "soir" },
      { date: "2025-12-27", time: "13:00", service: "midi" }
    ]
  }
}

// Party size > 15 sur mutation (ne devrait pas arriver si UI bien faite)
{
  ok: false,
  code: ErrorCode.PARTY_SIZE_EXCEEDED,
  messageKey: MessageKey.party_size_exceeded,
  meta: {
    maxAllowed: 15,
    received: 18
  }
}

// Service invalide (normalizeService fail-fast)
{
  ok: false,
  code: ErrorCode.INVALID_INPUT,
  messageKey: MessageKey.invalid_service,
  meta: {
    field: "service",
    received: "DINNER "
  }
}
```

---

## 10. Idempotence & Déduplication

### 10.1 Constantes

```typescript
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;  // 24 heures
const DEDUP_WINDOW_MS = 60 * 1000;                // 60 secondes
```

### 10.2 Flow Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                 IDEMPOTENCE FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client génère idempotencyKey (UUID)                           │
│  Stocké en sessionStorage                                       │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   reservations.create                    │   │
│  │                                                         │   │
│  │  1. Check idempotencyKey existe ?                       │   │
│  │     └─► OUI et expiresAt > now:                         │   │
│  │         └─► Check requestHash match ?                   │   │
│  │             └─► OUI → Retourner résultat mis en cache   │   │
│  │             └─► NON → Erreur IDEMPOTENCY_MISMATCH       │   │
│  │     └─► OUI mais expiresAt <= now → Traiter comme NON   │   │
│  │     └─► NON → Continuer                                 │   │
│  │                                                         │   │
│  │  2. Check dédup 60s (email + date + time + service)     │   │
│  │     └─► Trouvé → Erreur DUPLICATE_SUBMIT                │   │
│  │     └─► Pas trouvé → Continuer                          │   │
│  │                                                         │   │
│  │  3. Vérifications métier (Turnstile, rate limit, etc.)  │   │
│  │                                                         │   │
│  │  4. Créer réservation                                   │   │
│  │                                                         │   │
│  │  5. Enregistrer idempotencyKey + requestHash + expiresAt│   │
│  │                                                         │   │
│  │  6. Retourner succès                                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Cleanup: Cron supprime WHERE expiresAt < now                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Calcul requestHash

```typescript
function computeRequestHash(input: CreateReservationInput): string {
  // Inclut l'essentiel + phone (identité minimale)
  const normalized = JSON.stringify({
    email: input.email.toLowerCase().trim(),
    phone: input.phone,
    date: input.date,
    time: input.time,
    service: input.service,
    adults: input.adults,
    childrenCount: input.childrenCount ?? 0,
    babyCount: input.babyCount ?? 0,
  });
  return sha256(normalized);
}
```

---

## 11. Race Conditions & UX

### 11.1 Stratégie Alternatives (2 même service + 1 autre)

```typescript
async function getAlternativeSlots(
  originalDate: string,
  originalTime: string,
  service: "midi" | "soir",
  partySize: number
): Promise<AlternativeSlot[]> {
  const alternatives: AlternativeSlot[] = [];
  const otherService = service === "midi" ? "soir" : "midi";
  
  // 1. Même jour, même service (max 2)
  const sameDaySlots = await getAvailableSlots(originalDate, partySize);
  const sameDaySameService = sameDaySlots[service]
    .filter(s => s.available && s.time !== originalTime)
    .sort((a, b) => 
      Math.abs(timeToMinutes(a.time) - timeToMinutes(originalTime)) -
      Math.abs(timeToMinutes(b.time) - timeToMinutes(originalTime))
    )
    .slice(0, 2);
  
  alternatives.push(...sameDaySameService.map(s => ({
    date: originalDate,
    time: s.time,
    service,
  })));
  
  // 2. Même jour, autre service (max 1)
  const sameDayOtherService = sameDaySlots[otherService]
    .filter(s => s.available)
    .slice(0, 1);
  
  alternatives.push(...sameDayOtherService.map(s => ({
    date: originalDate,
    time: s.time,
    service: otherService,
  })));
  
  // 3. Si toujours < 3, jour suivant même créneau
  if (alternatives.length < 3) {
    const nextDay = addDays(originalDate, 1);
    const nextDaySlots = await getAvailableSlots(nextDay, partySize);
    const nextDaySlot = nextDaySlots[service]
      .find(s => s.available && s.time === originalTime);
    
    if (nextDaySlot) {
      alternatives.push({
        date: nextDay,
        time: nextDaySlot.time,
        service,
      });
    }
  }
  
  return alternatives.slice(0, 3);
}
```

---

## 12. Génération Calendrier

### 12.1 Règle Timezone

```
Stockage DB:
• date: "YYYY-MM-DD" (timezone restaurant: Europe/Brussels)
• time: "HH:MM" (timezone restaurant)

Génération ICS:
• Convertir explicitement vers UTC
• Format DTSTART/DTEND avec "Z" suffix
```

---

## 13. Internationalisation

### 13.1 Langues Supportées

| Code | Langue | Couverture |
|------|--------|------------|
| `fr` | Français | 100% |
| `nl` | Néerlandais | 100% |
| `en` | Anglais | 100% |
| `de` | Allemand | 100% |
| `it` | Italien | 100% |

### 13.2 Structure Traductions

```typescript
// Fichier: locales/{lang}/errors.json
// Toutes les MessageKey doivent être présentes
{
  "invalid_input": "Données invalides",
  "invalid_date_format": "Format de date invalide (attendu: AAAA-MM-JJ)",
  "invalid_time_format": "Format d'heure invalide (attendu: HH:MM)",
  "invalid_service": "Service invalide (attendu: midi ou soir)",
  "slot_taken": "Ce créneau vient d'être réservé",
  "party_size_exceeded": "Maximum 15 personnes pour une réservation en ligne",
  "rate_limited": "Trop de tentatives, veuillez patienter {retryAfter} secondes",
  // ... toutes les MessageKey
}
```

---

## 14. Analytics

### 14.1 Événements

| Événement | Priorité |
|-----------|:--------:|
| `widget_view` | P0 |
| `booking_started` | P0 |
| `widget_date_selected` | P0 |
| `widget_time_selected` | P0 |
| `booking_form_completed` | P0 |
| `reservation_created` | P0 |
| `reservation_cancelled` | P0 |
| `group_form_redirect` | P0 |
| `slot_unavailable_shown` | P1 |
| `alternative_selected` | P1 |

---

## 15. Sécurité

### 15.1 Turnstile (Anti-Bot)

```typescript
// Format de requête: application/x-www-form-urlencoded (standard Cloudflare)
async function verifyTurnstile(token: string): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append('secret', process.env.TURNSTILE_SECRET_KEY!);
  formData.append('response', token);
  
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    }
  );
  
  const data = await response.json();
  return data.success === true;
}
```

### 15.2 Rate Limiting

| Action | Limite | Fenêtre | Identifiant |
|--------|:------:|:-------:|-------------|
| `reservation_create` | 3 | 60s | email |
| `reservation_modify` | 5 | 60s | token |
| `reservation_cancel` | 3 | 60s | token |
| `group_request` | 2 | 60s | email |
| `token_validate` | 10 | 60s | IP |

### 15.3 Tokens

```typescript
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const TOKEN_LENGTH = 32;

function generateSecureToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => SAFE_CHARS[byte % SAFE_CHARS.length]).join('');
}
// Combinaisons: 58^32 ≈ 10^56
```

---

## 16. Conventions & Mappings

### 16.1 Mapping Service (Fail-Fast)

```typescript
// ⚠️ PAS de fallback silencieux — fail fast sur input inconnu
const validServices = new Set(["midi", "soir", "lunch", "dinner"]);

const serviceMapping: Record<string, "midi" | "soir"> = {
  midi: "midi",
  soir: "soir",
  lunch: "midi",
  dinner: "soir",
};

function normalizeService(input: string): "midi" | "soir" {
  const normalized = input.toLowerCase().trim();
  
  if (!validServices.has(normalized)) {
    // ⚠️ FAIL FAST — pas de fallback silencieux
    throw new ApiError({
      code: ErrorCode.INVALID_INPUT,
      messageKey: MessageKey.invalid_service,
      meta: { field: "service", received: input }
    });
  }
  
  return serviceMapping[normalized];
}
```

### 16.2 Naming Unifié Convives

| Contexte | Champ | Type |
|----------|-------|------|
| API Input | `childrenCount` | `number` |
| API Input | `babyCount` | `number` |
| DB Table | `childrenCount` | `v.optional(v.number())` |
| DB Table | `babyCount` | `v.optional(v.number())` |
| Zod Schema | `childrenCount` | `z.number()` |
| Zod Schema | `babyCount` | `z.number()` |

**Aucun usage de `children` ou `babies`** (pour éviter le mapping inutile).

---

## 17. Écarts à Implémenter

### 17.1 Priorité P0 (Critique)

| Fonctionnalité | Effort |
|----------------|:------:|
| Page `/reservation/{token}` | Moyen |
| Mutation `modifyReservation` + recalcul expiresAt | Moyen |
| Table `idempotencyKeys` + logique + expiresAt | Faible |
| Vérification `IDEMPOTENCY_MISMATCH` | Faible |
| Grand groupe redirect + form | Moyen |

### 17.2 Priorité P1 (Important)

| Fonctionnalité | Effort |
|----------------|:------:|
| Génération .ics | Faible |
| Alternatives SLOT_TAKEN (2+1) | Faible |
| Rate limit modify/cancel | Faible |

---

## 18. Intégration Autres PRDs

| PRD | Intégration |
|-----|-------------|
| **PRD-012 Settings** | Seuils, textes policy, timezone |
| **PRD-005 Créneaux** | `getAvailableDays`, `getAvailableSlots` |
| **PRD-008 Emails** | Confirmation, rappel, annulation |
| **PRD-003 CRM** | Liaison `clientId`, stats VIP |

---

## Annexe A: Schémas Zod (Naming Unifié)

```typescript
// === Constantes ===
export const VALIDATION_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 50,
  MESSAGE_MAX: 500,
  ADULTS_MIN: 1,
  ADULTS_MAX: 12,
  CHILDREN_MAX: 10,
  BABIES_MAX: 5,
  // UI autorise jusqu'à 200, mais mutation refuse > 15
  TOTAL_GUESTS_MAX_ONLINE: 15,
  TOTAL_GUESTS_MAX_UI: 200,
} as const;

// === Atomiques ===
export const nameSchema = z.string().trim()
  .min(2, { message: MessageKey.min_2_chars })
  .max(50, { message: MessageKey.max_50_chars });

export const emailSchema = z.string().trim().toLowerCase()
  .min(1, { message: MessageKey.required })
  .email({ message: MessageKey.invalid_email });

export const phoneSchema = z.string()
  .min(1, { message: MessageKey.required })
  .regex(/^\+[1-9]\d{7,14}$/, { message: MessageKey.invalid_phone });

export const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: MessageKey.invalid_date_format });

export const timeStringSchema = z.string()
  .regex(/^\d{2}:\d{2}$/, { message: MessageKey.invalid_time_format });

export const serviceSchema = z.enum(['midi', 'soir'], {
  errorMap: () => ({ message: MessageKey.invalid_service })
});

export const languageSchema = z.enum(['fr', 'nl', 'en', 'de', 'it']);

// === Convives (naming unifié: childrenCount, babyCount) ===
export const guestCountsSchema = z.object({
  adults: z.number().int()
    .min(1, { message: MessageKey.min_1_adult })
    .max(12, { message: MessageKey.max_12_adults }),
  childrenCount: z.number().int()     // ⚠️ Naming unifié
    .min(0)
    .max(10, { message: MessageKey.max_10_children })
    .default(0),
  babyCount: z.number().int()         // ⚠️ Naming unifié
    .min(0)
    .max(5, { message: MessageKey.max_5_babies })
    .default(0),
}).refine(
  data => data.adults + data.childrenCount + data.babyCount <= 15,
  { message: MessageKey.max_15_total, path: ['adults'] }
);

// === Contact ===
export const contactDetailsSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().max(500, { message: MessageKey.max_500_chars }).optional().default(''),
  requiresHighChair: z.boolean().default(false),
  requiresDogAccess: z.boolean().default(false),
  requiresWheelchair: z.boolean().default(false),
});

// === Policies ===
export const policiesSchema = z.object({
  acceptPolicy: z.literal(true, { errorMap: () => ({ message: MessageKey.policy_required }) }),
  acceptRules: z.literal(true, { errorMap: () => ({ message: MessageKey.rules_required }) }),
});

// === Group Request ===
export const groupRequestSchema = z.object({
  partySize: z.number().int().min(16).max(200),
  preferredDate: dateStringSchema,
  preferredService: z.enum(['midi', 'soir', 'flexible']),
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().max(1000).optional(),
  language: languageSchema,
});
```

---

## Annexe B: Checklist Implémentation

```
□ Route unifiée /reservation/{token} partout (code, emails, docs)
□ UI counters autorisent 1-200 (pas de limite UI)
□ Redirect immédiat si total > 15 (useEffect)
□ Mutation refuse strictement partySize > 15
□ Naming unifié: childrenCount, babyCount (Zod, API, DB)
□ MessageKey: invalid_date_format, invalid_time_format, invalid_service ajoutées
□ codeToMessageKey utilise syntaxe enum [ErrorCode.X]: MessageKey.y
□ normalizeService fail-fast (pas de fallback)
□ Token expiresAt recalculé si date/time modifiés
□ Table idempotencyKeys avec champ expiresAt
□ Rate limit sur modify/cancel
□ Cleanup idempotencyKeys WHERE expiresAt < now
```

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0 | 2025-12-20 | Claude | Création initiale |
| 1.1 | 2025-12-21 | Claude | Alignement code (3 compteurs, Policy, tokens, i18n) |
| 1.2 | 2025-12-21 | Claude | Prod-grade : API contracts, state machine, idempotence, erreurs |
| 1.3 | 2025-12-21 | Claude | Fixes : ErrorCode/messageKey séparés, IDEMPOTENCY_MISMATCH, TTL 24h |
| 1.4 | 2025-12-21 | Claude | **Corrections finales P0** : route `/reservation/{token}`, grand groupe redirect immédiat, naming `childrenCount`/`babyCount`, messageKey complètes, enum syntax, `normalizeService` fail-fast, token `expiresAt` recalculé, `idempotencyKeys.expiresAt` |
