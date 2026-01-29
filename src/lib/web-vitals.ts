// Web Vitals monitoring pour Lighthouse 100/100
// Mesure LCP, FID, CLS, FCP, TTFB

type MetricName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

interface Metric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

type ReportHandler = (metric: Metric) => void;

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function getConnectionSpeed(): string {
  if (typeof navigator === 'undefined') return '';
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  return nav.connection?.effectiveType ?? '';
}

export function sendToAnalytics(metric: Metric, options?: { analyticsId?: string }) {
  const analyticsId = options?.analyticsId;
  if (!analyticsId) {
    // Log en dev uniquement
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
    }
    return;
  }

  const body = {
    dsn: analyticsId,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: getConnectionSpeed(),
  };

  const blob = new Blob([new URLSearchParams(body).toString()], {
    type: 'application/x-www-form-urlencoded',
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, blob);
  } else {
    fetch(vitalsUrl, {
      body: blob,
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
    });
  }
}

export async function reportWebVitals(onReport: ReportHandler) {
  if (typeof window === 'undefined') return;

  try {
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
    
    onCLS(onReport);
    onFCP(onReport);
    onINP(onReport);
    onLCP(onReport);
    onTTFB(onReport);
  } catch {
    // web-vitals non disponible
  }
}
