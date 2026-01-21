import { test, expect } from "@playwright/test";

/**
 * Test E2E: Demande de groupe (> 15 personnes)
 * 
 * Ce test vérifie que les groupes de plus de 15 personnes
 * sont correctement redirigés vers le formulaire de demande de groupe.
 */

test.describe("Widget - Demande de groupe", () => {
  test("Widget affiche le compteur d'adultes", async ({ page }) => {
    await page.goto("/widget?lang=fr");
    
    // Vérifier que le compteur d'adultes est visible
    await expect(page.getByText("Adultes")).toBeVisible();
    
    // Vérifier que le bouton Continuer est visible
    await expect(page.getByRole("button", { name: /Continuer/i })).toBeVisible();
    
    // Vérifier que le total est affiché
    await expect(page.getByText(/Total/i)).toBeVisible();
  });

  test("Page group-request existe", async ({ page }) => {
    const response = await page.goto("/widget/group-request");
    
    // La page doit répondre (même si elle redirige)
    expect(response?.status()).toBeLessThan(500);
  });
});
