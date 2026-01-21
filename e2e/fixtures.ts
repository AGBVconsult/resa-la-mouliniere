import { test as base, expect, type Page } from "@playwright/test";

/**
 * Fixtures et helpers pour les tests E2E
 */

// Données de test réutilisables
export const testData = {
  // Client de test
  client: {
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean.dupont@test.com",
    phone: "+32470123456",
  },
  // Réservation de test
  reservation: {
    adults: 4,
    children: 0,
    babies: 0,
  },
};

// Helper pour obtenir une date future valide (demain ou après-demain si weekend)
export function getNextValidDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 2); // Après-demain pour éviter les problèmes de timezone
  
  // Si c'est un dimanche, passer au lundi
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split("T")[0];
}

// Helper pour formater une date en format lisible
export function formatDateForTest(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

// Extension du test de base avec des fixtures personnalisées
export const test = base.extend<{
  widgetPage: Page;
}>({
  // Fixture pour la page widget
  widgetPage: async ({ page }, use) => {
    await page.goto("/widget?lang=fr");
    await use(page);
  },
});

export { expect };
