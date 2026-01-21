# Tests E2E — La Moulinière

Tests End-to-End avec Playwright pour valider les parcours utilisateur critiques.

## Installation

```bash
# Installer les dépendances
pnpm install

# Installer les navigateurs Playwright
pnpm playwright:install
```

## Exécution des tests

```bash
# Exécuter tous les tests E2E
pnpm test:e2e

# Exécuter avec l'interface graphique
pnpm test:e2e:ui

# Exécuter en mode headed (voir le navigateur)
pnpm test:e2e:headed

# Exécuter uniquement sur Chromium
pnpm test:e2e:chromium
```

## Structure des tests

| Fichier | Description |
|---------|-------------|
| `widget-reservation.spec.ts` | Parcours réservation complet (5 étapes) |
| `reservation-management.spec.ts` | Gestion réservation via token (edit/cancel) |
| `admin.spec.ts` | Interface admin (connexion, vue service) |
| `accessibility.spec.ts` | Tests d'accessibilité et responsive |
| `group-request.spec.ts` | Demande de groupe (> 15 personnes) |
| `fixtures.ts` | Données de test et helpers |

## Couverture des parcours

### Parcours Client (Widget)
- [x] Étape 1 : Sélection convives
- [x] Étape 2 : Sélection date/heure
- [x] Étape 3 : Formulaire contact
- [x] Étape 4 : Récapitulatif et confirmation
- [x] Multilingue (FR, NL, EN)
- [x] Responsive (mobile, tablet, desktop)

### Gestion Réservation
- [x] Page principale `/reservation/[token]`
- [x] Modification `/reservation/[token]/edit`
- [x] Annulation `/reservation/[token]/cancel`

### Interface Admin
- [x] Redirection login si non authentifié
- [ ] Vue Service (nécessite auth mock)
- [ ] Changement statut (nécessite auth mock)
- [ ] Plan de salle (nécessite auth mock)

### Accessibilité
- [x] Touch targets ≥ 44px
- [x] Navigation clavier
- [x] Responsive design

## Configuration

Le fichier `playwright.config.ts` configure :
- **Navigateurs** : Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL** : `http://localhost:3000`
- **Serveur de dev** : Démarre automatiquement `npm run dev`
- **Screenshots** : Uniquement sur échec
- **Traces** : Sur premier retry

## CI/CD

Les tests E2E peuvent être exécutés en CI avec :

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: pnpm test:e2e
```

## Notes

- Les tests admin sont marqués `test.skip` car ils nécessitent une authentification
- Pour les activer, implémenter un mock d'authentification Clerk
- Les tests utilisent des sélecteurs robustes (aria-labels, rôles, textes)
