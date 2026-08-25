import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore, homeFor } from '../state/store';
import { resetDemoData } from '../lib/db';
import { Link, navigate } from '../router';
import { Button, FishMark, Icon, Toaster, Badge } from './ui';
import { markAllRead, tickerItems, logout } from '../lib/api';
import { fmtINR, timeAgo } from '../lib/format';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Ticker() {
  const { db } = useStore();
  const items = tickerItems(db);
  if (items.length === 0) return null;
  const row = (key: string) => (
    <div key={key} className="flex items-center shrink-0">
      {items.map((t, i) => (
        <span key={`${key}-${i}`} className="flex items-center text-[12px] num text-foam/85 px-4 whitespace-nowrap">
          <span className="text-amber font-bold">{t.marketName}</span>
          <span className="mx-2 text-foam/30">·</span>
          {t.fishName}
          <span className="mx-2 text-foam/30">·</span>
          <span className="text-white font-semibold">{fmtINR(t.price)}/kg</span>
          <span className="mx-2 text-foam/30">·</span>
          {t.qty} kg
          <span className="mx-2 text-foam/30">·</span>
          <span className="text-foam/55">{timeAgo(t.time)}</span>
          <span className="ml-4 w-1.5 h-1.5 rounded-full bg-amber/70 inline-block" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="board-deep border-b border-white/10 overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 z-10 flex items-center gap-1.5 bg-coral text-white text-[10px] font-bold uppercase tracking-widest px-3 h-8">
          <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" /> Live auctions
        </div>
        <div className="ticker-track flex h-8 items-center">{[row('a'), row('b')]}</div>
      </div>
    </div>
  );
}

function Bell() {
  const { db, user } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!user) return null;
  const mine = db.notifications.filter(n => n.userId === user.id).slice(0, 12);
  const unread = mine.filter(n => !n.read).length;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-foam/85 hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center num">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="modal-in absolute right-0 top-11 z-50 w-[86vw] max-w-sm bg-paper border border-line rounded-xl shadow-2xl overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b border-linesoft">
              <p className="font-display font-bold text-sm text-ink">Notifications</p>
              {unread > 0 && user && (
                <button onClick={() => markAllRead(user)} className="text-xs font-semibold text-sea hover:underline cursor-pointer">
                  Mark all read
                </button>
              )}
            </header>
            <div className="max-h-80 overflow-y-auto">
              {mine.length === 0 && <p className="px-4 py-8 text-sm text-mist text-center">Nothing yet — notices and auction updates land here.</p>}
              {mine.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-linesoft last:border-0 flex gap-2.5 ${n.read ? '' : 'bg-ambersoft/40'}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-line' : 'bg-amber'}`} />
                  <div>
                    <p className="text-[13px] text-ink leading-snug">{n.text}</p>
                    <p className="text-[11px] text-mist num mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const navFor: Record<string, { to: string; label: string; icon: string }[]> = {
  guest: [{ to: '/', label: 'Market board', icon: 'chart' }],
  seller: [
    { to: '/seller', label: 'Dashboard', icon: 'store' },
    { to: '/seller/register-fish', label: 'Register fish', icon: 'plus' },
    { to: '/seller/my-registrations', label: 'My registrations', icon: 'clipboard' },
    { to: '/', label: 'Market board', icon: 'chart' },
  ],
  broker: [
    { to: '/broker', label: 'Dashboard', icon: 'store' },
    { to: '/broker/arrivals', label: 'Arrivals', icon: 'scale' },
    { to: '/broker/auctions', label: 'Auctions', icon: 'gavel' },
    { to: '/broker/notices', label: 'Notices', icon: 'megaphone' },
    { to: '/', label: 'Market board', icon: 'chart' },
  ],
  buyer: [
    { to: '/buyer', label: 'Dashboard', icon: 'store' },
    { to: '/', label: 'Market board', icon: 'chart' },
  ],
  admin: [
    { to: '/admin', label: 'Admin console', icon: 'shield' },
    { to: '/', label: 'Market board', icon: 'chart' },
  ],
};

export function Shell({ children, title, crumb }: { children: ReactNode; title?: string; crumb?: string }) {
  const { user } = useStore();
  const now = useClock();
  const role = user?.role ?? 'guest';
  const items = navFor[role];

  useEffect(() => {
    document.title = title ? `${title} · Machhbazar` : 'Machhbazar · Tripura Fish Market Board';
    window.scrollTo({ top: 0 });
  }, [title]);

  return (
    <div className="min-h-screen flex flex-col">
      <Ticker />
      <header className="board-deep text-foam sticky top-0 z-40 border-b border-white/10 shadow-lg shadow-deep/20">
        <div className="max-w-6xl mx-auto px-3 sm:px-5">
          <div className="h-14 flex items-center justify-between gap-2">
            <Link to={user ? homeFor(user.role) : '/'} className="flex items-center gap-2.5 shrink-0">
              <FishMark size={30} />
              <span className="leading-none">
                <span className="font-display font-extrabold text-[17px] tracking-tight text-white block">Machhbazar</span>
                <span className="text-[9.5px] uppercase tracking-[0.18em] text-foam/60 font-semibold">Tripura fish market network</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="hidden md:flex items-center gap-1.5 text-[12px] num text-foam/70 bg-white/5 border border-white/10 rounded-lg px-2.5 h-8">
                <Icon name="clock" size={13} className="text-amber" />
                {now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </span>
              <Badge tone="deep" className="hidden sm:inline-flex border border-amber/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber live-dot" /> board live
              </Badge>
              <Bell />
              {user ? (
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/10">
                  <Link to={homeFor(user.role)} className="hidden sm:block text-right leading-tight mr-1 hover:opacity-80">
                    <span className="block text-[13px] font-bold text-white">{user.name}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-amber/90 font-bold">{user.role}</span>
                  </Link>
                  <button
                    onClick={() => { logout(user); navigate('/'); }}
                    className="p-2 rounded-lg text-foam/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Sign out" title="Sign out"
                  >
                    <Icon name="logout" size={18} />
                  </button>
                </div>
              ) : (
                <Link to="/login">
                  <Button variant="accent" size="sm" className="ml-1">Sign in</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="flex gap-0.5 overflow-x-auto scroll-thin -mb-px">
            {items.map(it => {
              const active = window.location.hash.replace(/^#/, '') === it.to || (it.to !== `/${role === 'guest' ? '' : role}` && window.location.hash.replace(/^#/, '').startsWith(it.to + '/'));
              return (
                <Link key={it.to} to={it.to}
                  className={`flex items-center gap-1.5 px-3.5 h-10 text-[13px] font-bold whitespace-nowrap border-b-2 transition-colors ${active ? 'border-amber text-amber' : 'border-transparent text-foam/65 hover:text-white'}`}>
                  <Icon name={it.icon as never} size={15} /> {it.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {crumb && (
        <div className="bg-paper/70 border-b border-line">
          <div className="max-w-6xl mx-auto px-3 sm:px-5 py-2 text-[12px] font-semibold text-mist">{crumb}</div>
        </div>
      )}

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-5 py-5 sm:py-7">{children}</main>

      <footer className="board-deep text-foam/70 mt-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-8 grid gap-6 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FishMark size={24} />
              <span className="font-display font-extrabold text-white">Machhbazar</span>
            </div>
            <p className="text-[13px] leading-relaxed">
              Supply visibility for Tripura's fish markets. Auctions stay physical — the board keeps everyone informed.
            </p>
          </div>
          <div className="text-[13px]">
            <p className="text-amber font-bold uppercase tracking-wider text-[11px] mb-2">Markets on the network</p>
            <ul className="space-y-1">
              <li>Khowai — auction bell 7:00 AM</li>
              <li>Ranirbazar — auction bell 6:30 AM</li>
              <li>Battala — auction bell 7:30 AM</li>
            </ul>
          </div>
          <div className="text-[12px] leading-relaxed">
            <p className="text-amber font-bold uppercase tracking-wider text-[11px] mb-2">About the data</p>
            <p>
              Expected supply is registered supply reported through the platform by sellers; actual arrivals may differ.
              Prices are computed from auction records entered by brokers at each market.
            </p>
            <button
              onClick={() => { if (window.confirm('Reset all demo data? Your changes will be lost.')) { resetDemoData(); window.location.hash = '/'; window.location.reload(); } }}
              className="mt-3 text-[11px] underline decoration-foam/30 hover:text-white cursor-pointer"
            >
              Reset demo data
            </button>
          </div>
        </div>
        <div className="border-t border-white/8">
          <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 text-[11px] num flex flex-wrap items-center justify-between gap-2">
            <span>Machhbazar MVP · Department of Fisheries demo</span>
            <span>no online bidding · no payments · physical auctions only</span>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}

/** Guarded route: redirects guests to login, wrong roles to their home. */
export function Guard({ role, children }: { role: string; children: ReactNode }) {
  const { user } = useStore();
  useEffect(() => {
    if (!user) navigate('/login');
    else if (user.role !== role) navigate(homeFor(user.role));
  }, [user, role]);
  if (!user || user.role !== role) return null;
  return <>{children}</>;
}
