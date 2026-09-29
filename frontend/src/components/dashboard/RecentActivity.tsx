/**
 * Recent Activity component.
 * Shows the last few workout logs with relative timestamps.
 *
 * "Clear" only hides entries from this view — nothing is deleted. These logs
 * drive the streak, session counts and muscle breakdown, so removing them
 * would corrupt those figures. The dismissal is a local timestamp, so any
 * workout logged afterwards shows up again.
 *
 * Uses theme CSS variables for dark/light mode support.
 */

import { useSyncExternalStore } from 'react';
import { WorkoutLog } from '@/types';

const CLEARED_AT_KEY = 'rix_activity_cleared_at';

// Tiny store over localStorage. useSyncExternalStore gives a server snapshot
// for prerendering, so this reads storage without a hydration mismatch and
// without setting state from an effect.
const listeners = new Set<() => void>();
const emitChange = () => listeners.forEach((l) => l());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

const getClearedAt = () => localStorage.getItem(CLEARED_AT_KEY);
const getServerClearedAt = () => null;

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
  const stored = useSyncExternalStore(subscribe, getClearedAt, getServerClearedAt);
  const clearedAt = stored ? parseInt(stored, 10) : null;

  const clear = () => {
    localStorage.setItem(CLEARED_AT_KEY, String(Date.now()));
    emitChange();
  };

  const restore = () => {
    localStorage.removeItem(CLEARED_AT_KEY);
    emitChange();
  };

  const visibleLogs = clearedAt
    ? logs.filter(l => new Date(l.loggedAt).getTime() > clearedAt)
    : logs;

  // Entries exist but are hidden by an earlier clear.
  if (logs.length > 0 && visibleLogs.length === 0) {
    return (
      <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
          <button onClick={restore} className="text-xs font-medium hover:underline" style={{ color: 'var(--text-secondary)' }}>
            Show all
          </button>
        </div>
        <p className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Activity cleared. Your history and stats are unchanged.
        </p>
      </div>
    );
  }

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
        <button onClick={clear} className="text-xs font-medium hover:underline" style={{ color: 'var(--text-secondary)' }}
          title="Hides these entries. Nothing is deleted.">
          Clear
        </button>
      </div>
      <div className="space-y-3">
        {visibleLogs.map((log) => (
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
