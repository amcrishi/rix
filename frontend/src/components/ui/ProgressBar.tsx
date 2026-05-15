/**
 * Progress Bar component.
 * Animated, color-coded progress indicator.
 * Uses theme CSS variables for dark/light mode support.
 */

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({ value, label, showPercentage = true, size = 'md' }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4' };

  const getColor = (v: number) => {
    if (v >= 75) return '#22c55e';
    if (v >= 50) return '#aaa';
    if (v >= 25) return '#888';
    return '#666';
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {showPercentage && <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{clampedValue}%</span>}
        </div>
      )}
      <div className={`w-full rounded-full ${heights[size]} overflow-hidden`}
        style={{ background: 'var(--bg-hover)' }}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${clampedValue}%`, background: getColor(clampedValue) }}
        />
      </div>
    </div>
  );
}
