import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    convex: { status: "ok" | "error"; latencyMs?: number; error?: string };
    environment: { status: "ok" | "error"; missing?: string[] };
  };
}

export async function GET() {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    checks: {
      convex: { status: "ok" },
      environment: { status: "ok" },
    },
  };

  // Check required environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_CONVEX_URL",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  ];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingEnvVars.length > 0) {
    health.checks.environment = {
      status: "error",
      missing: missingEnvVars,
    };
    health.status = "degraded";
  }

  // Check Convex connectivity
  try {
    const convexStart = Date.now();
    // Simple query to check Convex is responding
    await convex.query(api.widget.getSettings, { lang: "fr" });
    health.checks.convex = {
      status: "ok",
      latencyMs: Date.now() - convexStart,
    };
  } catch (error) {
    health.checks.convex = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    health.status = "unhealthy";
  }

  // Determine HTTP status code
  const httpStatus =
    health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
