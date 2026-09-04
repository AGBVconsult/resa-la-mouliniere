/**
 * Type ambiant pour `import.meta.glob` (Vite/Vitest), utilisé par convex-test.
 * Évite de dépendre de la résolution de `vite/client` depuis le tsconfig racine.
 */
interface ImportMeta {
  glob(pattern: string | readonly string[]): Record<string, () => Promise<unknown>>;
}
