# Rapport de Mesure du Widget de Réservation — La Moulinière

## Date : 26 février 2026

---

## 1. État Actuel du Tracking

### 1.1 Ce qui existe

| Élément | Statut | Détail |
|---------|--------|--------|
| Web Vitals (LCP, FCP, CLS, INP, TTFB) | Implémenté | `src/lib/web-vitals.ts` — envoi vers Vercel Analytics |
| GA4 natif (first_visit, scroll, click, file_download) | En place (côté lamouliniere.be) | Événements automatiques GA4 uniquement |
| Google Tag Manager | **NON IMPLÉMENTÉ** | Aucune balise GTM dans le code |
| Événements GA4 personnalisés (widget) | **NON IMPLÉMENTÉ** | Aucun `gtag()` ou `dataLayer.push()` dans le code |
| Funnel configuré dans GA4 | **NON CONFIGURÉ** | Aucun entonnoir de conversion |
| UTM tracking | **NON SYSTÉMATISÉ** | Pas de capture UTM dans le widget |
| Cross-domain tracking | **NON VÉRIFIÉ** | lamouliniere.be ↔ resa.lamouliniere.be |

### 1.2 Constat

Le widget de réservation (`/widget`) comporte **6 étapes** (+ 1 sous-étape bébé), mais **aucune de ces étapes n'est instrumentée**. On ne sait pas :
- Combien de visiteurs commencent le formulaire
- À quelle étape ils abandonnent
- Quel est le taux de conversion global
- Quels sont les parcours qui mènent à la réservation

---

## 2. Cartographie Complète du Funnel Widget

### 2.1 Flux utilisateur réel (code source analysé)

```
┌─────────────────────────────────────────────────────────────────────┐
│  FUNNEL WIDGET — 6 ÉTAPES + SOUS-ÉTAPE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ÉTAPE 1 — Convives (Step1Guests)                                  │
│  ├── Choix : adultes, enfants, bébés                               │
│  ├── Options : poussette, PMR, chien                               │
│  └── Condition : min 1 adulte, max 15 total                       │
│       │                                                             │
│       ├── Si bébé > 0 ─────────────────────────────┐               │
│       │                                             ▼               │
│       │                              ÉTAPE 1B — Bébé (Step1Baby)   │
│       │                              └── Choix : genoux/chaise     │
│       │                                             │               │
│       ├── Si > 15 ───── REDIRECT → /widget/group-request           │
│       │                                                             │
│       ▼                                                             │
│  ÉTAPE 2 — Date & Heure (Step2DateTime)                            │
│  ├── Sélection date via calendrier mensuel                         │
│  ├── Sélection service : midi / soir                               │
│  └── Sélection créneau horaire                                     │
│       │                                                             │
│       ▼                                                             │
│  ÉTAPE 3 — Contact (Step3Contact)                                  │
│  ├── Prénom, Nom                                                    │
│  ├── Email, Téléphone (+32)                                        │
│  ├── Message optionnel                                              │
│  └── Validation formulaire                                          │
│       │                                                             │
│       ▼                                                             │
│  ÉTAPE 4 — Infos Pratiques (Step5PracticalInfo)                    │
│  ├── Retard 15 min = annulation                                     │
│  ├── Paiement : Payconiq / espèces (pas CB)                       │
│  └── Confirmation email                                             │
│       │                                                             │
│       ▼                                                             │
│  ÉTAPE 5 — Récapitulatif & Confirmation (Step4Policy)              │
│  ├── Résumé complet de la réservation                               │
│  ├── Turnstile (anti-bot)                                           │
│  └── Bouton "Confirmer la réservation"                              │
│       │                                                             │
│       ▼                                                             │
│  ÉTAPE 6 — Confirmation (Step6Confirmation)                        │
│  ├── Statut : confirmé ✓ ou en attente ⏱                          │
│  ├── Récapitulatif final                                            │
│  └── Actions : ajout calendrier, partage, retour site              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Points de friction identifiés dans le code

| Point | Risque d'abandon | Détail |
|-------|:----------------:|--------|
| Step 1 → Step 1B | Moyen | Sous-étape bébé = friction supplémentaire |
| Step 1 → Redirect groupe | Fort | Redirection vers formulaire séparé si >15 pers. |
| Step 2 — Aucun créneau dispo | Fort | Message "aucun créneau" = dead end |
| Step 3 — Validation formulaire | Moyen | Erreurs email/téléphone peuvent frustrer |
| Step 5 — Turnstile | Moyen | Challenge anti-bot = délai/friction |
| Step 5 — Erreur réseau/slot pris | Fort | `SLOT_TAKEN`, `NETWORK_ERROR` = abandon |
| Widget désactivé | Total | Message statique si `publicWidgetEnabled = false` |

---

## 3. Plan de Mesure Proposé — Événements GA4 Personnalisés

### 3.1 Événements de Funnel (P0 — Priorité maximale)

| # | Événement GA4 | Déclencheur | Paramètres | Fichier source |
|---|---------------|-------------|------------|----------------|
| 1 | `widget_view` | Widget chargé (mount Step 1) | `language`, `source` (UTM) | `Widget.tsx` |
| 2 | `widget_step_guests` | Step 1 affichée | `adults`, `children`, `babies`, `party_size` | `Step1Guests.tsx` |
| 3 | `widget_step_baby` | Step 1B affichée | `baby_count`, `baby_seating` | `Step1Baby.tsx` |
| 4 | `widget_step_datetime` | Step 2 affichée | `party_size` | `Step2DateTime.tsx` |
| 5 | `widget_date_selected` | Date choisie dans le calendrier | `date_key`, `party_size` | `Step2DateTime.tsx` |
| 6 | `widget_time_selected` | Créneau choisi | `date_key`, `service` (lunch/dinner), `time_key` | `Step2DateTime.tsx` |
| 7 | `widget_step_contact` | Step 3 affichée | `party_size`, `service` | `Step3Contact.tsx` |
| 8 | `widget_contact_completed` | Formulaire contact validé | `has_message` (bool) | `Step3Contact.tsx` |
| 9 | `widget_step_practical_info` | Step 4 affichée | — | `Step5PracticalInfo.tsx` |
| 10 | `widget_step_summary` | Step 5 (récap) affichée | `party_size`, `service`, `options_count` | `Step4Policy.tsx` |
| 11 | `widget_submit_attempt` | Clic "Confirmer" | `turnstile_ready` (bool) | `Step4Policy.tsx` |
| 12 | `widget_reservation_created` | Réservation réussie | `status` (confirmed/pending), `party_size`, `service`, `language` | `Step4Policy.tsx` |
| 13 | `widget_confirmation_view` | Step 6 affichée | `status`, `result_kind` (reservation/groupRequest) | `Step6Confirmation.tsx` |

### 3.2 Événements d'interaction (P1)

| # | Événement GA4 | Déclencheur | Paramètres |
|---|---------------|-------------|------------|
| 14 | `widget_option_toggle` | Toggle poussette/PMR/chien | `option_name`, `value` (on/off) |
| 15 | `widget_calendar_navigate` | Navigation mois dans calendrier | `direction` (prev/next), `target_month` |
| 16 | `widget_no_slots_shown` | Aucun créneau disponible affiché | `date_key`, `party_size` |
| 17 | `widget_step_back` | Clic "Retour" | `from_step`, `to_step` |
| 18 | `widget_language_change` | Changement de langue | `from_lang`, `to_lang` |
| 19 | `widget_add_calendar` | Clic "Ajouter au calendrier" | — |
| 20 | `widget_share` | Clic "Partager" | — |
| 21 | `widget_back_to_site` | Clic "Retour au site" | — |
| 22 | `widget_group_redirect` | Redirection grand groupe (>15) | `party_size` |

### 3.3 Événements d'erreur (P1)

| # | Événement GA4 | Déclencheur | Paramètres |
|---|---------------|-------------|------------|
| 23 | `widget_error` | Erreur à la soumission | `error_code` (SLOT_TAKEN, VALIDATION_ERROR, TURNSTILE_FAILED, NETWORK_ERROR), `retry_count` |
| 24 | `widget_validation_error` | Erreur de validation formulaire contact | `field` (email, phone, firstName, lastName) |
| 25 | `widget_offline` | Utilisateur détecté hors-ligne | — |
| 26 | `widget_closure_shown` | Modale de fermeture affichée | `start_date`, `end_date` |

---

## 4. Entonnoir GA4 à Configurer

### 4.1 Funnel principal (conversion réservation)

```
widget_view                    100%  ████████████████████████████████████
       │
widget_step_guests              ??%  ████████████████████████████████████
       │
widget_step_datetime            ??%  ██████████████████████████████
       │
widget_date_selected            ??%  ████████████████████████
       │
widget_time_selected            ??%  ██████████████████████
       │
widget_step_contact             ??%  ████████████████████
       │
widget_contact_completed        ??%  ██████████████████
       │
widget_step_practical_info      ??%  ████████████████
       │
widget_step_summary             ??%  ██████████████
       │
widget_submit_attempt           ??%  ████████████
       │
widget_reservation_created      ??%  ██████████
```

### 4.2 KPIs à suivre

| KPI | Calcul | Objectif cible |
|-----|--------|---------------|
| **Taux de conversion global** | `reservation_created / widget_view` | > 15% |
| **Taux d'abandon Step 1→2** | `1 - (step_datetime / step_guests)` | < 20% |
| **Taux d'abandon Step 2→3** | `1 - (step_contact / step_datetime)` | < 30% |
| **Taux d'abandon Step 3→4** | `1 - (step_practical_info / step_contact)` | < 10% |
| **Taux d'abandon Step 5** | `1 - (reservation_created / step_summary)` | < 15% |
| **Taux d'erreur soumission** | `widget_error / submit_attempt` | < 5% |
| **Taux slot pris** | `SLOT_TAKEN / submit_attempt` | < 3% |
| **Temps moyen complétion** | Écart timestamp `widget_view` → `reservation_created` | < 3 min |
| **Taux redirection groupe** | `group_redirect / widget_view` | Info seulement |
| **Répartition midi/soir** | `service=lunch vs dinner` | Info seulement |
| **Répartition par langue** | Ventilation par `language` | Info seulement |

---

## 5. Implémentation Technique Recommandée

### 5.1 Architecture de tracking (dans le code Next.js)

```
src/
├── lib/
│   └── analytics.ts           ← NOUVEAU : module centralisé de tracking
├── app/
│   └── widget/
│       └── components/
│           ├── Widget.tsx      ← Ajout tracking step transitions
│           └── steps/
│               ├── Step1Guests.tsx      ← + widget_step_guests
│               ├── Step1Baby.tsx        ← + widget_step_baby
│               ├── Step2DateTime.tsx    ← + widget_date_selected, widget_time_selected
│               ├── Step3Contact.tsx     ← + widget_contact_completed
│               ├── Step5PracticalInfo.tsx ← + widget_step_practical_info
│               ├── Step4Policy.tsx      ← + widget_submit_attempt, widget_reservation_created, widget_error
│               └── Step6Confirmation.tsx ← + widget_confirmation_view
```

### 5.2 Module analytics.ts proposé

```typescript
// src/lib/analytics.ts

type WidgetEvent =
  | "widget_view"
  | "widget_step_guests"
  | "widget_step_baby"
  | "widget_step_datetime"
  | "widget_date_selected"
  | "widget_time_selected"
  | "widget_step_contact"
  | "widget_contact_completed"
  | "widget_step_practical_info"
  | "widget_step_summary"
  | "widget_submit_attempt"
  | "widget_reservation_created"
  | "widget_confirmation_view"
  | "widget_option_toggle"
  | "widget_no_slots_shown"
  | "widget_step_back"
  | "widget_language_change"
  | "widget_error"
  | "widget_validation_error"
  | "widget_group_redirect"
  | "widget_add_calendar"
  | "widget_share"
  | "widget_back_to_site"
  | "widget_offline"
  | "widget_closure_shown";

export function trackEvent(
  event: WidgetEvent,
  params?: Record<string, string | number | boolean>
): void {
  // Option A : GA4 via gtag (si script GA4 direct)
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, params);
  }

  // Option B : GTM via dataLayer
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({ event, ...params });
  }

  // Option C : Convex (stockage interne pour le dashboard analytics PRD-009)
  // → Appel mutation convex pour persister côté serveur
}
```

### 5.3 Approche recommandée : Double tracking

| Canal | Outil | Usage |
|-------|-------|-------|
| **Client-side** | GA4 (via GTM ou gtag) | Funnel temps réel, audiences, remarketing futur |
| **Server-side** | Convex `widgetStats` (PRD-009) | Dashboard admin interne, données propriétaires |

Avantage : les données de funnel sont sauvegardées dans Convex (100% fiable, pas d'ad-blocker) ET dans GA4 (pour les explorations et audiences).

---

## 6. Actions Cross-Domain & UTM

### 6.1 Vérification cross-domain

Le widget est sur `resa.lamouliniere.be` (sous-domaine). GA4 suit automatiquement les sous-domaines, **MAIS il faut vérifier** :

- [ ] Le cookie `_ga` se propage bien entre `lamouliniere.be` et `resa.lamouliniere.be`
- [ ] Le `Measurement ID` GA4 est le même sur les deux domaines
- [ ] Pas de configuration de `cookie_domain` restrictive

### 6.2 Discipline UTM

Chaque lien externe pointant vers `/widget` doit inclure des paramètres UTM :

| Source | Exemple d'URL |
|--------|--------------|
| Google My Business | `resa.lamouliniere.be/widget?utm_source=google&utm_medium=organic&utm_campaign=gmb` |
| Instagram bio | `resa.lamouliniere.be/widget?utm_source=instagram&utm_medium=social&utm_campaign=bio_link` |
| Facebook | `resa.lamouliniere.be/widget?utm_source=facebook&utm_medium=social&utm_campaign=post` |
| Email future | `resa.lamouliniere.be/widget?utm_source=email&utm_medium=email&utm_campaign=newsletter_01` |
| QR code restaurant | `resa.lamouliniere.be/widget?utm_source=qrcode&utm_medium=offline&utm_campaign=table_tent` |
| Site principal (bouton "Réserver") | `resa.lamouliniere.be/widget?utm_source=website&utm_medium=referral&utm_campaign=header_cta` |

### 6.3 Capture UTM dans le widget

Le widget doit capturer les UTM à l'arrivée et les inclure dans les événements :

```typescript
// Dans Widget.tsx — au mount
const utmParams = {
  utm_source: searchParams.get("utm_source") || "direct",
  utm_medium: searchParams.get("utm_medium") || "",
  utm_campaign: searchParams.get("utm_campaign") || "",
};
```

---

## 7. Correspondance avec les Recommandations Simo Ahava

| Recommandation Simo Ahava | Événement proposé dans ce rapport | Statut |
|---------------------------|----------------------------------|--------|
| `view_menu` | Hors scope widget (site principal) | N/A |
| `view_booking` | `widget_view` | Couvert |
| `begin_reservation` | `widget_step_guests` | Couvert |
| `complete_reservation` | `widget_reservation_created` | Couvert |
| `click_phone` | Hors scope widget (site principal) | N/A |
| `click_directions` | Hors scope widget (site principal) | N/A |
| GTM en place | À implémenter | À faire |
| Cross-domain vérifié | À vérifier | À faire |
| UTM discipline | Capture UTM proposée | À faire |
| Search Console ↔ GA4 | Configuration GA4 | À faire |

**Note** : Ce rapport va plus loin que les 6 événements de Simo Ahava, car le widget a un funnel en 6 étapes qui nécessite une granularité plus fine pour identifier précisément les points de déperdition.

---

## 8. Alignement avec PRD-009 (Dashboard Analytics Interne)

Le PRD-009 prévoit déjà une table `widgetStats` avec un funnel à 5 étapes. Ce rapport propose un alignement :

| PRD-009 (widgetStats) | Ce rapport (GA4) | Mapping |
|----------------------|-------------------|---------|
| `step1_dateService.views` | `widget_step_datetime` | Step 2 dans le widget réel |
| `step2_timeSlot.views` | `widget_time_selected` | Sélection créneau |
| `step3_partySize.views` | `widget_step_guests` | Step 1 dans le widget réel |
| `step4_contact.submitted` | `widget_contact_completed` | Formulaire validé |
| `step5_confirmation.confirmed` | `widget_reservation_created` (status=confirmed) | Réservation confirmée |
| `errors.SLOT_TAKEN` | `widget_error` (error_code=SLOT_TAKEN) | Même donnée |

> Le PRD-009 numérote les étapes différemment du code réel. L'implémentation doit normaliser vers le flux réel du widget.

---

## 9. Priorisation d'Implémentation

| Phase | Actions | Effort | Impact |
|-------|---------|:------:|:------:|
| **Phase 1 — Immédiat** | Créer `src/lib/analytics.ts`, ajouter les 13 événements P0 dans chaque Step | 1-2 jours | Élevé |
| **Phase 2 — Semaine 1** | Configurer GA4 sur resa.lamouliniere.be (gtag ou GTM), vérifier cross-domain | 0.5 jour | Élevé |
| **Phase 3 — Semaine 1** | Créer l'entonnoir dans GA4 Explorations | 0.5 jour | Élevé |
| **Phase 4 — Semaine 2** | Ajouter les 13 événements P1 (interactions, erreurs, back) | 1 jour | Moyen |
| **Phase 5 — Semaine 2** | Implémenter le stockage Convex (PRD-009 widgetStats) | 1-2 jours | Moyen |
| **Phase 6 — Semaine 3** | UTM discipline + capture dans le widget | 0.5 jour | Moyen |
| **Phase 7 — Semaine 3** | Connecter Search Console à GA4 | 10 min | Moyen |

---

## 10. Résumé

**Situation actuelle** : Le widget de réservation a 6 étapes mais **0 événement de tracking**. On est aveugle sur le parcours utilisateur.

**Ce qui est proposé** : **26 événements** couvrant :
- 13 événements P0 (funnel complet)
- 8 événements P1 (interactions)
- 5 événements P1 (erreurs et états)

**Résultat attendu** : Visibilité complète sur le parcours `Arrivée → Convives → Date → Contact → Infos → Confirmation → Réservation`, avec identification précise des points d'abandon et des erreurs.
