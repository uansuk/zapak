const pad = (n: number) => String(n).padStart(2, '0');

/** Local-timezone YYYY-MM-DD */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(base: Date | string, n: number): string {
  const d = typeof base === 'string' ? new Date(`${base}T12:00:00`) : new Date(base);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(dateStr: string, withDay = true): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return withDay
    ? `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
    : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function relDay(dateStr: string): string {
  const t = todayStr();
  if (dateStr === t) return 'Today';
  if (dateStr === addDays(t, 1)) return 'Tomorrow';
  if (dateStr === addDays(t, -1)) return 'Yesterday';
  return fmtDate(dateStr);
}

export function fmtINR(n: number, digits = 0): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

export function fmtKg(n: number): string {
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-IN');
}

export function timeOf(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** ISO timestamp at a given time on a date string (for seed data). */
export function atTime(dateStr: string, hhmm: string): string {
  return new Date(`${dateStr}T${hhmm}:00`).toISOString();
}
