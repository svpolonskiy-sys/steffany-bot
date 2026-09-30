export type AnalyticsEvent =
  | "primary_cta_click"
  | "demo_step_view"
  | "demo_complete"
  | "scenario_select"
  | "contact_start"
  | "contact_submit_success"
  | "contact_submit_error";

type Sink = (event: AnalyticsEvent, props?: Record<string, string | number>) => void;

declare global {
  interface Window {
    /** Підключіть провайдера після налаштування згоди: window.__synapticAnalytics = (e, p) => ... */
    __synapticAnalytics?: Sink;
  }
}

/** Безпечний виклик: якщо провайдера не налаштовано — нічого не відбувається. Без персональних даних. */
export function track(event: AnalyticsEvent, props?: Record<string, string | number>) {
  try {
    if (typeof window !== "undefined") window.__synapticAnalytics?.(event, props);
  } catch {
    /* ignore */
  }
}
