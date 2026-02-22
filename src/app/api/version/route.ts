import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Use build timestamp as version identifier
  // This changes with each Vercel deployment
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA || 
                  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
                  Date.now().toString();
  
  return NextResponse.json(
    { buildId, timestamp: new Date().toISOString() },
    { 
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    }
  );
}
