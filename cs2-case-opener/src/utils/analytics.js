export function track(eventName, properties = {}) {
  if (import.meta.env?.MODE === 'development' || !import.meta.env?.VITE_ANALYTICS_URL) {
    console.log('[Analytics]', eventName, properties);
    return;
  }

  fetch(import.meta.env.VITE_ANALYTICS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, properties }),
  }).catch(() => {});
}
