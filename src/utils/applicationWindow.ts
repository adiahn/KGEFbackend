// KGEF applications close at the start of 11 September 2026 West Africa
// Time (UTC+1, no DST in Nigeria). This is the single source of truth for
// the cutoff; the frontend has its own copy of this same instant so it can
// show the closed state without a network round trip, but this backend
// check is the one that actually matters, since it's enforced regardless
// of what the client does or doesn't show.
export const APPLICATION_CLOSE_DATE = new Date("2026-09-11T00:00:00+01:00");

export function isApplicationWindowClosed(): boolean {
  return Date.now() >= APPLICATION_CLOSE_DATE.getTime();
}
