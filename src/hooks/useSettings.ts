/**
 * Hook for managing global settings.
 * PRD-012: Réglages Généraux
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";

export function useSettings() {
  const settings = useQuery(api.globalSettings.get);
  const history = useQuery(api.globalSettings.getHistory, { limit: 20 });

  const updateMutation = useMutation(api.globalSettings.update);
  const resetMutation = useMutation(api.globalSettings.resetToDefaults);

  const updateSettings = useCallback(
    async (updates: Record<string, unknown>) => {
      const result = await updateMutation({ updates });
      return result;
    },
    [updateMutation]
  );

  const resetToDefaults = useCallback(async () => {
    const result = await resetMutation();
    return result;
  }, [resetMutation]);

  return {
    settings,
    history,
    isLoading: settings === undefined,
    updateSettings,
    resetToDefaults,
  };
}

export function usePublicSettings() {
  const settings = useQuery(api.globalSettings.getPublicSettings);
  return { settings, isLoading: settings === undefined };
}
