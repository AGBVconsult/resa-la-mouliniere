import { test, expect } from "@playwright/test";

/**
 * Test E2E: Interface Admin
 * 
 * Ces tests vérifient le fonctionnement de l'interface admin :
 * - Connexion (redirection vers Clerk)
 * - Vue Service (liste des réservations)
 * - Changement de statut
 * - Plan de salle
 * - Création de réservation manuelle
 * 
 * Note: Les tests marqués .skip nécessitent une authentification Clerk.
 * Pour les exécuter localement, connectez-vous d'abord manuellement
 * et utilisez le flag --headed pour voir le navigateur.
 */

test.describe("Admin - Accès et authentification", () => {
  test("Redirige vers la page de login si non authentifié", async ({ page }) => {
    await page.goto("/admin");
    
    // Attendre la redirection
    await page.waitForURL(/login|sign-in|clerk/, { timeout: 5000 }).catch(() => {});
    
    const url = page.url();
    const hasLoginRedirect = url.includes("login") || url.includes("sign-in") || url.includes("clerk");
    
    // Si pas de redirection, vérifier qu'on voit un message d'auth
    if (!hasLoginRedirect) {
      const hasAuthMessage = await page.getByText(/connexion|login|sign in/i).isVisible().catch(() => false);
      expect(hasAuthMessage).toBeTruthy();
    } else {
      expect(hasLoginRedirect).toBeTruthy();
    }
  });

  test("Page de login admin existe et s'affiche correctement", async ({ page }) => {
    await page.goto("/admin/login");
    
    // Vérifier que la page de login s'affiche
    await expect(page.getByText(/La Moulinière/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Administration/i)).toBeVisible();
  });

  test("Page admin/reservations répond correctement", async ({ page }) => {
    const response = await page.goto("/admin/reservations");
    
    // La page doit répondre (redirection vers login = 200 après redirect)
    expect(response?.status()).toBeLessThan(500);
  });

  test("Page admin/settings/tables répond correctement", async ({ page }) => {
    const response = await page.goto("/admin/settings/tables");
    
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Admin - Vue Service (nécessite auth)", () => {
  // Ces tests sont skip par défaut car ils nécessitent une authentification
  // Pour les exécuter: pnpm test:e2e:headed et se connecter manuellement
  
  test.skip("Affiche la liste des réservations du jour", async ({ page }) => {
    await page.goto("/admin/reservations");
    
    // Vérifier les éléments de la vue service
    await expect(page.getByText(/réservations/i)).toBeVisible({ timeout: 10000 });
    
    // Vérifier le sélecteur de date
    await expect(page.getByRole("button", { name: /aujourd'hui|today/i })).toBeVisible();
  });

  test.skip("Peut basculer entre les services lunch et dinner", async ({ page }) => {
    await page.goto("/admin/reservations");
    
    // Attendre le chargement
    await page.waitForLoadState("networkidle");
    
    // Vérifier les boutons de service
    const lunchButton = page.getByRole("button", { name: /midi|déjeuner|lunch/i });
    const dinnerButton = page.getByRole("button", { name: /soir|dîner|dinner/i });
    
    await expect(lunchButton).toBeVisible();
    await expect(dinnerButton).toBeVisible();
    
    // Cliquer sur dinner
    await dinnerButton.click();
    
    // Vérifier que le bouton est actif (a une classe différente)
    await expect(dinnerButton).toHaveClass(/bg-|active|selected/);
  });

  test.skip("Peut ouvrir et fermer le plan de salle", async ({ page }) => {
    await page.goto("/admin/reservations");
    await page.waitForLoadState("networkidle");
    
    // Trouver le bouton plan de salle
    const floorPlanButton = page.getByRole("button", { name: /plan|salle|floor/i });
    await expect(floorPlanButton).toBeVisible();
    
    // Ouvrir le plan
    await floorPlanButton.click();
    
    // Vérifier que le plan s'affiche
    await expect(page.getByText(/plan de salle/i)).toBeVisible();
    await expect(page.getByText(/salle|terrasse/i)).toBeVisible();
    
    // Fermer le plan
    await floorPlanButton.click();
    
    // Le plan devrait être fermé (vérifier que la zone est plus petite)
    await page.waitForTimeout(500);
  });

  test.skip("Peut ouvrir le modal de création de réservation", async ({ page }) => {
    await page.goto("/admin/reservations");
    await page.waitForLoadState("networkidle");
    
    // Trouver le bouton de création
    const createButton = page.getByRole("button", { name: /nouvelle|créer|ajouter|\+/i });
    await expect(createButton).toBeVisible();
    
    // Ouvrir le modal
    await createButton.click();
    
    // Vérifier que le modal s'affiche
    await expect(page.getByText(/nouvelle réservation/i)).toBeVisible();
    await expect(page.getByLabel(/prénom/i)).toBeVisible();
    await expect(page.getByLabel(/nom/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test.skip("Peut créer une réservation manuelle", async ({ page }) => {
    await page.goto("/admin/reservations");
    await page.waitForLoadState("networkidle");
    
    // Ouvrir le modal
    const createButton = page.getByRole("button", { name: /nouvelle|créer|ajouter|\+/i });
    await createButton.click();
    
    // Remplir le formulaire
    await page.getByLabel(/prénom/i).fill("Test");
    await page.getByLabel(/nom/i).fill("E2E");
    await page.getByLabel(/email/i).fill("test.e2e@example.com");
    await page.getByLabel(/téléphone/i).fill("+32470000000");
    
    // Sélectionner une heure
    await page.getByRole("button", { name: /12:30|19:00/ }).first().click();
    
    // Soumettre
    const submitButton = page.getByRole("button", { name: /créer|confirmer|enregistrer/i });
    await submitButton.click();
    
    // Vérifier le toast de succès
    await expect(page.getByText(/créée|succès|success/i)).toBeVisible({ timeout: 5000 });
  });

  test.skip("Peut changer le statut d'une réservation", async ({ page }) => {
    await page.goto("/admin/reservations");
    await page.waitForLoadState("networkidle");
    
    // Attendre qu'une réservation soit visible
    const reservationCard = page.locator("[data-testid='reservation-card']").first();
    
    if (await reservationCard.isVisible()) {
      // Cliquer pour ouvrir les actions
      await reservationCard.click();
      
      // Chercher un bouton d'action de statut
      const statusButton = page.getByRole("button", { name: /valider|confirmer|installer|seated/i }).first();
      
      if (await statusButton.isVisible()) {
        await statusButton.click();
        
        // Vérifier le toast de succès
        await expect(page.getByText(/mis à jour|succès|success/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Admin - Plan de salle (nécessite auth)", () => {
  test.skip("Peut basculer entre salle et terrasse", async ({ page }) => {
    await page.goto("/admin/reservations");
    await page.waitForLoadState("networkidle");
    
    // Ouvrir le plan de salle
    const floorPlanButton = page.getByRole("button", { name: /plan|salle|floor/i });
    await floorPlanButton.click();
    
    // Vérifier les boutons de zone
    const salleButton = page.getByRole("button", { name: /^salle$/i });
    const terrasseButton = page.getByRole("button", { name: /terrasse/i });
    
    await expect(salleButton).toBeVisible();
    await expect(terrasseButton).toBeVisible();
    
    // Basculer vers terrasse
    await terrasseButton.click();
    
    // Vérifier que terrasse est active
    await expect(terrasseButton).toHaveClass(/bg-white|active|selected/);
  });

  test.skip("Affiche les tables avec leurs statuts", async ({ page }) => {
    await page.goto("/admin/reservations");
    await page.waitForLoadState("networkidle");
    
    // Ouvrir le plan de salle
    const floorPlanButton = page.getByRole("button", { name: /plan|salle|floor/i });
    await floorPlanButton.click();
    
    // Vérifier la légende
    await expect(page.getByText(/libre/i)).toBeVisible();
    await expect(page.getByText(/réservée/i)).toBeVisible();
    await expect(page.getByText(/occupée/i)).toBeVisible();
  });
});

test.describe("Admin - Configuration tables (nécessite auth)", () => {
  test.skip("Affiche la grille de configuration des tables", async ({ page }) => {
    await page.goto("/admin/settings/tables");
    await page.waitForLoadState("networkidle");
    
    // Vérifier le titre
    await expect(page.getByText(/plan de salle/i)).toBeVisible();
    
    // Vérifier les boutons de zone
    await expect(page.getByRole("button", { name: /salle/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /terrasse/i })).toBeVisible();
    
    // Vérifier le bouton d'ajout de table
    await expect(page.getByRole("button", { name: /ajouter|\+/i })).toBeVisible();
  });

  test.skip("Peut ouvrir/fermer la terrasse", async ({ page }) => {
    await page.goto("/admin/settings/tables");
    await page.waitForLoadState("networkidle");
    
    // Trouver les boutons terrasse
    const openTerrace = page.getByRole("button", { name: /ouvrir terrasse/i });
    const closeTerrace = page.getByRole("button", { name: /fermer terrasse/i });
    
    await expect(openTerrace).toBeVisible();
    await expect(closeTerrace).toBeVisible();
  });
});
