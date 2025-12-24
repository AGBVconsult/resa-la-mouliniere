# PRD Global - La Moulinière Reservation System

## Document de Référence Produit (MVP)

| **Attribut**          | **Valeur**                                      |
|-----------------------|-------------------------------------------------|
| **Projet**            | Plateforme de gestion de réservations La Moulinière |
| **Version**           | 1.0.0                                           |
| **Statut**            | MVP en développement                            |
| **Date de création**  | Décembre 2024                                   |
| **Dernière mise à jour** | 19 décembre 2025                             |
| **Responsable**       | AGBVconsult                                     |

---

## 1. Vision Produit

### 1.1 Énoncé de Vision

**Créer une plateforme propriétaire de gestion de réservations pour le restaurant La Moulinière à Ostende (Belgique), remplaçant les solutions tierces payantes (TheFork, etc.) par un système sur-mesure, multilingue et optimisé pour l'expérience iPad du personnel.**

### 1.2 Proposition de Valeur

| Pour                     | Valeur apportée                                                |
|--------------------------|----------------------------------------------------------------|
| **Le restaurant**        | Indépendance vis-à-vis des plateformes tierces, zéro commission, contrôle total des données clients |
| **Le personnel**         | Interface tactile intuitive (iPad-first), vision temps réel du service, gestion simplifiée |
| **Les clients**          | Réservation fluide en 5 langues, confirmations automatiques, expérience sans friction |
| **La direction**         | Analytics propriétaires, CRM intégré, historique client complet |

---

## 2. Contexte & Problématique

### 2.1 Contexte Business

- **Restaurant** : La Moulinière - Spécialité Moules-Frites
- **Localisation** : Ostende, Belgique (zone touristique internationale)
- **Capacité** : ~50 tables (intérieur + terrasse)
- **Services** : Midi et soir
- **Clientèle** : Internationale (5 langues principales)

### 2.2 Problèmes à Résoudre

| Problème                                  | Impact                                           | Solution proposée                        |
|-------------------------------------------|--------------------------------------------------|------------------------------------------|
| **Commissions TheFork élevées**           | Réduction des marges sur chaque couvert          | Système propriétaire sans commission     |
| **Dépendance plateforme tierce**          | Aucun contrôle sur les données et l'expérience   | Solution 100% maîtrisée                  |
| **Clientèle multilingue**                 | Friction dans le parcours de réservation         | Support natif de 5 langues               |
| **Gestion manuelle inefficace**           | Erreurs, double-réservations, temps perdu        | Automatisation + temps réel              |
| **Pas de CRM intégré**                    | Perte de connaissance client                     | CRM avec historique et scoring           |
| **Personnel mobile dans le restaurant**   | Desktop inadapté au contexte                     | Interface iPad-first                     |

### 2.3 Hypothèses Clés

1. Les clients préfèrent réserver en ligne plutôt que par téléphone
2. L'absence de paiement à la réservation ne génère pas de no-shows excessifs
3. Le personnel peut être formé rapidement sur une interface tactile intuitive
4. 5 langues couvrent 95%+ de la clientèle

---

## 3. Périmètre MVP

### 3.1 Ce qui est INCLUS dans le MVP

#### Module Client (Public)

| Fonctionnalité                        | Priorité | Description                                           |
|---------------------------------------|----------|-------------------------------------------------------|
| Widget de réservation 5 étapes        | P0       | Parcours complet : taille groupe → date → contact → conditions → confirmation |
| Support 5 langues                     | P0       | FR, NL, EN, DE, IT avec détection automatique         |
| Calendrier de disponibilités          | P0       | Affichage temps réel des créneaux disponibles         |
| Validation formulaire                 | P0       | Email, téléphone (international), champs requis       |
| Options accessibilité                 | P1       | Chaise haute, accès PMR, animaux                      |
| Confirmation email automatique        | P0       | Email multilingue immédiat après réservation          |
| Rappel J-1                            | P1       | Email de rappel 24h avant                             |
| Protection anti-spam                  | P1       | Rate limiting + CAPTCHA Turnstile                     |

#### Module Admin (Personnel)

| Fonctionnalité                        | Priorité | Description                                           |
|---------------------------------------|----------|-------------------------------------------------------|
| Vue Service                           | P0       | Liste des réservations du jour/service courant        |
| Gestion statuts                       | P0       | pending → confirmed → seated → completed / noshow     |
| Création réservation manuelle         | P0       | Pour téléphone et walk-in                             |
| Recherche client                      | P0       | Par nom, email, téléphone                             |
| Attribution de tables                 | P1       | Drag-drop sur plan de salle                           |
| Notes internes                        | P1       | Annotations sur les réservations                      |
| Gestures tactiles (iPad)              | P1       | Swipe pour marquer arrivé                             |

#### Module CRM

| Fonctionnalité                        | Priorité | Description                                           |
|---------------------------------------|----------|-------------------------------------------------------|
| Fiche client                          | P0       | Historique, préférences, notes                        |
| Statut automatique                    | P1       | New → Regular → VIP basé sur visites                  |
| Scoring client                        | P1       | Détection des clients problématiques (no-shows)       |
| Préférences alimentaires              | P1       | Allergies, régimes, restrictions                      |

#### Module Configuration

| Fonctionnalité                        | Priorité | Description                                           |
|---------------------------------------|----------|-------------------------------------------------------|
| Gestion créneaux horaires             | P0       | Configuration des slots midi/soir                     |
| Gestion tables                        | P0       | Nom, capacité, zone, position                         |
| Plan de salle                         | P1       | Éditeur visuel drag-drop                              |
| Périodes spéciales                    | P1       | Fermetures, événements, jours fériés                  |
| Templates email                       | P1       | Personnalisation des emails (5 langues)               |

#### Module Analytics

| Fonctionnalité                        | Priorité | Description                                           |
|---------------------------------------|----------|-------------------------------------------------------|
| Dashboard basique                     | P1       | Réservations/jour, taux occupation, no-shows          |
| Statistiques mensuelles               | P1       | Vue calendrier avec capacité                          |

### 3.2 Ce qui est EXCLU du MVP (Phase 2+)

| Fonctionnalité                        | Raison de l'exclusion                                 |
|---------------------------------------|-------------------------------------------------------|
| Paiement en ligne / Acompte           | Complexité réglementaire, friction client             |
| Système de liste d'attente            | Complexité technique, faible demande initiale         |
| Application mobile native             | PWA suffisant pour le MVP                             |
| Intégration comptabilité              | Hors périmètre opérationnel                           |
| IA prédictive (no-shows)              | Shadow learning en place, activation différée         |
| Multi-restaurant                      | Mono-restaurant pour le MVP                           |
| Programme fidélité                    | Phase d'enrichissement                                |
| Intégration réseaux sociaux           | Pas prioritaire                                       |

---

## 4. Architecture Technique

### 4.1 Stack Technologique

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  Next.js 15 (App Router) + React 18 + TailwindCSS + Radix UI   │
│  PWA (next-pwa) + Framer Motion + React Hook Form + Zod        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│           Convex (BaaS) - Real-time Database + Functions        │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    Clerk      │   │     Resend      │   │    Sentry       │
│ Authentification│  │  Email Service  │   │   Monitoring    │
└───────────────┘   └─────────────────┘   └─────────────────┘
```

### 4.2 Choix Technologiques Justifiés

| Technologie      | Justification                                                   |
|------------------|-----------------------------------------------------------------|
| **Next.js 15**   | SSR, App Router, performance, écosystème React                  |
| **Convex**       | Real-time natif, TypeScript end-to-end, serverless              |
| **Clerk**        | Auth OAuth rapide, gestion rôles, intégration Convex native     |
| **TailwindCSS**  | Design system cohérent, responsive, maintenable                 |
| **Radix UI**     | Accessibilité WCAG, composants headless                         |
| **Resend**       | API moderne, React Email, deliverability                        |
| **Vercel**       | Déploiement automatique, edge functions, analytics              |

### 4.3 Modèle de Données (Tables Principales)

```
reservations          clients              tables
├── id                ├── id               ├── id
├── clientId ────────►├── firstName        ├── name
├── date              ├── lastName         ├── capacity
├── time              ├── email            ├── zone
├── service           ├── phone            ├── positionX
├── partySize         ├── language         ├── positionY
├── status            ├── status           ├── isActive
├── source            ├── totalVisits      └── features[]
├── tableIds[]        ├── totalNoShows
└── options{}         └── notes[]

timeSlots             dailySlots           specialPeriods
├── time              ├── date             ├── name
├── service           ├── service          ├── startDate
├── activeDays[]      ├── isOpen           ├── endDate
├── defaultCapacity   ├── customCapacity   ├── type
└── isActive          └── origin           └── applyRules{}
```

---

## 5. Personas & Parcours Utilisateurs

### 5.1 Personas

#### Persona 1 : Le Client Touriste

| Attribut           | Description                                           |
|--------------------|-------------------------------------------------------|
| **Nom**            | Hans, touriste allemand                               |
| **Âge**            | 45 ans                                                |
| **Contexte**       | En vacances à Ostende avec sa famille                 |
| **Besoin**         | Réserver rapidement dans sa langue                    |
| **Frustration**    | Sites uniquement en français/néerlandais              |
| **Objectif**       | Réservation confirmée en moins de 2 minutes           |

#### Persona 2 : Le Serveur

| Attribut           | Description                                           |
|--------------------|-------------------------------------------------------|
| **Nom**            | Sofie, serveuse                                       |
| **Âge**            | 28 ans                                                |
| **Contexte**       | En service avec iPad, clients qui arrivent            |
| **Besoin**         | Voir qui arrive, marquer les arrivées rapidement      |
| **Frustration**    | Systèmes lents, trop de clics                         |
| **Objectif**       | Marquer une arrivée en 1 geste                        |

#### Persona 3 : Le Manager

| Attribut           | Description                                           |
|--------------------|-------------------------------------------------------|
| **Nom**            | Marc, responsable                                     |
| **Âge**            | 52 ans                                                |
| **Contexte**       | Gestion opérationnelle du restaurant                  |
| **Besoin**         | Vue d'ensemble, anticiper les problèmes               |
| **Frustration**    | Informations dispersées, pas de CRM                   |
| **Objectif**       | Dashboard unifié, connaissance client                 |

### 5.2 User Flows Principaux

#### Flow 1 : Réservation Client (Happy Path)

```
[Accès Widget] → [Choix nb personnes] → [Sélection date] → [Choix créneau]
                                                                   │
                                                                   ▼
[Email reçu] ← [Confirmation] ← [Acceptation CGV] ← [Saisie contact]
```

#### Flow 2 : Gestion Service (Personnel)

```
[Login Admin] → [Vue Service] → [Liste réservations] → [Client arrive]
                                                             │
                                                             ▼
                                    [Swipe "Arrivé"] → [Statut "seated"]
                                                             │
                                                             ▼
                                    [Fin repas] → [Statut "completed"]
```

---

## 6. Exigences Non-Fonctionnelles

### 6.1 Performance

| Métrique                    | Objectif MVP                                    |
|-----------------------------|-------------------------------------------------|
| **Time to First Byte**      | < 200ms                                         |
| **Largest Contentful Paint**| < 2.5s                                          |
| **First Input Delay**       | < 100ms                                         |
| **Cumulative Layout Shift** | < 0.1                                           |
| **Temps chargement widget** | < 3s sur 3G                                     |

### 6.2 Sécurité

| Exigence                    | Implémentation                                  |
|-----------------------------|-------------------------------------------------|
| **Authentification**        | OAuth via Clerk (Google, Email, Apple)          |
| **Autorisation**            | RBAC (Admin, Staff, Owner)                      |
| **Protection API**          | Rate limiting (3 req/min), CSRF                 |
| **Protection bot**          | Cloudflare Turnstile CAPTCHA                    |
| **Headers sécurité**        | CSP, X-Frame-Options, HSTS                      |
| **Données sensibles**       | Chiffrement au repos et en transit              |
| **RGPD**                    | Consentement marketing, droit à l'oubli         |

### 6.3 Disponibilité

| Métrique                    | Objectif                                        |
|-----------------------------|-------------------------------------------------|
| **Uptime**                  | 99.5%                                           |
| **RTO**                     | < 1 heure                                       |
| **RPO**                     | < 5 minutes (real-time sync Convex)             |

### 6.4 Accessibilité

| Standard                    | Niveau cible                                    |
|-----------------------------|-------------------------------------------------|
| **WCAG**                    | 2.1 AA                                          |
| **Navigation clavier**      | 100% des actions                                |
| **Lecteur d'écran**         | Compatible (ARIA labels)                        |
| **Contraste couleurs**      | Ratio minimum 4.5:1                             |

### 6.5 Compatibilité

| Plateforme                  | Support                                         |
|-----------------------------|-------------------------------------------------|
| **Navigateurs (public)**    | Chrome, Safari, Firefox, Edge (dernières 2 versions) |
| **Admin**                   | iPad Safari (priorité), Chrome desktop          |
| **Mobile**                  | iOS Safari, Android Chrome                      |
| **Résolutions**             | 320px à 2560px                                  |

---

## 7. Internationalisation

### 7.1 Langues Supportées

| Code | Langue      | Statut     | Couverture                     |
|------|-------------|------------|--------------------------------|
| FR   | Français    | Principal  | 100% (UI + Emails)             |
| NL   | Néerlandais | Complet    | 100% (UI + Emails)             |
| EN   | Anglais     | Complet    | 100% (UI + Emails)             |
| DE   | Allemand    | Complet    | 100% (UI + Emails)             |
| IT   | Italien     | Complet    | 100% (UI + Emails)             |

### 7.2 Détection Automatique

1. Header `Accept-Language` du navigateur
2. Paramètre URL `?lang=xx` (override)
3. Préférence sauvegardée (client récurrent)
4. Fallback : Français

---

## 8. Indicateurs de Succès (KPIs)

### 8.1 KPIs Business

| Indicateur                          | Objectif MVP (M+3)      | Cible M+12              |
|-------------------------------------|-------------------------|-------------------------|
| **Taux adoption widget**            | 60% des réservations    | 85%                     |
| **Réduction commissions tierces**   | -50%                    | -90%                    |
| **Taux de no-show**                 | < 10%                   | < 5%                    |
| **Taux annulation**                 | < 15%                   | < 10%                   |
| **NPS Clients**                     | > 30                    | > 50                    |

### 8.2 KPIs Techniques

| Indicateur                          | Objectif                                        |
|-------------------------------------|-------------------------------------------------|
| **Taux d'erreur API**               | < 0.1%                                          |
| **Temps de réponse P95**            | < 500ms                                         |
| **Couverture tests E2E**            | > 80% des flows critiques                       |
| **Score Lighthouse**                | > 90 (Performance, Accessibility)               |

### 8.3 KPIs Opérationnels

| Indicateur                          | Objectif                                        |
|-------------------------------------|-------------------------------------------------|
| **Temps moyen réservation**         | < 90 secondes                                   |
| **Temps formation personnel**       | < 30 minutes                                    |
| **Tickets support/semaine**         | < 5                                             |

---

## 9. Risques & Mitigations

| Risque                              | Probabilité | Impact  | Mitigation                              |
|-------------------------------------|-------------|---------|----------------------------------------|
| **Double-réservation (race condition)** | Moyenne | Élevé   | Mutations atomiques Convex, locks      |
| **Spam réservations**               | Élevée      | Moyen   | Rate limiting + Turnstile CAPTCHA      |
| **Adoption personnel difficile**    | Moyenne     | Élevé   | UX iPad-first, formation, support      |
| **Pic de charge haute saison**      | Élevée      | Moyen   | Architecture serverless auto-scale     |
| **Panne email provider**            | Faible      | Moyen   | Queue retry, monitoring Sentry         |
| **Clients sans email**              | Moyenne     | Faible  | Réservation téléphone via admin        |

---

## 10. Contraintes

### 10.1 Contraintes Techniques

- **Pas de paiement en ligne** : Choix délibéré pour réduire la friction
- **Mono-restaurant** : Architecture simplifiée pour le MVP
- **iPad Safari** : Navigateur principal du personnel (pas Chrome)
- **Timezone fixe** : Europe/Brussels uniquement

### 10.2 Contraintes Business

- **Budget limité** : Solutions SaaS plutôt que développement custom infrastructure
- **Équipe réduite** : Documentation et code maintenable essentiels
- **Formation minimale** : Interface intuitive obligatoire

### 10.3 Contraintes Réglementaires

- **RGPD** : Consentement explicite, droit à l'oubli, portabilité
- **Accessibilité** : Conformité WCAG 2.1 AA

---

## 11. Dépendances Externes

| Service          | Usage                    | Criticité | Alternative             |
|------------------|--------------------------|-----------|-------------------------|
| **Convex**       | Base de données + API    | Critique  | Supabase (migration)    |
| **Clerk**        | Authentification         | Critique  | Auth0, NextAuth         |
| **Resend**       | Envoi emails             | Haute     | SendGrid, Postmark      |
| **Vercel**       | Hébergement frontend     | Haute     | Netlify, AWS Amplify    |
| **Cloudflare**   | CDN + Turnstile          | Moyenne   | Autre CDN + reCAPTCHA   |
| **Sentry**       | Monitoring erreurs       | Moyenne   | LogRocket, Datadog      |

---

## 12. Roadmap Indicative

### Phase 1 : MVP Core (Actuelle)

- [x] Widget réservation public (5 langues)
- [x] Système de créneaux et disponibilités
- [x] Vue service admin (iPad)
- [x] Gestion statuts réservation
- [x] CRM basique (fiche client)
- [x] Emails automatiques (confirmation, rappel)
- [x] Plan de salle (visualisation)
- [x] Authentification et rôles

### Phase 2 : Enrichissement

- [ ] Attribution tables automatique (ML)
- [ ] Analytics avancés (tendances, prédictions)
- [ ] Liste d'attente
- [ ] Programme fidélité basique
- [ ] Intégration Google My Business
- [ ] API publique (webhooks)

### Phase 3 : Expansion

- [ ] Multi-restaurant
- [ ] Application mobile native (staff)
- [ ] Intégration comptabilité
- [ ] IA prédictive no-shows
- [ ] Marketplace intégrations

---

## 13. Équipe & Gouvernance

### 13.1 Rôles

| Rôle                    | Responsabilité                                  |
|-------------------------|-------------------------------------------------|
| **Product Owner**       | Vision produit, priorisation backlog            |
| **Lead Developer**      | Architecture, qualité code, revues              |
| **Designer UX**         | Parcours utilisateur, design system             |
| **Testeur QA**          | Tests E2E, validation fonctionnelle             |

### 13.2 Processus de Décision

- **Fonctionnalités majeures** : Validation PO + Lead Dev
- **Changements techniques** : Lead Dev avec documentation
- **Bugs critiques** : Correction immédiate, revue post-mortem

---

## 14. Glossaire

| Terme              | Définition                                              |
|--------------------|---------------------------------------------------------|
| **Service**        | Période de service (midi ou soir)                       |
| **Slot/Créneau**   | Horaire de réservation disponible (ex: 12:30)           |
| **No-show**        | Client qui ne se présente pas                           |
| **Walk-in**        | Client sans réservation                                 |
| **Party size**     | Nombre de personnes dans la réservation                 |
| **Zone**           | Espace physique (salle intérieure, terrasse)            |
| **Shadow mode**    | Apprentissage ML passif sans impact production          |

---

## 15. Annexes

### 15.1 Documents de Référence

- `ARCHITECTURE-REVIEW-LA-MOULINIERE-FINAL.md` - Revue architecture technique
- `CRM_SPEC_LAMOULINIERE.md` - Spécifications CRM détaillées
- `GUIDE-IMPLEMENTATION-LA-MOULINIERE-V3.md` - Guide d'implémentation
- `SPEC-COMPLETE-vue-service-plan-salle.md` - Spécifications vue service
- `DESIGN_SYSTEM.md` - Système de design UI
- `RUNBOOK.md` - Procédures d'exploitation

### 15.2 Contacts

| Rôle              | Contact                                         |
|-------------------|-------------------------------------------------|
| **Projet**        | AGBVconsult                                     |
| **Support tech**  | À définir                                       |
| **Restaurant**    | La Moulinière, Ostende                          |

---

## Historique des Révisions

| Version | Date       | Auteur      | Changements                              |
|---------|------------|-------------|------------------------------------------|
| 1.0.0   | 2025-12-19 | Claude      | Création initiale du PRD Global MVP     |

---

*Ce document constitue la référence produit pour le MVP de la plateforme La Moulinière. Il sera mis à jour au fur et à mesure de l'évolution du projet.*
