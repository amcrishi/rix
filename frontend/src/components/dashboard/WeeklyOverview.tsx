/**
 * Weekly Overview component.
 * Visual display of training days this week.
 * Completed days are clickable and open that day's workout history.
 * Uses theme CSS variables for dark/light mode support.
 */

interface WeeklyOverviewProps {
  completedDays: number[];
  targetDays: number;
  /** Called with an ISO date (YYYY-MM-DD) when a completed day is clicked. */
  onSelectDay?: (isoDate: string) => void;
}

/** ISO date (YYYY-MM-DD) for a Monday-based weekday index in the current week. */
function isoDateForDayIndex(index: number, todayIndex: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (todayIndex - index));
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function WeeklyOverview({ completedDays, targetDays, onSelectDay }: WeeklyOverviewProps) {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = (new Date().getDay() + 6) % 7;

  return (
    <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>This Week</h3>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {completedDays.length}/{targetDays} days
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {dayLabels.map((label, index) => {
          const isCompleted = completedDays.includes(index);
          const isToday = index === today;
          const isFuture = index > today;
          // Only days with a logged workout are actionable.
          const isClickable = isCompleted && !!onSelectDay;

          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="text-[10px] sm:text-xs font-medium"
                style={{ color: isToday ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                {label}
              </span>
              <button
                type="button"
                disabled={!isClickable}
                onClick={isClickable ? () => onSelectDay(isoDateForDayIndex(index, today)) : undefined}
                aria-label={isCompleted ? `View ${label}'s workout` : `${label} — no workout logged`}
                title={isCompleted ? `View ${label}'s workout` : undefined}
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                }`}
                style={
                  isCompleted
                    ? { background: '#22c55e', color: '#fff' }
                    : isToday
                      ? { background: 'var(--color-primary-light)', color: 'var(--color-primary)', boxShadow: '0 0 0 2px var(--color-primary)' }
                      : isFuture
                        ? { background: 'var(--bg-hover)', color: 'var(--text-muted)', opacity: 0.5 }
                        : { background: 'var(--bg-hover)', color: 'var(--text-muted)' }
                }
              >
                {isCompleted ? '✓' : index + 1}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
