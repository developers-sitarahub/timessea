"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { analytics, AnalyticsEventType } from "../lib/analytics";

function AnalyticsTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      // Construct full URL including query params
      const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      analytics.track({
        event: AnalyticsEventType.PAGE_VIEW,
        metadata: {
          path: pathname,
          url: url,
          referrer: typeof document !== "undefined" ? document.referrer : "",
        },
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerContent />
    </Suspense>
  );
}
