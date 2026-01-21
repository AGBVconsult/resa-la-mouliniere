/**
 * @deprecated Ce fichier contient des stubs non implémentés.
 * Utilisez `emails.ts` pour les fonctionnalités d'envoi d'emails.
 * 
 * Ces exports sont conservés pour la compatibilité API mais lèvent une erreur.
 */
import { action } from "./_generated/server";
import { v } from "convex/values";

export const processQueue = action({
  args: { now: v.number() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.emails.processQueue à la place");
  },
});

export const sendJob = action({
  args: { jobId: v.string() },
  handler: async () => {
    throw new Error("DEPRECATED: Utilisez api.emails.sendJob à la place");
  },
});
