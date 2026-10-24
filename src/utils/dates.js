// Format an ISO date string for display.
export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString();
}
