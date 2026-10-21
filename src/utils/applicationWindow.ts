// KGEF applications close 24 hours after this was last set (22 October 2026,
// 14:23 West Africa Time, UTC+1, no DST in Nigeria). This is the single
// source of truth for the cutoff; the frontend has its own copy of this
// same instant so it can show the closed state without a network round
// trip, but this backend check is the one that actually matters, since
// it's enforced regardless of what the client does or doesn't show.
export const APPLICATION_CLOSE_DATE = new Date("2026-10-22T14:23:00+01:00");

export function isApplicationWindowClosed(): boolean {
  return Date.now() >= APPLICATION_CLOSE_DATE.getTime();
}
