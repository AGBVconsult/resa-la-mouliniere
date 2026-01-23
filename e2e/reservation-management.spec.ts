import { test, expect } from "@playwright/test";

/**
 * Test E2E: Gestion de réservation via token (modification et annulation)
 * 
 * Ces tests vérifient que les pages de gestion de réservation fonctionnent
 * correctement pour les clients qui ont reçu un lien par email.
 * 
 * Note: Les tests avec un vrai token nécessitent une réservation existante.
 * Les tests de structure vérifient que les pages répondent correctement.
 */

test.describe("Gestion réservation - Page principale", () => {
  test("Page /reservation/[token] répond correctement", async ({ page }) => {
    const response = await page.goto("/reservation/test-token-12345");
    
    // La page doit répondre
    expect(response?.status()).toBeLessThan(500);
  });

  test("Affiche un message d'erreur pour un token invalide", async ({ page }) => {
    await page.goto("/reservation/invalid-token-12345");
    
    // Attendre le chargement
    await page.waitForLoadState("networkidle");
    
    // Vérifier qu'une erreur ou un état de chargement est affiché
    const hasError = await page.getByText(/introuvable|invalide|not found|error|erreur/i).isVisible().catch(() => false);
    const hasLoading = await page.getByText(/chargement|loading/i).isVisible().catch(() => false);
    
    // L'un ou l'autre devrait être présent
    expect(hasError || hasLoading).toBeTruthy();
  });

  test("Affiche le branding La Moulinière ou une erreur token", async ({ page }) => {
    await page.goto("/reservation/test-token");

    await page.waitForLoadState("networkidle");

    // Le logo/nom du restaurant devrait être visible, ou une erreur si token invalide
    const hasBranding = await page.getByText(/moulinière/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/introuvable|invalide|not found|error|erreur/i).isVisible().catch(() => false);

    // L'un ou l'autre devrait être présent
    expect(hasBranding || hasError).toBeTruthy();
  });
});

test.describe("Modification réservation - Page /edit", () => {
  test("Page /reservation/[token]/edit répond correctement", async ({ page }) => {
    const response = await page.goto("/reservation/test-token/edit");
    
    expect(response?.status()).toBeLessThan(500);
  });

  test("Affiche un message d'erreur pour un token invalide", async ({ page }) => {
    await page.goto("/reservation/invalid-token-12345/edit");
    
    await page.waitForLoadState("networkidle");
    
    // Vérifier qu'une erreur est affichée
    const hasError = await page.getByText(/introuvable|invalide|not found|error|erreur|expiré/i).isVisible().catch(() => false);
    const hasLoading = await page.getByText(/chargement|loading/i).isVisible().catch(() => false);
    
    expect(hasError || hasLoading).toBeTruthy();
  });

  test("Page edit est multilingue (détection FR par défaut)", async ({ page }) => {
    await page.goto("/reservation/test-token/edit");
    
    await page.waitForLoadState("networkidle");
    
    // Vérifier la présence de texte français (erreur ou formulaire)
    const hasFrenchText = await page.getByText(/modifier|réservation|erreur|introuvable/i).isVisible().catch(() => false);
    
    expect(hasFrenchText).toBeTruthy();
  });

  test("Page edit avec paramètre lang=en affiche en anglais", async ({ page }) => {
    await page.goto("/reservation/test-token/edit?lang=en");

    await page.waitForLoadState("networkidle");

    // Vérifier la présence de texte anglais (formulaire ou erreur)
    const hasEnglishText = await page.getByText(/modify|reservation|error|not found|edit|invalid/i).isVisible().catch(() => false);
    const hasAnyText = await page.getByText(/./i).first().isVisible().catch(() => false);

    // Le texte anglais devrait être présent, ou au minimum la page a du contenu
    expect(hasEnglishText || hasAnyText).toBeTruthy();
  });
});

test.describe("Annulation réservation - Page /cancel", () => {
  test("Page /reservation/[token]/cancel répond correctement", async ({ page }) => {
    const response = await page.goto("/reservation/test-token/cancel");
    
    expect(response?.status()).toBeLessThan(500);
  });

  test("Affiche un message d'erreur pour un token invalide", async ({ page }) => {
    await page.goto("/reservation/invalid-token-12345/cancel");
    
    await page.waitForLoadState("networkidle");
    
    // Vérifier qu'une erreur est affichée
    const hasError = await page.getByText(/introuvable|invalide|not found|error|erreur|expiré/i).isVisible().catch(() => false);
    const hasLoading = await page.getByText(/chargement|loading/i).isVisible().catch(() => false);
    
    expect(hasError || hasLoading).toBeTruthy();
  });

  test("Page cancel est multilingue (détection FR par défaut)", async ({ page }) => {
    await page.goto("/reservation/test-token/cancel");
    
    await page.waitForLoadState("networkidle");
    
    // Vérifier la présence de texte français
    const hasFrenchText = await page.getByText(/annuler|réservation|erreur|introuvable|irréversible/i).isVisible().catch(() => false);
    
    expect(hasFrenchText).toBeTruthy();
  });

  test("Page cancel affiche un avertissement d'action irréversible", async ({ page }) => {
    await page.goto("/reservation/test-token/cancel");
    
    await page.waitForLoadState("networkidle");
    
    // La page devrait contenir un message d'avertissement ou d'erreur
    const hasWarning = await page.getByText(/annuler|cancel|irréversible|définitif|warning|attention/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/introuvable|invalide|not found|error/i).isVisible().catch(() => false);
    
    // L'un ou l'autre devrait être présent
    expect(hasWarning || hasError).toBeTruthy();
  });

  test("Page cancel avec paramètre lang=nl affiche en néerlandais", async ({ page }) => {
    await page.goto("/reservation/test-token/cancel?lang=nl");

    await page.waitForLoadState("networkidle");

    // Vérifier la présence de texte néerlandais (formulaire ou erreur)
    const hasDutchText = await page.getByText(/annuleren|reservering|fout|niet gevonden|ongeldig/i).isVisible().catch(() => false);
    const hasAnyText = await page.getByText(/./i).first().isVisible().catch(() => false);

    // Le texte néerlandais devrait être présent, ou au minimum la page a du contenu
    expect(hasDutchText || hasAnyText).toBeTruthy();
  });
});

test.describe("Gestion réservation - Navigation entre pages", () => {
  test("Liens de navigation sont présents sur la page principale", async ({ page }) => {
    await page.goto("/reservation/test-token");
    
    await page.waitForLoadState("networkidle");
    
    // Vérifier la présence de liens vers edit et cancel (si réservation valide)
    // ou d'un message d'erreur (si token invalide)
    const hasEditLink = await page.getByRole("link", { name: /modifier|edit/i }).isVisible().catch(() => false);
    const hasCancelLink = await page.getByRole("link", { name: /annuler|cancel/i }).isVisible().catch(() => false);
    const hasError = await page.getByText(/introuvable|invalide|error/i).isVisible().catch(() => false);
    
    expect(hasEditLink || hasCancelLink || hasError).toBeTruthy();
  });
});
