/**
 * Recent Activity component.
 * Shows the last few workout logs with relative timestamps.
 * Uses theme CSS variables for dark/light mode support.
 */

import { WorkoutLog } from '@/types';

interface RecentActivityProps {
  logs: WorkoutLog[];
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function RecentActivity({ logs }: RecentActivityProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
        <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>No workouts logged yet. Start training!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.1)' }}>
              <span className="text-green-500 text-lg">✓</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{log.exercise}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {log.duration
                  ? `${log.duration} min`
                  : `${log.sets}×${log.reps}${log.weight ? ` @ ${log.weight}kg` : ''}`}
                {log.notes && ` • ${log.notes}`}
              </p>
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(log.loggedAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
