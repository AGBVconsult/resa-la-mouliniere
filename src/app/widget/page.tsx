import { Suspense } from "react";
import Widget from "./components/Widget";

function WidgetSkeleton() {
  return (
    <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
      <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4">
          <div className="h-6 bg-slate-700 rounded w-1/2 animate-pulse" />
          <div className="flex justify-center mt-4">
            <div className="h-5 bg-slate-700 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
            <div className="h-48 bg-slate-100 rounded mt-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <Widget />
    </Suspense>
  );
}
