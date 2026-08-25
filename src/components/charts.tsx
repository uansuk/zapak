import { fmtDate } from '../lib/format';

/** 7-day price sparkline with area fill; skips null days by carrying last value. */
export function Sparkline({ data, height = 72, stroke = 'var(--color-sea)', fill = 'rgba(18,131,135,0.14)' }: {
  data: { date: string; avg: number | null }[]; height?: number; stroke?: string; fill?: string;
}) {
  const vals = data.map(d => d.avg);
  const known = vals.filter((v): v is number => v !== null);
  if (known.length < 2) {
    return <div className="h-[72px] flex items-center justify-center text-xs text-mist">Not enough trading days yet</div>;
  }
  const filled: number[] = [];
  let last = known[0];
  for (const v of vals) { if (v !== null) last = v; filled.push(last); }
  const min = Math.min(...filled), max = Math.max(...filled);
  const span = Math.max(1, max - min);
  const W = 300, H = height, P = 6;
  const pts = filled.map((v, i) => [
    P + (i * (W - 2 * P)) / (filled.length - 1),
    H - P - ((v - min) / span) * (H - 2 * P),
  ]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label="price trend">
      <polygon points={area} fill={fill} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3.4" fill={stroke} stroke="white" strokeWidth="1.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill={stroke} opacity="0.5" />
      ))}
    </svg>
  );
}

/** Vertical bars for upcoming supply days. */
export function DayBars({ data, unit = 'kg' }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-stretch gap-3 sm:gap-5 h-44">
      {data.map(d => (
        <div key={d.label} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 min-w-0">
          <span className="num text-[11px] font-semibold text-ink">{d.value.toLocaleString('en-IN')}<span className="text-mist font-normal"> {unit}</span></span>
          <div
            className="w-full max-w-[64px] rounded-t-md bg-gradient-to-t from-sea to-sealight transition-all duration-700 relative group"
            style={{ height: `${Math.max(6, (d.value / max) * 100)}%` }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-amber/80 rounded-t-md" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-mist whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Min–avg–max range strip used in the price board. */
export function RangeStrip({ min, avg, max }: { min: number; avg: number; max: number }) {
  const span = Math.max(1, max - min);
  const pct = ((avg - min) / span) * 100;
  return (
    <div className="relative h-1.5 rounded-full bg-white/12 overflow-visible">
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-sealight/50 via-sealight to-amber" />
      <div
        className="absolute -top-[3px] w-3 h-3 rounded-full bg-amber border-2 border-deep shadow transition-[left] duration-500"
        style={{ left: `calc(${Math.min(97, Math.max(0, pct))}% - 6px)` }}
        title={`avg ₹${avg}`}
      />
    </div>
  );
}

export function HistoryAxis({ data }: { data: { date: string }[] }) {
  return (
    <div className="flex justify-between px-1 mt-1">
      {data.filter((_, i) => i % 2 === 0).map(d => (
        <span key={d.date} className="text-[10px] num text-mist">{fmtDate(d.date, false)}</span>
      ))}
    </div>
  );
}
