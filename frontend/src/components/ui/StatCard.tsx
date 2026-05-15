/**
 * StatCard — video background edition.
 * Giant editorial number, always white text, hairline border.
 */

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function StatCard({ label, value, unit, trend, trendValue }: StatCardProps) {
  return (
    <div
      className="p-4 md:p-8 transition-all duration-200"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-white opacity-60">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl md:text-5xl font-bold leading-none tracking-tight text-white">
          {value}
        </span>
        {unit && (
          <span className="text-[12px] tracking-[0.15em] uppercase font-medium text-white opacity-55">
            {unit}
          </span>
        )}
      </div>
      {trendValue && (
        <p className="mt-3 text-[10px] tracking-[0.2em] uppercase font-medium"
          style={{ color: trend === 'up' ? '#fff' : 'rgba(255,255,255,0.5)' }}>
          {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{trendValue}
        </p>
      )}
    </div>
  );
}

