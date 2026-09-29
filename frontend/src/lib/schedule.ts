/**
 * Plan scheduling — client mirror of backend/src/services/schedule.service.js.
 * Keep the two in step: the server enforces these rules, this copy only
 * decides what the UI offers.
 *
 * Plan days carry no calendar date, so day N maps to the Nth day of the plan
 * week. The week starts Monday unless the plan has a `weekAnchor` set by
 * "restart week from today", which becomes Day 1.
 */

const DAY_MS = 86400000;

export type DayStatus = 'past' | 'today' | 'future';

export interface ScheduleOptions {
  now?: Date;
  anchorIso?: string;
}

/** Minutes ahead of UTC (IST = +330) — opposite sign to getTimezoneOffset(). */
export function localTzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** The viewer's local calendar date, represented as UTC midnight. */
function startOfLocalDay(date: Date): Date {
  const shifted = new Date(date.getTime() + localTzOffsetMinutes() * 60000);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted;
}

function parseIsoDate(iso?: string): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function cycleStartFor(today: Date, anchorIso?: string): Date {
  const anchor = parseIsoDate(anchorIso);

  if (anchor) {
    const elapsed = Math.floor((today.getTime() - anchor.getTime()) / DAY_MS);
    const cycles = elapsed < 0 ? 0 : Math.floor(elapsed / 7);
    return new Date(anchor.getTime() + cycles * 7 * DAY_MS);
  }

  const mondayOffset = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - mondayOffset * DAY_MS);
}

/** Date that plan day `dayIndex` (0-based) falls on in the current cycle. */
export function planDayDate(dayIndex: number, { now = new Date(), anchorIso }: ScheduleOptions = {}): Date {
  const today = startOfLocalDay(now);
  return new Date(cycleStartFor(today, anchorIso).getTime() + dayIndex * DAY_MS);
}

export function dayStatus(dayIndex: number, options: ScheduleOptions = {}): DayStatus {
  const today = startOfLocalDay(options.now ?? new Date());
  const diffDays = Math.round((planDayDate(dayIndex, options).getTime() - today.getTime()) / DAY_MS);
  if (diffDays > 0) return 'future';
  if (diffDays === 0) return 'today';
  return 'past';
}

/** Future days are view-only. Today and missed earlier days can be started. */
export function canStartDay(dayIndex: number, options: ScheduleOptions = {}): boolean {
  return dayStatus(dayIndex, options) !== 'future';
}

/** Index of the plan day scheduled for today, or -1 when today is a rest day. */
export function todayDayIndex(dayCount: number, options: ScheduleOptions = {}): number {
  for (let i = 0; i < dayCount; i++) {
    if (dayStatus(i, options) === 'today') return i;
  }
  return -1;
}

/** "Mon 28 Sep" for display next to a plan day. */
export function formatDayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC', // dates are held as UTC midnight
  });
}

/** Whole days since the last completed session, or null if there is none. */
export function daysSinceLastSession(lastCompletedAt?: string | null, now = new Date()): number | null {
  if (!lastCompletedAt) return null;
  const today = startOfLocalDay(now);
  const last = startOfLocalDay(new Date(lastCompletedAt));
  return Math.round((today.getTime() - last.getTime()) / DAY_MS);
}
