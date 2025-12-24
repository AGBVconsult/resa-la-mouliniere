# Index des PRDs Fonctionnalités

## La Moulinière - Documentation Produit

Ce dossier contient les PRDs (Product Requirements Documents) détaillés pour chaque fonctionnalité majeure du système de réservation La Moulinière.

---

## Vue d'Ensemble

| ID | Fonctionnalité | Statut | Priorité |
|----|----------------|--------|----------|
| [PRD-001](./PRD-001-widget-reservation.md) | Widget de Réservation Public | ✅ Implémenté | P0 |
| [PRD-002](./PRD-002-vue-service-admin.md) | Vue Service Admin (iPad) | ✅ Implémenté | P0 |
| [PRD-003](./PRD-003-crm-clients.md) | CRM - Gestion Clients | ✅ Implémenté | P1 |
| [PRD-004](./PRD-004-plan-de-salle.md) | Plan de Salle Interactif | ⚠️ Partiel | P1 |
| [PRD-005](./PRD-005-gestion-creneaux.md) | Gestion des Créneaux | ✅ Implémenté | P0 |
| [PRD-006](./PRD-006-gestion-tables.md) | Gestion des Tables | ✅ Implémenté | P0 |
| [PRD-007](./PRD-007-periodes-speciales.md) | Périodes Spéciales | ✅ Implémenté | P1 |
| [PRD-008](./PRD-008-emails-automatiques.md) | Emails Automatiques | ✅ Implémenté | P0 |
| [PRD-009](./PRD-009-analytics.md) | Analytics & Statistiques | ⚠️ Partiel | P1 |
| [PRD-010](./PRD-010-planning-mensuel.md) | Planning Mensuel | ✅ Implémenté | P1 |
| [PRD-011](./PRD-011-attribution-tables-ml.md) | Attribution Tables & ML | 🔄 En cours | P1 |

---

## Légende Statuts

| Symbole | Signification |
|---------|---------------|
| ✅ | Implémenté et fonctionnel |
| ⚠️ | Partiellement implémenté |
| 🔄 | En cours de développement |
| 📋 | Planifié |
| ❌ | Bloqué |

---

## Priorités

| Priorité | Description |
|----------|-------------|
| **P0** | Critique - Bloquant pour le MVP |
| **P1** | Haute - Essentiel pour l'expérience |
| **P2** | Moyenne - Nice-to-have |
| **P3** | Basse - Évolution future |

---

## Catégories

### Public (Client)

| PRD | Description |
|-----|-------------|
| [PRD-001](./PRD-001-widget-reservation.md) | Parcours réservation 5 étapes, multilingue |

### Administration

| PRD | Description |
|-----|-------------|
| [PRD-002](./PRD-002-vue-service-admin.md) | Gestion des réservations du service courant |
| [PRD-003](./PRD-003-crm-clients.md) | Base de données clients, historique, scoring |
| [PRD-004](./PRD-004-plan-de-salle.md) | Visualisation et édition du plan |
| [PRD-009](./PRD-009-analytics.md) | Tableaux de bord et statistiques |
| [PRD-010](./PRD-010-planning-mensuel.md) | Vue calendrier mensuelle |

### Configuration

| PRD | Description |
|-----|-------------|
| [PRD-005](./PRD-005-gestion-creneaux.md) | Templates horaires et overrides |
| [PRD-006](./PRD-006-gestion-tables.md) | Inventaire et propriétés des tables |
| [PRD-007](./PRD-007-periodes-speciales.md) | Vacances, fermetures, événements |

### Automatisation

| PRD | Description |
|-----|-------------|
| [PRD-008](./PRD-008-emails-automatiques.md) | Confirmation, rappel, review |
| [PRD-011](./PRD-011-attribution-tables-ml.md) | Attribution manuelle et ML |

---

## Structure d'un PRD

Chaque PRD suit le template standardisé :

1. **Informations Document** - Métadonnées (ID, titre, statut, priorité)
2. **Résumé Exécutif** - Objectif, problèmes résolus, bénéfices
3. **Spécifications Fonctionnelles** - Détails des fonctionnalités
4. **Spécifications Techniques** - Architecture, API, modèles
5. **Design & UX** - Interfaces, interactions
6. **Tests** - Cas de test à couvrir
7. **Métriques** - KPIs de succès
8. **Évolutions Futures** - Roadmap fonctionnalité
9. **Fichiers Impactés** - Code concerné
10. **Historique** - Versions du document

---

## Liens Utiles

- [PRD Global MVP](../PRD_GLOBAL_MVP.md) - Vision d'ensemble du projet
- [Architecture Review](../ARCHITECTURE-REVIEW-LA-MOULINIERE-FINAL.md) - Revue technique
- [CRM Spec](../CRM_SPEC_LAMOULINIERE.md) - Spécifications CRM détaillées
- [Design System](../DESIGN_SYSTEM.md) - Composants UI

---

## Contribution

Pour modifier un PRD :

1. Créer une branche `docs/prd-XXX-update`
2. Modifier le fichier concerné
3. Mettre à jour la version dans l'historique
4. Créer une PR pour review

---

*Dernière mise à jour : 19 décembre 2025*
