# PRD-006 — Widget Client (Booking)

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `src/app/widget/`, `src/components/booking/`, `convex/availability.ts`, `convex/bookingDrafts.ts`

---

## 1. Vue d'ensemble

Le widget de reservation est une application single-page multi-etapes accessible a :
- `/widget` — embeddable en iframe ou standalone
- `/widget/group-request` — formulaire grands groupes (>=16)
- `/reservation/[token]` — gestion de reservation existante (consultation/modification/annulation)

### Caracteristiques principales

- **6 etapes** de reservation (+ sous-etape bebe)
- **i18n** : 6 langues (fr, nl, en, de, it, es), detection automatique du navigateur
- **Anti-bot** : Cloudflare Turnstile
- **Idempotence** : Cle unique par soumission (UUID genere cote client)
- **Brouillons** : Sauvegarde automatique des abandons
- **Responsive** : Mobile-first, design adaptatif desktop
- **Analytics** : Tracking des etapes (step views, guests selected, policy viewed)
- **Animations** : Framer Motion pour les transitions entre etapes

---

## 2. Parcours utilisateur

### 2.1 Flux des etapes

```
Step 1: Guests (adultes, enfants)
    │
    ├── Si babyCount > 0 ──► Step 1b: Baby Seating (chaise haute / poussette)
    │                              │
    └── Si babyCount = 0 ──────────┤
                                   ▼
                        Step 2: Date & Heure
                                   │
                                   ▼
                        Step 3: Contact (nom, email, tel, Turnstile)
                                   │ ── sauvegarde brouillon
                                   ▼
                        Step 4: Infos pratiques (politique annulation)
                                   │
                                   ▼
                        Step 5: Recap & Confirmation (soumission)
                                   │ ── suppression brouillon
                                   ▼
                        Step 6: Confirmation (succes)
```

### 2.2 Conditions de navigation

| Etape | Condition "Suivant" |
|-------|-------------------|
| Step 1 | `adults >= 1` ET `partySize <= 15` |
| Step 1b | `babySeating !== null` (choix requis) |
| Step 2 | `dateKey` ET `service` ET `timeKey` selectionnes |
| Step 3 | Formulaire valide + Turnstile resolu |
| Step 4 | Toujours actif (lecture obligatoire) |
| Step 5 | Soumission via action Convex |

### 2.3 Redirection grands groupes

Si `partySize > 15` (THRESHOLDS.PENDING_MAX), redirection automatique vers `/widget/group-request` avec les parametres en URL.

---

## 3. Composants par etape

### 3.1 Step 1 — Guests (`Step1Guests`)

- Selecteur adultes (1-15, stepper +/-)
- Selecteur enfants (0-14, stepper +/-)
- Selecteur bebes (0-5, stepper +/-)
- Options accessibilite : poussette, fauteuil roulant, chien
- Affichage total couverts en footer

### 3.2 Step 1b — Baby Seating (`Step1Baby`)

Sous-etape conditionnelle si `babyCount > 0` :
- Choix : chaise haute OU poussette a table
- Selection obligatoire pour continuer

### 3.3 Step 2 — Date & Heure (`Step2DateTime`)

- **Calendrier** : Selection de date (jours disponibles colores)
  - Query : `availability.getMonth(year, month, partySize)`
  - Jours passes : desactives
  - Jours sans disponibilite : grises
- **Service** : lunch / dinner (si jour ouvert pour les deux)
- **Creneaux** : Liste des heures disponibles
  - Query : `availability.getDay(dateKey, partySize)`
  - Affiche capacite restante
  - Filtre creneaux fermes et passes

### 3.4 Step 3 — Contact (`Step3Contact`)

- Formulaire : prenom, nom, email, telephone, note (optionnel)
- **Turnstile** : Widget Cloudflare invisible/visible
- Validation cote client
- Sauvegarde brouillon au passage a l'etape suivante

### 3.5 Step 4 — Infos pratiques (`Step5PracticalInfo`)

- Politique d'annulation
- Informations sur le restaurant
- Bouton "Lu et compris"
- Tracking : `trackPolicyViewed()`

### 3.6 Step 5 — Recap & Confirmation (`Step4Policy`)

- Resume complet de la reservation
- Bouton de soumission final
- Appel `reservations.create` action Convex :
  - Payload complet + turnstileToken + idemKey
  - Gestion resultat `kind: "reservation"` ou `kind: "groupRequest"`
- Suppression du brouillon en cas de succes
- Gestion d'erreurs avec messages traduits

### 3.7 Step 6 — Confirmation (`Step6Confirmation`)

- Message de confirmation avec details
- Lien de gestion de reservation (manageUrlPath)
- Animation de succes

---

## 4. Systeme i18n

### 4.1 Detection de langue

1. Parametre URL `?lang=xx` (prioritaire)
2. `navigator.language` du navigateur
3. Fallback : `fr` (DEFAULT_LANGUAGE)

### 4.2 Langues supportees

`fr`, `nl`, `en`, `de`, `it`, `es`

### 4.3 Implementation

- Hook `useTranslation(lang)` retourne objet `t` avec toutes les cles
- Fichiers de traduction dans `src/components/booking/i18n/translations.ts`
- Emails envoyes dans la langue selectionnee par le client

---

## 5. Brouillons (Booking Drafts)

### 5.1 Sauvegarde

Declenchee au passage Step 3 → Step 4 :

```typescript
saveDraft({
  sessionId,       // UUID unique par session widget
  firstName, lastName, email, phone, language,
  adults, childrenCount, babyCount,
  dateKey, service, timeKey, note,
  lastStep: 4,
  referralSource,
});
```

### 5.2 Suppression

A la soumission reussie (Step 5 → Step 6) :
```typescript
deleteDraft({ sessionId });
```

### 5.3 Expiration

TTL automatique de 7 jours (`expiresAt`), nettoye par cron.

### 5.4 Upsert

Le `sessionId` est utilise pour upsert — un meme client qui revient met a jour son brouillon.

---

## 6. Fermetures et notices

### 6.1 Closure Notice Modal

Si une periode de fermeture active est detectee (`specialPeriods.getActiveClosure`), un modal s'affiche avec :
- Dates de fermeture
- Date de reouverture
- Bouton de fermeture du modal

### 6.2 Widget desactive

Si `settings.publicWidgetEnabled === false`, un message simple est affiche a la place du formulaire.

---

## 7. Gestion de reservation existante

### 7.1 Routes

| Route | Description |
|-------|-------------|
| `/reservation/[token]` | Consultation reservation |
| `/reservation/[token]/edit` | Modification reservation |
| `/reservation/[token]/cancel` | Annulation reservation |

### 7.2 Fonctionnement

- `reservations.getByToken(token)` : Charge la reservation + info token
- Pas de verification d'expiration pour consultation
- Modification via `reservations.updateByToken` (action idempotente)
- Annulation via `reservations.cancelByToken` (action idempotente)

---

## 8. Queries Convex utilisees

| Query | Usage |
|-------|-------|
| `widget.getSettings` | Settings publiques (turnstileSiteKey, maxPartySize, etc.) |
| `availability.getMonth` | Calendrier du mois (jours ouverts/fermes) |
| `availability.getDay` | Creneaux disponibles pour un jour |
| `specialPeriods.getActiveClosure` | Fermeture active en cours |

---

## 9. Actions Convex utilisees

| Action/Mutation | Usage |
|----------------|-------|
| `reservations.create` | Soumission reservation (action avec Turnstile + idempotence) |
| `reservations.updateByToken` | Modification par token |
| `reservations.cancelByToken` | Annulation par token |
| `bookingDrafts.save` | Sauvegarde brouillon |
| `bookingDrafts.deleteDraft` | Suppression brouillon |

---

## 10. Analytics

| Evenement | Fonction | Declencheur |
|-----------|----------|-------------|
| Step view | `trackStepView(stepNumber, name, lang)` | Changement d'etape |
| Guests selected | `trackGuestsSelected({...})` | Sortie Step 1 |
| Policy viewed | `trackPolicyViewed(lang)` | Sortie Step 4 |

---

## 11. Securite widget

- **CSP specifique** : Headers dedies dans `next.config.ts` pour `/widget`
- **Turnstile** : Verification serveur obligatoire
- **Rate limiting** : Config dans settings (`windowMs`, `maxRequests`)
- **Idempotence** : UUID genere par session, hash SHA-256 des inputs
- **Pas d'auth** : Le widget est public, la protection est assuree par Turnstile + rate-limit + idempotence
- **Sanitization** : Noms capitalises, telephone formate, email normalise cote serveur

---

## 12. Structure des fichiers

```
src/app/widget/
  layout.tsx         — Layout widget (ConvexProvider, fonts, meta)
  page.tsx           — Entry point (rend Widget)
  components/
    Widget.tsx       — Composant principal multi-etapes
    BookingHeader.tsx — Header avec resume et langue
    BookingFooter.tsx — Footer avec navigation
    ClosureNoticeModal.tsx — Modal fermeture
    steps/
      Step1Guests.tsx
      Step1Baby.tsx
      Step2DateTime.tsx
      Step3Contact.tsx
      Step4Policy.tsx     — Recap & confirmation (etape 5 logique)
      Step5PracticalInfo.tsx — Infos pratiques (etape 4 logique)
      Step6Confirmation.tsx
    ui/
      LoadingSpinner.tsx
      StepTransition.tsx  — Animation Framer Motion
      NavigationFooter.tsx

src/components/booking/
  constants.ts       — Seuils, langues supportees
  types.ts           — BookingState, ReservationResult
  i18n/
    translations.ts  — Traductions 6 langues
```

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
