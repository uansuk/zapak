import { useMemo, useState } from 'react';
import { Shell, Guard } from '../components/layout';
import { Badge, Button, Card, ConfidenceBadge, Empty, Icon, Input, Label, LevelBadge, Modal, Reveal, Select, Stat, StatusBadge, Textarea, toast } from '../components/ui';
import { useStore } from '../state/store';
import { Link, navigate } from '../router';
import {
  brokersOfMarket, canEditIntention, cancelIntention, createIntention, fishName,
  marketName, priceStats, supplyByFish, updateIntention, userName, type IntentionInput,
} from '../lib/api';
import type { Confidence, SellerIntention } from '../lib/types';
import { addDays, fmtDate, fmtINR, fmtKg, relDay, timeAgo, todayStr } from '../lib/format';

/* ---------------- shared intention form ---------------- */

function IntentionForm({ initial, onSubmit, submitLabel, busy }: {
  initial?: SellerIntention; onSubmit: (inp: IntentionInput) => void; submitLabel: string; busy: boolean;
}) {
  const { db } = useStore();
  const markets = db.markets.filter(m => m.active);
  const today = todayStr();
  const [marketId, setMarketId] = useState(initial?.marketId ?? markets[0]?.id ?? '');
  const [fishId, setFishId] = useState(initial?.fishId ?? db.species.find(f => f.active)?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? addDays(today, 1));
  const [qty, setQty] = useState<string>(initial ? String(initial.plannedQty) : '');
  const [confidence, setConfidence] = useState<Confidence>(initial?.confidence ?? 'likely');
  const [brokerId, setBrokerId] = useState<string>(initial?.brokerId ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const brokers = brokersOfMarket(db, marketId);

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ marketId, fishId, date, plannedQty: Number(qty), confidence, brokerId: brokerId || null, note });
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Market</Label>
          <Select value={marketId} onChange={e => { setMarketId(e.target.value); setBrokerId(''); }}>
            {markets.map(m => <option key={m.id} value={m.id}>{m.name} — {m.district}</option>)}
          </Select>
        </div>
        <div>
          <Label>Date <span className="normal-case font-medium tracking-normal">· next 14 days</span></Label>
          <Input type="date" min={today} max={addDays(today, 14)} value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div>
          <Label>Fish species</Label>
          <Select value={fishId} onChange={e => setFishId(e.target.value)}>
            {db.species.filter(f => f.active).map(f => <option key={f.id} value={f.id}>{f.name}{f.localName ? ` (${f.localName})` : ''}</option>)}
          </Select>
        </div>
        <div>
          <Label>Expected quantity (kg)</Label>
          <Input type="number" min={10} max={5000} step={5} placeholder="e.g. 200" value={qty} onChange={e => setQty(e.target.value)} required />
        </div>
      </div>

      <div>
        <Label>Confidence</Label>
        <div className="flex gap-1.5 flex-wrap">
          {(['confirmed', 'likely', 'possible'] as Confidence[]).map(c => (
            <button type="button" key={c} onClick={() => setConfidence(c)}
              className={`px-3.5 h-9 rounded-lg border text-[13px] font-bold capitalize transition-all cursor-pointer ${confidence === c ? 'bg-deep text-amber border-deep shadow-sm' : 'bg-white border-line text-mist hover:border-sea hover:text-sea'}`}>
              {c}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-mist mt-1.5">
          {confidence === 'confirmed' ? 'You will definitely bring this lot.' : confidence === 'likely' ? 'You plan to bring it — minor uncertainty.' : 'Early signal — may or may not materialise.'}
        </p>
      </div>

      <div>
        <Label hint="optional">Preferred broker</Label>
        <Select value={brokerId} onChange={e => setBrokerId(e.target.value)}>
          <option value="">No preference — any broker at {marketName(db, marketId)}</option>
          {brokers.map(b => <option key={b.id} value={b.id}>{b.name}{b.note ? ` · ${b.note}` : ''}</option>)}
        </Select>
      </div>

      <div>
        <Label hint="optional">Note for the broker</Label>
        <Textarea rows={2} placeholder="e.g. arriving by 6:15 AM, fish graded medium" value={note} onChange={e => setNote(e.target.value)} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy} icon="check">{submitLabel}</Button>
    </form>
  );
}

/* ---------------- seller home ---------------- */

function SellerHome() {
  const { db, user } = useStore();
  const me = user!;
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const mine = db.intentions.filter(i => i.sellerId === me.id && i.status !== 'cancelled' && i.date >= today);
  const plannedKg = mine.reduce((s, i) => s + i.plannedQty, 0);
  const [viewDate, setViewDate] = useState<'today' | 'tomorrow'>('tomorrow');
  const [marketId, setMarketId] = useState(db.markets[0]?.id ?? '');

  const supply = useMemo(() => supplyByFish(db, marketId, viewDate === 'today' ? today : tomorrow), [db, marketId, viewDate, today, tomorrow]);
  const prices = useMemo(() => priceStats(db, marketId, addDays(today, -1)), [db, marketId, today]);
  const notices = db.notices.filter(n => n.marketId === marketId).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const nextTrip = [...mine].sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <Shell title="Seller dashboard" crumb="Seller · pond-to-market planner">
      <div className="rise flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Seller dashboard</p>
          <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] text-ink leading-tight mt-1">Namaskar, {me.name.split(' ')[0]}</h1>
        </div>
        <Link to="/seller/register-fish"><Button variant="accent" icon="plus" size="lg">Register expected fish</Button></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Active registrations" value={mine.length} sub="today & upcoming" delay={1} />
        <Stat label="Planned supply" value={<>{plannedKg.toLocaleString('en-IN')} kg</>} sub="across all markets" delay={2} />
        <Stat label="Next delivery" value={nextTrip ? relDay(nextTrip.date) : '—'} sub={nextTrip ? `${fishName(db, nextTrip.fishId)} · ${fmtKg(nextTrip.plannedQty)} · ${marketName(db, nextTrip.marketId)}` : 'nothing scheduled'} delay={3} />
        <Stat label="Preferred broker" value={nextTrip?.brokerId ? userName(db, nextTrip.brokerId).split(' ')[0] : 'Any'} sub={nextTrip?.brokerId ? userName(db, nextTrip.brokerId) : 'no preference set'} accent delay={4} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 mt-5">
        <Reveal className="lg:col-span-3">
          <Card
            title="Market supply snapshot"
            sub="Aggregated across all brokers — individual sellers stay private"
            action={
              <div className="flex gap-1.5">
                <Select value={marketId} onChange={e => setMarketId(e.target.value)} className="!h-8 !w-32 !text-xs">
                  {db.markets.filter(m => m.active).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
                <div className="flex rounded-lg border border-line overflow-hidden">
                  {(['today', 'tomorrow'] as const).map(d => (
                    <button key={d} onClick={() => setViewDate(d)}
                      className={`px-2.5 text-[11px] font-bold uppercase cursor-pointer transition-colors ${viewDate === d ? 'bg-deep text-amber' : 'bg-white text-mist hover:text-ink'}`}>{d === 'today' ? 'Today' : 'Tmrw'}</button>
                  ))}
                </div>
              </div>
            }
            pad={false}
          >
            {supply.length === 0 ? (
              <Empty icon="scale" title="No supply registered yet" sub="Be the first to register — buyers plan around this board." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                    <th className="font-bold px-4 py-2">Fish</th>
                    <th className="font-bold px-2 py-2 text-right">Expected</th>
                    <th className="font-bold px-2 py-2 text-right">Sellers</th>
                    <th className="font-bold px-4 py-2 text-right">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {supply.map(r => (
                    <tr key={r.fishId} className="border-t border-linesoft hover:bg-foam/50 transition-colors">
                      <td className="px-4 py-2.5 font-display font-bold text-ink">{r.fishName}</td>
                      <td className="px-2 py-2.5 text-right num font-semibold text-ink">{fmtKg(r.totalQty)}</td>
                      <td className="px-2 py-2.5 text-right num text-mist">{r.sellers}</td>
                      <td className="px-4 py-2.5 text-right"><LevelBadge level={r.level} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Reveal>

        <div className="lg:col-span-2 space-y-4">
          <Reveal delay={80}>
            <Card title="Yesterday's prices" sub={`${marketName(db, marketId)} · min / avg / max per kg`} pad={false}>
              {prices.length === 0 ? <Empty icon="tag" title="No trade yesterday" /> : (
                <ul className="divide-y divide-linesoft">
                  {prices.slice(0, 5).map(p => (
                    <li key={p.fishId} className="px-4 py-2.5 flex items-center justify-between hover:bg-foam/50 transition-colors">
                      <span className="font-bold text-[13.5px] text-ink">{p.fishName}</span>
                      <span className="num text-[12.5px] text-mist">{fmtINR(p.min)} · <span className="text-ink font-bold">{fmtINR(p.avg)}</span> · {fmtINR(p.max)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Reveal>
          <Reveal delay={140}>
            <Card title="Market notices" pad={false}>
              {notices.length === 0 ? <Empty icon="megaphone" title="No notices" /> : (
                <ul className="divide-y divide-linesoft">
                  {notices.map(n => (
                    <li key={n.id} className="px-4 py-2.5">
                      <p className="font-bold text-[13px] text-ink flex items-center gap-2">{n.pinned && <Icon name="pin" size={12} className="text-amberink" />}{n.title}</p>
                      <p className="text-[12px] text-mist leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- register fish ---------------- */

function RegisterFish() {
  const { user } = useStore();
  const [busy, setBusy] = useState(false);

  return (
    <Shell title="Register expected fish" crumb="Seller · Register expected fish">
      <div className="max-w-2xl mx-auto">
        <div className="rise mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Seller · planned supply</p>
          <h1 className="font-display font-extrabold text-[26px] text-ink leading-tight mt-1">What are you bringing to market?</h1>
          <p className="text-sm text-mist mt-1.5">Your name and quantity stay private on public boards — only market totals are published.</p>
        </div>
        <Reveal>
          <Card>
            <IntentionForm
              busy={busy}
              submitLabel="Register expected supply"
              onSubmit={inp => {
                setBusy(true);
                setTimeout(() => {
                  const res = createIntention(user!, inp);
                  setBusy(false);
                  if (!res.ok) { toast(res.error, 'err'); return; }
                  toast(`${inp.plannedQty} kg registered for ${relDay(inp.date)} — thank you!`);
                  navigate('/seller/my-registrations');
                }, 300);
              }}
            />
          </Card>
        </Reveal>
      </div>
    </Shell>
  );
}

/* ---------------- my registrations ---------------- */

function MyRegistrations() {
  const { db, user } = useStore();
  const me = user!;
  const today = todayStr();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [editing, setEditing] = useState<SellerIntention | null>(null);
  const [cancelling, setCancelling] = useState<SellerIntention | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = db.intentions
    .filter(i => i.sellerId === me.id)
    .filter(i => filter === 'all' ? true : filter === 'upcoming' ? i.date >= today : i.date < today)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const arrivalFor = (intentionId: string) => db.arrivals.find(a => a.intentionId === intentionId);

  return (
    <Shell title="My registrations" crumb="Seller · My registrations">
      <div className="rise flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Seller · history & control</p>
          <h1 className="font-display font-extrabold text-[26px] text-ink leading-tight mt-1">My registrations</h1>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg border border-line overflow-hidden bg-paper">
            {(['upcoming', 'past', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 h-9 text-[12px] font-bold uppercase cursor-pointer transition-colors ${filter === f ? 'bg-deep text-amber' : 'text-mist hover:text-ink'}`}>{f}</button>
            ))}
          </div>
          <Link to="/seller/register-fish"><Button icon="plus">New</Button></Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Reveal><Card><Empty icon="clipboard" title={`No ${filter === 'all' ? '' : filter + ' '}registrations`} sub="Register your expected supply so brokers and buyers can plan." /></Card></Reveal>
      ) : (
        <div className="space-y-3">
          {rows.map(i => {
            const arrived = arrivalFor(i.id);
            const editable = canEditIntention(i);
            const isPast = i.date < today;
            return (
              <Reveal key={i.id}>
                <div className={`bg-paper border border-line rounded-xl p-4 sm:px-5 flex flex-wrap items-center gap-x-5 gap-y-3 transition-all hover:shadow-md hover:border-sea/40 ${isPast && i.status !== 'fulfilled' ? 'opacity-70' : ''}`}>
                  <div className="min-w-[130px]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-mist num">{fmtDate(i.date)} · {relDay(i.date)}</p>
                    <p className="font-display font-extrabold text-lg text-ink leading-tight mt-0.5">{fishName(db, i.fishId)}</p>
                    <p className="text-[12px] text-mist">{marketName(db, i.marketId)}</p>
                  </div>
                  <div className="num">
                    <p className="text-xl font-bold text-ink">{i.plannedQty}<span className="text-xs text-mist font-medium"> kg planned</span></p>
                    {arrived && <p className="text-[12px] text-kelpink font-semibold flash-row rounded px-1 -mx-1">arrived {arrived.actualQty} kg · {userName(db, arrived.brokerId)}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <ConfidenceBadge c={i.confidence} />
                    <StatusBadge s={i.status} />
                  </div>
                  <p className="text-[12px] text-mist min-w-[120px]">
                    Broker: <span className="font-semibold text-ink">{i.brokerId ? userName(db, i.brokerId) : 'no preference'}</span>
                    {i.note && <span className="block text-mist/80 italic truncate max-w-[180px]">“{i.note}”</span>}
                  </p>
                  <div className="ml-auto flex gap-2">
                    {editable && (
                      <>
                        <Button variant="outline" size="sm" icon="edit" onClick={() => setEditing(i)}>Edit</Button>
                        <Button variant="danger" size="sm" icon="x" onClick={() => setCancelling(i)}>Cancel</Button>
                      </>
                    )}
                    {!editable && <Badge tone="outline">{i.status === 'cancelled' ? 'locked' : isPast ? 'closed' : 'locked'}</Badge>}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit — ${editing ? fishName(db, editing.fishId) : ''}`}>
        {editing && (
          <IntentionForm
            initial={editing}
            busy={busy}
            submitLabel="Save changes"
            onSubmit={inp => {
              setBusy(true);
              setTimeout(() => {
                const res = updateIntention(me, editing.id, inp);
                setBusy(false);
                if (!res.ok) { toast(res.error, 'err'); return; }
                toast('Registration updated.');
                setEditing(null);
              }, 300);
            }}
          />
        )}
      </Modal>

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Cancel this registration?">
        {cancelling && (
          <div>
            <p className="text-sm text-ink leading-relaxed">
              You are cancelling <strong className="num">{cancelling.plannedQty} kg {fishName(db, cancelling.fishId)}</strong> at{' '}
              <strong>{marketName(db, cancelling.marketId)}</strong> on <strong>{fmtDate(cancelling.date)}</strong>.
              It will disappear from the supply board immediately.
            </p>
            <div className="flex gap-2 mt-5">
              <Button variant="ghost" className="flex-1" onClick={() => setCancelling(null)}>Keep it</Button>
              <Button variant="danger" icon="x" className="flex-1" onClick={() => {
                const res = cancelIntention(me, cancelling.id);
                if (!res.ok) { toast(res.error, 'err'); return; }
                toast('Registration cancelled.');
                setCancelling(null);
              }}>Yes, cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}

/* ---------------- exports with guards ---------------- */

export function SellerHomeGuarded() { return <Guard role="seller"><SellerHome /></Guard>; }
export function SellerRegisterGuarded() { return <Guard role="seller"><RegisterFish /></Guard>; }
export function SellerRegistrationsGuarded() { return <Guard role="seller"><MyRegistrations /></Guard>; }
