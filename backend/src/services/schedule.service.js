/**
 * Plan Scheduling.
 *
 * Plan days are labelled "Day 1", "Day 2"... with no calendar date attached,
 * so the mapping is derived: day N falls on the Nth day of the plan week.
 * By default the week starts Monday. A plan may carry `planData.weekAnchor`
 * (an ISO date) set by "restart week from today", which becomes Day 1 instead.
 *
 * Rules:
 *   - A day in the future cannot be started. It can still be viewed.
 *   - A day earlier in the current cycle can still be started (catch-up),
 *     so a single missed day doesn't block the user.
 */

const DAY_MS = 86400000;

/**
 * The user's local calendar date, represented as UTC midnight.
 *
 * Everything here works in that space so weekday and day-difference maths
 * stay consistent (parseIsoDate produces the same representation).
 *
 * `tzOffsetMinutes` is minutes AHEAD of UTC — IST is +330. Note this is the
 * opposite sign to JS `Date.getTimezoneOffset()`, so callers pass
 * `-new Date().getTimezoneOffset()`.
 */
const startOfLocalDay = (date, tzOffsetMinutes = 0) => {
  const shifted = new Date(date.getTime() + tzOffsetMinutes * 60000);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted;
};

/** Parse "YYYY-MM-DD" as a UTC midnight date. Returns null if unusable. */
const parseIsoDate = (iso) => {
  if (typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * First day of the plan cycle that contains `today`.
 * Without an anchor this is the Monday of the current week; with one it is
 * the anchor date advanced in whole weeks until it covers today.
 */
const cycleStartFor = (today, anchorIso) => {
  const anchor = parseIsoDate(anchorIso);

  if (anchor) {
    const elapsed = Math.floor((today.getTime() - anchor.getTime()) / DAY_MS);
    // Before the anchor takes effect, the anchor itself starts the cycle.
    const cycles = elapsed < 0 ? 0 : Math.floor(elapsed / 7);
    return new Date(anchor.getTime() + cycles * 7 * DAY_MS);
  }

  // Monday-based week. getUTCDay(): 0=Sun..6=Sat
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - mondayOffset * DAY_MS);
};

/**
 * The date plan day `dayIndex` (0-based) falls on in the current cycle.
 * @returns {Date}
 */
const planDayDate = (dayIndex, { now = new Date(), tzOffsetMinutes = 0, anchorIso } = {}) => {
  const today = startOfLocalDay(now, tzOffsetMinutes);
  const cycleStart = cycleStartFor(today, anchorIso);
  return new Date(cycleStart.getTime() + dayIndex * DAY_MS);
};

/**
 * Where a plan day sits relative to today.
 * @returns {'past'|'today'|'future'}
 */
const dayStatus = (dayIndex, options = {}) => {
  const { now = new Date(), tzOffsetMinutes = 0 } = options;
  const today = startOfLocalDay(now, tzOffsetMinutes);
  const target = planDayDate(dayIndex, options);
  const diffDays = Math.round((target.getTime() - today.getTime()) / DAY_MS);

  if (diffDays > 0) return 'future';
  if (diffDays === 0) return 'today';
  return 'past';
};

/** Future days are view-only; today and earlier catch-up days can be started. */
const canStartDay = (dayIndex, options = {}) => dayStatus(dayIndex, options) !== 'future';

/**
 * Days since the last completed session, or null if there has never been one.
 * Used to decide whether to offer "restart week from today".
 */
const daysSinceLastSession = (lastCompletedAt, { now = new Date(), tzOffsetMinutes = 0 } = {}) => {
  if (!lastCompletedAt) return null;
  const today = startOfLocalDay(now, tzOffsetMinutes);
  const last = startOfLocalDay(new Date(lastCompletedAt), tzOffsetMinutes);
  return Math.round((today.getTime() - last.getTime()) / DAY_MS);
};

module.exports = {
  DAY_MS,
  startOfLocalDay,
  parseIsoDate,
  cycleStartFor,
  planDayDate,
  dayStatus,
  canStartDay,
  daysSinceLastSession,
};
