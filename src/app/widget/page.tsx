"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WidgetContainer } from "./components/WidgetContainer";
import { Loader2 } from "lucide-react";

type Language = "fr" | "nl" | "en" | "de" | "it";

function WidgetContent() {
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") || "fr") as Language;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

  return <WidgetContainer lang={lang} turnstileSiteKey={turnstileSiteKey} />;
}

function WidgetSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <WidgetContent />
    </Suspense>
  );
}
