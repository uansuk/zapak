import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/* ------------------------------------------------------------------ */
/* icons                                                               */
/* ------------------------------------------------------------------ */

const paths: Record<string, ReactNode> = {
  fish: (<><path d="M3 12c3.5-5.2 9-7 13.5-5.2L21 3.5l-.9 6.1.9 6.1-4.5-3.3C12 14.2 6.5 12.4 3 12Z" /><circle cx="16.2" cy="10.6" r="0.4" fill="currentColor" /><path d="M7.5 12h5" /></>),
  scale: (<><path d="M12 3v4M5 7h14" /><path d="M5 7 2.5 13a3.5 3.5 0 0 0 7 0L7 7M17 7l-2.5 6a3.5 3.5 0 0 0 7 0L19 7" /><path d="M12 7v11M8 21h8" /></>),
  tag: (<><path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8L3 11Z" /><circle cx="7.5" cy="7.5" r="1" /></>),
  gavel: (<><path d="m13 6 5 5M10.5 8.5 4 15l5 5 6.5-6.5" /><path d="m12 4 8 8M14.5 6.5 9 12" /><path d="M3 21h9" /></>),
  bell: (<><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.1a6.5 6.5 0 0 1 3.5 5.9" /></>),
  clipboard: (<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2.8A.8.8 0 0 1 9.8 2h4.4a.8.8 0 0 1 .8.8V4" /><path d="M9 10h6M9 14h6M9 18h3" /></>),
  megaphone: (<><path d="m3 11 14-6v14L3 13v-2Z" /><path d="M17 8a3.5 3.5 0 0 1 0 8" /><path d="M6.5 13.8 8 20l3-.6-1-5.2" /></>),
  chart: (<><path d="M3 3v18h18" /><path d="m6.5 14 4-5 3.5 3 5-6.5" /></>),
  shield: (<><path d="M12 2 4.5 5v6c0 5 3.2 8.7 7.5 11 4.3-2.3 7.5-6 7.5-11V5L12 2Z" /><path d="m8.8 11.5 2.2 2.2 4.2-4.5" /></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  edit: (<><path d="M17 3.5 20.5 7 8 19.5l-4.5 1 1-4.5L17 3.5Z" /></>),
  x: (<path d="m6 6 12 12M18 6 6 18" />),
  check: (<path d="m4.5 12.5 5 5L19.5 7" />),
  'arrow-right': (<path d="M4 12h16m-6-6 6 6-6 6" />),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>),
  pin: (<><path d="M12 21v-6" /><path d="M7 3h10l-1.5 7.5L18 13H6l2.5-2.5L7 3Z" /></>),
  warn: (<><path d="M12 3 1.8 20.2h20.4L12 3Z" /><path d="M12 10v4.5M12 17.5v.3" /></>),
  store: (<><path d="M4 10v10h16V10" /><path d="M2.5 6 5 3h14l2.5 3a2.8 2.8 0 0 1-5.4 1A2.8 2.8 0 0 1 12 7a2.8 2.8 0 0 1-4.1-1 2.8 2.8 0 0 1-5.4-1Z" /><path d="M9 20v-6h6v6" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  search: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.5-4.5" /></>),
  chevron: (<path d="m8 5 7 7-7 7" />),
  anchor: (<><circle cx="12" cy="5.5" r="2.5" /><path d="M12 8v13M5 13a7 7 0 0 0 14 0M3.5 13H7M17 13h3.5" /></>),
  wave: (<path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 18c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" />),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.8 13.5 5h2.7l.9 2.5 2.4 1.2-.5 2.7 1.7 2.1-1.7 2.1.5 2.7-2.4 1.2-.9 2.5h-2.7L12 21.2 10.5 19H7.8l-.9-2.5-2.4-1.2.5-2.7L3.3 12 5 9.9l-.5-2.7L6.9 6l.9-2.5h2.7L12 2.8Z" /></>),
};

export function Icon({ name, size = 18, className = '', strokeWidth = 1.7 }: { name: keyof typeof paths & string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function FishMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--color-deep)" />
      <path d="M6 16c4-6 10-8 15-6l5-4-1 7 1 7-5-4c-5 2-11 0-15-6z" fill="var(--color-amber)" />
      <circle cx="21.5" cy="15" r="1.5" fill="var(--color-deep)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* buttons & badges                                                    */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'accent' | 'ghost' | 'danger' | 'dark' | 'outline';
const btnStyles: Record<BtnVariant, string> = {
  primary: 'bg-sea text-white hover:bg-deep3 active:scale-[0.98] shadow-sm',
  accent: 'bg-amber text-deep hover:bg-[#e09a2a] active:scale-[0.98] shadow-sm font-semibold',
  dark: 'bg-deep text-foam hover:bg-deep2 active:scale-[0.98] shadow-sm',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 active:scale-[0.98]',
  outline: 'bg-paper border border-line text-ink hover:border-sea hover:text-sea active:scale-[0.98]',
  danger: 'bg-coralsoft text-coralink border border-coral/30 hover:bg-coral hover:text-white active:scale-[0.98]',
};

export function Button({ variant = 'primary', size = 'md', icon, className = '', children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: string }) {
  const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2' };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${btnStyles[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

type Tone = 'sea' | 'amber' | 'kelp' | 'coral' | 'slate' | 'deep' | 'outline';
const tones: Record<Tone, string> = {
  sea: 'bg-sea/12 text-sea',
  amber: 'bg-ambersoft text-amberink',
  kelp: 'bg-kelpsoft text-kelpink',
  coral: 'bg-coralsoft text-coralink',
  slate: 'bg-ink/8 text-mist',
  deep: 'bg-deep text-amber',
  outline: 'border border-line text-mist bg-paper',
};

export function Badge({ tone = 'slate', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase num ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const tone: Tone = level === 'VERY HIGH' ? 'coral' : level === 'HIGH' ? 'kelp' : level === 'MEDIUM' ? 'amber' : 'slate';
  return <Badge tone={tone}>{level}</Badge>;
}

export function ConfidenceBadge({ c }: { c: string }) {
  const tone: Tone = c === 'confirmed' ? 'kelp' : c === 'likely' ? 'amber' : 'slate';
  return <Badge tone={tone}>{c}</Badge>;
}

export function StatusBadge({ s }: { s: string }) {
  const tone: Tone = s === 'active' ? 'sea' : s === 'fulfilled' ? 'kelp' : 'coral';
  return <Badge tone={tone}>{s}</Badge>;
}

/* ------------------------------------------------------------------ */
/* surfaces & fields                                                   */
/* ------------------------------------------------------------------ */

export function Card({ title, sub, action, children, className = '', pad = true }: {
  title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`bg-paper border border-line rounded-xl shadow-[0_1px_2px_rgba(10,46,51,0.05),0_8px_24px_-16px_rgba(10,46,51,0.25)] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-linesoft">
          <div>
            <h3 className="font-display font-bold text-[15px] text-ink leading-tight">{title}</h3>
            {sub && <p className="text-xs text-mist mt-0.5">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? 'p-4 sm:p-5' : ''}>{children}</div>
    </section>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-1.5">
      <span className="text-[12px] font-bold uppercase tracking-wider text-mist">{children}</span>
      {hint && <span className="ml-2 normal-case font-medium tracking-normal text-mist/70">{hint}</span>}
    </label>
  );
}

const fieldCls = 'w-full h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition-shadow focus:border-sea focus:ring-2 focus:ring-sea/25 placeholder:text-mist/60';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldCls} pr-8 cursor-pointer ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-shadow focus:border-sea focus:ring-2 focus:ring-sea/25 placeholder:text-mist/60 ${props.className ?? ''}`} />;
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-1 gap-1 flex-wrap">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3.5 h-8 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${value === o.value ? 'bg-deep text-amber shadow-sm' : 'text-mist hover:text-ink hover:bg-foam'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* modal & toast                                                       */
/* ------------------------------------------------------------------ */

export function Modal({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-deep/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`modal-in relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} bg-paper rounded-t-2xl sm:rounded-xl border border-line shadow-2xl max-h-[88vh] overflow-y-auto`}>
        <header className="sticky top-0 bg-paper/95 backdrop-blur px-5 py-4 border-b border-linesoft flex items-center justify-between">
          <h3 className="font-display font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-foam text-mist cursor-pointer" aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

type ToastKind = 'ok' | 'err';
interface ToastMsg { id: number; text: string; kind: ToastKind }
let toastId = 0;
const toastListeners = new Set<(t: ToastMsg) => void>();

export function toast(text: string, kind: ToastKind = 'ok') {
  toastListeners.forEach(fn => fn({ id: ++toastId, text, kind }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const fn = (t: ToastMsg) => {
      setItems(x => [...x.slice(-2), t]);
      setTimeout(() => setItems(x => x.filter(i => i.id !== t.id)), 3600);
    };
    toastListeners.add(fn);
    return () => { toastListeners.delete(fn); };
  }, []);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[92vw] max-w-sm pointer-events-none">
      {items.map(t => (
        <div key={t.id} className={`toast-in pointer-events-auto rounded-lg px-4 py-3 text-sm font-semibold shadow-xl border flex items-center gap-2.5 ${t.kind === 'ok' ? 'bg-deep text-foam border-deep3' : 'bg-coral text-white border-coralink/30'}`}>
          <Icon name={t.kind === 'ok' ? 'check' : 'warn'} size={16} className={t.kind === 'ok' ? 'text-amber' : ''} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = 'wave', title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto w-12 h-12 rounded-xl bg-sea/10 text-sea flex items-center justify-center mb-3">
        <Icon name={icon as never} size={22} />
      </div>
      <p className="font-display font-bold text-ink">{title}</p>
      {sub && <p className="text-sm text-mist mt-1 max-w-xs mx-auto">{sub}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, accent = false, delay = 0 }: {
  label: string; value: ReactNode; sub?: ReactNode; accent?: boolean; delay?: number;
}) {
  return (
    <div className={`rise rise-${delay} rounded-xl border px-4 py-3.5 ${accent ? 'bg-deep text-foam border-deep3' : 'bg-paper border-line'}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wider ${accent ? 'text-amber/90' : 'text-mist'}`}>{label}</p>
      <p className={`num font-semibold mt-1 text-2xl leading-none ${accent ? 'text-white' : 'text-ink'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1.5 ${accent ? 'text-foam/70' : 'text-mist'}`}>{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scroll reveal + count-up                                            */
/* ------------------------------------------------------------------ */

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { ref.classList.add('in'); ob.disconnect(); }
    }, { threshold: 0.12 });
    ob.observe(ref);
    return () => ob.disconnect();
  }, [ref]);
  return (
    <div ref={setRef} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function CountUp({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const dur = 700;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{prefix}{v.toLocaleString('en-IN')}{suffix}</>;
}
