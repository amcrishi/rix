/**
 * Weekly Overview component.
 * Visual display of training days this week.
 * Uses theme CSS variables for dark/light mode support.
 */

interface WeeklyOverviewProps {
  completedDays: number[];
  targetDays: number;
}

export default function WeeklyOverview({ completedDays, targetDays }: WeeklyOverviewProps) {
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

      <div className="grid grid-cols-7 gap-2">
        {dayLabels.map((label, index) => {
          const isCompleted = completedDays.includes(index);
          const isToday = index === today;
          const isFuture = index > today;

          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium"
                style={{ color: isToday ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                {label}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
