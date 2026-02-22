"use client";

import { useEffect, useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BUILD_ID_ENDPOINT = "/api/version";
const DAILY_REFRESH_HOUR = 3; // 3h du matin

interface VersionCheckerProps {
  checkInterval?: number;
}

export function VersionChecker({ checkInterval = VERSION_CHECK_INTERVAL }: VersionCheckerProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);

  const fetchBuildId = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(BUILD_ID_ENDPOINT, { 
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.buildId || null;
    } catch {
      return null;
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!initialBuildId) return;
    
    const currentBuildId = await fetchBuildId();
    if (currentBuildId && currentBuildId !== initialBuildId) {
      setUpdateAvailable(true);
    }
  }, [initialBuildId, fetchBuildId]);

  const handleRefresh = useCallback(() => {
    // Force reload bypassing cache
    window.location.reload();
  }, []);

  // Initialize build ID on mount
  useEffect(() => {
    fetchBuildId().then((buildId) => {
      if (buildId) {
        setInitialBuildId(buildId);
      }
    });
  }, [fetchBuildId]);

  // Check for updates at regular intervals
  useEffect(() => {
    if (!initialBuildId) return;

    const interval = setInterval(checkForUpdate, checkInterval);
    
    // Also check when app becomes visible (user returns to tab/app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialBuildId, checkInterval, checkForUpdate]);

  // Daily refresh at 3am to update the "today" date
  useEffect(() => {
    const scheduleNextRefresh = () => {
      const now = new Date();
      const nextRefresh = new Date();
      nextRefresh.setHours(DAILY_REFRESH_HOUR, 0, 0, 0);
      
      // If it's already past 3am today, schedule for tomorrow
      if (now >= nextRefresh) {
        nextRefresh.setDate(nextRefresh.getDate() + 1);
      }
      
      const msUntilRefresh = nextRefresh.getTime() - now.getTime();
      
      return setTimeout(() => {
        window.location.reload();
      }, msUntilRefresh);
    };

    const timeoutId = scheduleNextRefresh();
    
    return () => clearTimeout(timeoutId);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] animate-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={handleRefresh}
        className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw size={18} className="animate-spin" />
        <span className="font-medium">Nouvelle version disponible - Cliquez pour mettre à jour</span>
      </button>
    </div>
  );
}
