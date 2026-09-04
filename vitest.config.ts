import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    // convex-test doit être exécuté en ESM natif (pas de pré-bundling)
    server: { deps: { inline: ["convex-test"] } },
  },
});
