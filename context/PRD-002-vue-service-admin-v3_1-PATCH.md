# PRD-002 : Vue Service Admin — PATCH v3.1

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-002 |
| **Titre** | Vue Service - Interface Personnel iPad |
| **Statut** | ✅ Production-ready |
| **Priorité** | P0 - Critique |
| **Version** | 3.1 |
| **Date création** | 2025-12-19 |
| **Dernière MàJ** | 2025-12-22 |
| **Responsable** | AGBVconsult |
| **Base** | PRD-002 v3.0 FINAL (inchangé sauf section ci-dessous) |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| **3.1** | 2025-12-22 | Ajout section 3.12 : Bouton Paramètres (⚙️) → Modal Override Jour (réf PRD-010 Section 4) |
| 3.0 | 2025-12-21 | Version FINALE - Score 100/100 |

---

## NOUVELLE SECTION v3.1

---

# Section 3.12 : Bouton Paramètres (⚙️)

## 3.12.1 Emplacement

```
┌─────────────────────────────────────────────────────────────────┐
│  < Lundi 22 Décembre >  📅      [Déjeuner] [Dîner]  ⚙️  🗺️    │
└─────────────────────────────────────────────────────────────────┘
                                                      │
                                                      └── Bouton Paramètres
```

## 3.12.2 Action

Au clic sur ⚙️, ouverture du **Modal Override Jour** pour la date actuellement affichée.

## 3.12.3 Modal Override Jour (Référence PRD-010 Section 4)

Le modal est **identique** à celui décrit dans PRD-010 Section 4 "Modal Override Jour".

### Rappel Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Lundi 22 Décembre 2025                                             ✕  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Jour complet                                        [●━━━━━━]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │                               │  │                               │  │
│  │  Déjeuner          [●━━━━━━] │  │  Dîner             [●━━━━━━]  │  │
│  │                               │  │                               │  │
│  │  Créneaux horaires       (+) │  │  Créneaux horaires        (+) │  │
│  │  ─────────────────────────── │  │  ───────────────────────────  │  │
│  │                               │  │                               │  │
│  │  ⏱ 12:00   👥 [8]   [●━]    │  │  ⏱ 18:00   👥 [8]   [●━]     │  │
│  │  ⏱ 12:30   👥 [8]   [●━]    │  │  ⏱ 18:30   👥 [8]   [●━]     │  │
│  │  ⏱ 13:00   👥 [8]   [●━]    │  │  ⏱ 19:00   👥 [8]   [●━]     │  │
│  │                               │  │                               │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                    [Annuler]  [Enregistrer]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Hiérarchie des Toggles (3 Niveaux)

| Niveau | Toggle | Action |
|--------|--------|--------|
| **1. Jour complet** | `[●━━]` | Ouvre/Ferme les 2 services |
| **2. Service** | `[●━━]` × 2 | Ouvre/Ferme Déjeuner ou Dîner |
| **3. Créneau** | `[●━━]` × n | Active/Désactive un créneau |

### Éléments par Créneau

| Élément | Description |
|---------|-------------|
| **⏱ Heure** | Format HH:mm (lecture seule) |
| **👥 Capacité** | Input numérique éditable |
| **Toggle** | ON/OFF pour activer/désactiver |

### Bouton (+) Ajouter Créneau

Permet d'ajouter un créneau temporaire pour ce jour uniquement (override).

### Comportement des Toggles (Cascade)

```
Toggle JOUR → OFF
└── Désactive : Déjeuner + Dîner
    └── Désactive : tous les créneaux

Toggle SERVICE → OFF
└── Désactive : tous les créneaux du service
└── NE TOUCHE PAS : l'autre service

Toggle CRÉNEAU → OFF
└── Désactive uniquement ce créneau
└── Si TOUS les créneaux OFF → Service passe à OFF
```

### Sauvegarde

Au clic "Enregistrer" :
- Crée des `dailySlots` avec `origin="manual"`
- Ces overrides sont prioritaires (cascade MANUAL > PERIOD > TEMPLATE)
- Affecte uniquement la date affichée

## 3.12.4 RBAC

| Action | Owner | Admin | Staff |
|--------|:-----:|:-----:|:-----:|
| Voir bouton ⚙️ | ✅ | ✅ | ❌ |
| Ouvrir modal | ✅ | ✅ | ❌ |
| Modifier overrides | ✅ | ✅ | ❌ |

> **Note** : Le bouton ⚙️ n'est pas visible pour le rôle Staff.

## 3.12.5 Intégration

| PRD | Lien |
|-----|------|
| **PRD-010** | Section 4 — Modal Override Jour (spécification complète) |
| **PRD-005** | Endpoints créneaux (lecture template) |
| **PRD-007** | Endpoints dailySlots (écriture override) |

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| **3.1** | 2025-12-22 | Claude | Bouton Paramètres (⚙️) → Modal Override Jour |
| 3.0 | 2025-12-21 | Claude | Version FINALE |

---

**FIN DU PATCH PRD-002 v3.1**

*Ce document est un patch/complément au PRD-002 v3.0 FINAL*
*Sections 1-3.11 et 4+ : inchangées (voir PRD-002 v3.0)*
*Section 3.12 : nouvelle (v3.1)*
