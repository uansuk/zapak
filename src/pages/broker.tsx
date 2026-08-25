import { useMemo, useState } from 'react';
import { Shell, Guard } from '../components/layout';
import { Badge, Button, Card, ConfidenceBadge, CountUp, Empty, Icon, Input, Label, LevelBadge, Reveal, Select, Segmented, Stat, Textarea, toast } from '../components/ui';
import { useStore } from '../state/store';
import { Link } from '../router';
import {
  activeBuyers, activeSellers, arrivalRemaining, brokersOfMarket, fishName, marketSellerCount,
  marketSupplyTotalKg, marketTotals, primaryMarketId, priceStats, publishNotice, deleteNotice,
  recordArrival, recordAuction, supplyByFish, userName,
} from '../lib/api';
import type { MarketNotice } from '../lib/types';
import { addDays, fmtDate, fmtINR, fmtKg, relDay, timeAgo, timeOf, todayStr } from '../lib/format';

function useBrokerCtx() {
  const { db, user } = useStore();
  const me = user!;
  const marketId = primaryMarketId(db, me.id);
  const market = db.markets.find(m => m.id === marketId) ?? null;
  return { db, me, marketId, market };
}

/* ---------------- dashboard ---------------- */

const dayOptions: { value: 'today' | 'tomorrow'; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
];
const modeOptions: { value: 'registered' | 'walkin'; label: string }[] = [
  { value: 'registered', label: 'From registration' },
  { value: 'walkin', label: 'Walk-in lot' },
];

function BrokerHome() {
  const { db, me, marketId, market } = useBrokerCtx();
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const [day, setDay] = useState<'today' | 'tomorrow'>('tomorrow');
  const viewDate = day === 'today' ? today : tomorrow;

  const marketSupply = useMemo(() => supplyByFish(db, marketId ?? '', viewDate), [db, marketId, viewDate]);
  const mine = useMemo(
    () => db.intentions
      .filter(i => i.brokerId === me.id && i.marketId === marketId && i.date === viewDate && i.status === 'active')
      .sort((a, b) => b.plannedQty - a.plannedQty),
    [db, me.id, marketId, viewDate],
  );
  const todayArrivals = db.arrivals.filter(a => a.brokerId === me.id && a.date === today);
  const todayKg = todayArrivals.reduce((s, a) => s + a.actualQty, 0);
  const myAuctions = db.auctions.filter(a => a.brokerId === me.id && a.date === today);
  const myValue = myAuctions.reduce((s, a) => s + a.qty * a.pricePerKg, 0);

  if (!market || !marketId) {
    return (
      <Shell title="Broker dashboard">
        <Card><Empty icon="anchor" title="No market assigned" sub="Ask the admin to assign you to a market." /></Card>
      </Shell>
    );
  }

  return (
    <Shell title="Broker dashboard" crumb={`Broker · ${market.name} desk`}>
      <div className="rise flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Broker dashboard · {fmtDate(today)}</p>
          <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] text-ink leading-tight mt-1">{market.name} desk — {me.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/broker/arrivals"><Button variant="outline" icon="scale">Record arrival</Button></Link>
          <Link to="/broker/auctions"><Button variant="accent" icon="gavel">Record auction</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Today's arrivals" value={<><CountUp to={todayKg} /> kg</>} sub={`${todayArrivals.length} lots at your desk`} delay={1} />
        <Stat label="Today's sales" value={<CountUp to={myValue} prefix="₹" />} sub={`${myAuctions.length} lots auctioned`} delay={2} />
        <Stat label={`${relDay(viewDate)} market supply`} value={<><CountUp to={marketSupplyTotalKg(db, marketId, viewDate)} /> kg</>} sub={`${marketSellerCount(db, marketId, viewDate)} sellers · all brokers`} delay={3} />
        <Stat label="Intentions to you" value={mine.length} sub={`${fmtKg(mine.reduce((s, i) => s + i.plannedQty, 0))} expected`} accent delay={4} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Reveal>
          <Card
            title="Market-wide expected supply"
            sub="Aggregated across every broker — seller identities hidden"
            action={
              <Segmented options={dayOptions} value={day} onChange={setDay} />
            }
            pad={false}
          >
            {marketSupply.length === 0 ? (
              <Empty icon="scale" title="Nothing registered yet" />
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
                  {marketSupply.map(r => (
                    <tr key={r.fishId} className="border-t border-linesoft hover:bg-foam/50 transition-colors">
                      <td className="px-4 py-2.5 font-display font-bold text-ink">{r.fishName}</td>
                      <td className="px-2 py-2.5 text-right num font-semibold">{fmtKg(r.totalQty)}</td>
                      <td className="px-2 py-2.5 text-right num text-mist">{r.sellers}</td>
                      <td className="px-4 py-2.5 text-right"><LevelBadge level={r.level} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card
            title="Seller intentions addressed to you"
            sub="Private — only registrations naming your desk"
            pad={false}
          >
            {mine.length === 0 ? (
              <Empty icon="clipboard" title={`No sellers picked you for ${relDay(viewDate).toLowerCase()}`} sub="Sellers can set you as preferred broker when registering." />
            ) : (
              <ul className="divide-y divide-linesoft max-h-[420px] overflow-y-auto">
                {mine.map(i => {
                  const seller = db.users.find(u => u.id === i.sellerId);
                  return (
                    <li key={i.id} className="px-4 py-3 flex items-center gap-3 hover:bg-foam/50 transition-colors">
                      <span className="w-9 h-9 rounded-lg bg-sea/10 text-sea flex items-center justify-center font-display font-bold text-sm shrink-0">
                        {seller?.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[13.5px] text-ink truncate">{seller?.name}</p>
                        <p className="text-[12px] text-mist num">{fishName(db, i.fishId)} · {i.plannedQty} kg planned · <span className="font-semibold text-sea">{seller?.phone}</span></p>
                        {i.note && <p className="text-[11.5px] text-mist/80 italic truncate">“{i.note}”</p>}
                      </div>
                      <ConfidenceBadge c={i.confidence} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </Reveal>
      </div>

      <Reveal delay={100}>
        <Card title="Today at your desk" sub="Arrivals recorded vs lots auctioned" pad={false} className="mt-4">
          {todayArrivals.length === 0 ? (
            <Empty icon="scale" title="No arrivals recorded yet today" sub="Record physical arrivals as carts weigh in." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                    <th className="font-bold px-4 py-2">Time</th>
                    <th className="font-bold px-2 py-2">Fish</th>
                    <th className="font-bold px-2 py-2">Seller</th>
                    <th className="font-bold px-2 py-2 text-right">Actual</th>
                    <th className="font-bold px-2 py-2 text-right">Auctioned</th>
                    <th className="font-bold px-4 py-2 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {todayArrivals.map(a => {
                    const rem = arrivalRemaining(db, a.id);
                    return (
                      <tr key={a.id} className="border-t border-linesoft hover:bg-foam/50 transition-colors">
                        <td className="px-4 py-2.5 num text-mist">{timeOf(a.createdAt)}</td>
                        <td className="px-2 py-2.5 font-display font-bold text-ink">{fishName(db, a.fishId)}</td>
                        <td className="px-2 py-2.5 text-[13px] text-ink">{userName(db, a.sellerId)}</td>
                        <td className="px-2 py-2.5 text-right num font-semibold">{fmtKg(a.actualQty)}</td>
                        <td className="px-2 py-2.5 text-right num">{fmtKg(a.actualQty - rem)}</td>
                        <td className="px-4 py-2.5 text-right">{rem > 0 ? <Badge tone="amber">{rem} kg to auction</Badge> : <Badge tone="kelp">sold out</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>
    </Shell>
  );
}

/* ---------------- arrivals ---------------- */

function Arrivals() {
  const { db, me, marketId, market } = useBrokerCtx();
  const today = todayStr();
  const [mode, setMode] = useState<'registered' | 'walkin'>('registered');
  const [intentionId, setIntentionId] = useState('');
  const [fishId, setFishId] = useState(db.species.find(f => f.active)?.id ?? '');
  const [sellerId, setSellerId] = useState('');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const myIntentionsToday = db.intentions.filter(
    i => i.brokerId === me.id && i.marketId === marketId && i.date === today && i.status === 'active',
  );
  const arrivalsToday = db.arrivals.filter(a => a.brokerId === me.id && a.date === today).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const chosen = myIntentionsToday.find(i => i.id === intentionId);

  if (!market) return <Shell title="Arrivals"><Card><Empty icon="anchor" title="No market assigned" /></Card></Shell>;

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      const res = recordArrival(me, {
        fishId: mode === 'registered' ? (chosen?.fishId ?? '') : fishId,
        actualQty: Number(qty),
        sellerId: mode === 'registered' ? (chosen?.sellerId ?? null) : sellerId || null,
        intentionId: mode === 'registered' ? intentionId || null : null,
        note,
      });
      setBusy(false);
      if (!res.ok) { toast(res.error, 'err'); return; }
      toast(`Arrival recorded — ${res.data.actualQty} kg ${fishName(db, res.data.fishId)}.`);
      setIntentionId(''); setQty(''); setNote(''); setSellerId('');
    }, 300);
  };

  return (
    <Shell title="Record arrivals" crumb={`Broker · ${market.name} · Arrivals`}>
      <div className="rise mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Broker · actual arrivals</p>
        <h1 className="font-display font-extrabold text-[26px] text-ink leading-tight mt-1">Record physical arrivals</h1>
        <p className="text-sm text-mist mt-1">Actual weighed quantity — stored separately from the seller's planned quantity.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Reveal className="lg:col-span-2">
          <Card title="New arrival" sub={`${market.name} · today only`}>
            <Segmented options={modeOptions} value={mode} onChange={setMode} />
            <div className="space-y-4 mt-4">
              {mode === 'registered' ? (
                <div>
                  <Label>Seller registration addressed to you</Label>
                  {myIntentionsToday.length === 0 ? (
                    <p className="text-[13px] text-mist bg-foam border border-linesoft rounded-lg px-3 py-2.5">No sellers registered under your desk for today. Use a walk-in lot instead.</p>
                  ) : (
                    <Select value={intentionId} onChange={e => { setIntentionId(e.target.value); const c = myIntentionsToday.find(i => i.id === e.target.value); if (c && !qty) setQty(String(c.plannedQty)); }}>
                      <option value="">Select registration…</option>
                      {myIntentionsToday.map(i => (
                        <option key={i.id} value={i.id}>{userName(db, i.sellerId)} · {fishName(db, i.fishId)} · {i.plannedQty} kg planned</option>
                      ))}
                    </Select>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Fish species</Label>
                      <Select value={fishId} onChange={e => setFishId(e.target.value)}>
                        {db.species.filter(f => f.active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label hint="optional">Seller</Label>
                      <Select value={sellerId} onChange={e => setSellerId(e.target.value)}>
                        <option value="">Walk-in / unknown</option>
                        {activeSellers(db).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select>
                    </div>
                  </div>
                </>
              )}
              <div>
                <Label>Actual weighed quantity (kg)</Label>
                <Input type="number" min={1} max={10000} placeholder="weighed at the counter" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div>
                <Label hint="optional">Note</Label>
                <Input placeholder="grade, crate count…" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <Button size="lg" className="w-full" icon="scale" disabled={busy || (mode === 'registered' && !intentionId)} onClick={submit}>
                {busy ? 'Recording…' : 'Record arrival'}
              </Button>
            </div>
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-3" delay={80}>
          <Card title="Today's arrivals at your desk" sub={`${arrivalsToday.length} lots · planned vs actual stays separate`} pad={false}>
            {arrivalsToday.length === 0 ? (
              <Empty icon="scale" title="No arrivals yet today" sub="Lots you record appear here, ready for auction." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                      <th className="font-bold px-4 py-2">Time</th>
                      <th className="font-bold px-2 py-2">Fish</th>
                      <th className="font-bold px-2 py-2">Seller</th>
                      <th className="font-bold px-2 py-2 text-right">Actual</th>
                      <th className="font-bold px-4 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrivalsToday.map(a => {
                      const rem = arrivalRemaining(db, a.id);
                      const planned = a.intentionId ? db.intentions.find(i => i.id === a.intentionId)?.plannedQty : undefined;
                      return (
                        <tr key={a.id} className="border-t border-linesoft hover:bg-foam/50 transition-colors flash-row">
                          <td className="px-4 py-2.5 num text-mist">{timeOf(a.createdAt)}</td>
                          <td className="px-2 py-2.5 font-display font-bold text-ink">{fishName(db, a.fishId)}</td>
                          <td className="px-2 py-2.5 text-[13px]">
                            {userName(db, a.sellerId)}
                            {planned !== undefined && <span className="block text-[11px] num text-mist">planned {planned} kg</span>}
                          </td>
                          <td className="px-2 py-2.5 text-right num font-semibold">{fmtKg(a.actualQty)}</td>
                          <td className="px-4 py-2.5 text-right">{rem > 0 ? <Badge tone="amber">{rem} kg open</Badge> : <Badge tone="kelp">sold out</Badge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Reveal>
      </div>
    </Shell>
  );
}

/* ---------------- auctions ---------------- */

function Auctions() {
  const { db, me, marketId, market } = useBrokerCtx();
  const today = todayStr();
  const yesterday = addDays(today, -1);
  const [arrivalId, setArrivalId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const openLots = db.arrivals.filter(a => a.brokerId === me.id && a.date === today && arrivalRemaining(db, a.id) > 0);
  const myToday = db.auctions.filter(a => a.brokerId === me.id && a.date === today).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const yesterdayPrices = useMemo(() => priceStats(db, marketId ?? '', yesterday), [db, marketId, yesterday]);
  const totals = marketTotals(db, marketId ?? '', today);
  const lot = openLots.find(a => a.id === arrivalId);
  const remaining = lot ? arrivalRemaining(db, lot.id) : 0;

  const pickLot = (id: string) => {
    setArrivalId(id);
    const l = db.arrivals.find(a => a.id === id);
    if (l) {
      setQty(String(arrivalRemaining(db, id)));
      const yp = yesterdayPrices.find(p => p.fishId === l.fishId);
      if (yp) setPrice(String(yp.avg));
    }
  };

  if (!market) return <Shell title="Auctions"><Card><Empty icon="anchor" title="No market assigned" /></Card></Shell>;

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      const res = recordAuction(me, { arrivalId, buyerId, qty: Number(qty), pricePerKg: Number(price) });
      setBusy(false);
      if (!res.ok) { toast(res.error, 'err'); return; }
      toast(`Sold ${res.data.qty} kg at ${fmtINR(res.data.pricePerKg)}/kg — total ${fmtINR(res.data.qty * res.data.pricePerKg)}.`);
      setArrivalId(''); setBuyerId(''); setQty(''); setPrice('');
    }, 300);
  };

  return (
    <Shell title="Record auctions" crumb={`Broker · ${market.name} · Auctions`}>
      <div className="rise mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Broker · physical auction results</p>
          <h1 className="font-display font-extrabold text-[26px] text-ink leading-tight mt-1">Record auction results</h1>
        </div>
        <p className="num text-sm text-mist">Today at {market.name} (all brokers): <span className="font-bold text-ink">{totals.kg} kg</span> · <span className="font-bold text-sea">{fmtINR(totals.value)}</span> · {totals.lots} lots</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Reveal className="lg:col-span-2">
          <Card title="New auction result" sub="From the physical auction — buyer & hammer price">
            <div className="space-y-4">
              <div>
                <Label>Arrival lot</Label>
                {openLots.length === 0 ? (
                  <p className="text-[13px] text-mist bg-foam border border-linesoft rounded-lg px-3 py-2.5">No open lots. <Link to="/broker/arrivals" className="text-sea font-semibold underline">Record an arrival first.</Link></p>
                ) : (
                  <Select value={arrivalId} onChange={e => pickLot(e.target.value)}>
                    <option value="">Select lot…</option>
                    {openLots.map(a => (
                      <option key={a.id} value={a.id}>{fishName(db, a.fishId)} · {arrivalRemaining(db, a.id)} kg remaining · {userName(db, a.sellerId)}</option>
                    ))}
                  </Select>
                )}
              </div>
              <div>
                <Label>Buyer</Label>
                <Select value={buyerId} onChange={e => setBuyerId(e.target.value)}>
                  <option value="">Select buyer…</option>
                  {activeBuyers(db).map(b => <option key={b.id} value={b.id}>{b.name}{b.note ? ` · ${b.note}` : ''}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Lot qty (kg) <span className="normal-case font-medium tracking-normal">· max {remaining || '—'}</span></Label>
                  <Input type="number" min={1} max={remaining || undefined} value={qty} onChange={e => setQty(e.target.value)} />
                </div>
                <div>
                  <Label>Hammer price (₹/kg)</Label>
                  <Input type="number" min={10} max={5000} placeholder="₹ per kg" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
              </div>
              {qty && price && Number(qty) > 0 && Number(price) > 0 && (
                <div className="rounded-lg bg-deep text-foam px-4 py-3 flex items-center justify-between">
                  <span className="text-[12px] uppercase tracking-wider font-bold text-foam/60">Lot total</span>
                  <span className="num text-xl font-bold text-amber">{fmtINR(Number(qty) * Number(price))}</span>
                </div>
              )}
              <Button size="lg" className="w-full" icon="gavel" disabled={busy || !arrivalId || !buyerId} onClick={submit}>
                {busy ? 'Recording…' : 'Record auction result'}
              </Button>
              <p className="text-[11.5px] text-mist">Yesterday's market averages are pre-filled as a starting point. Auction data never overwrites planned supply.</p>
            </div>
          </Card>
        </Reveal>

        <div className="lg:col-span-3 space-y-4">
          <Reveal delay={80}>
            <Card title="My auction results — today" sub={`${myToday.length} lots recorded`} pad={false}>
              {myToday.length === 0 ? (
                <Empty icon="gavel" title="No auctions recorded yet" sub="Results you enter feed the public price board instantly." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[540px]">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                        <th className="font-bold px-4 py-2">Time</th>
                        <th className="font-bold px-2 py-2">Fish</th>
                        <th className="font-bold px-2 py-2">Buyer</th>
                        <th className="font-bold px-2 py-2 text-right">Qty</th>
                        <th className="font-bold px-2 py-2 text-right">₹/kg</th>
                        <th className="font-bold px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myToday.map(a => (
                        <tr key={a.id} className="border-t border-linesoft hover:bg-foam/50 transition-colors flash-row">
                          <td className="px-4 py-2.5 num text-mist">{timeOf(a.createdAt)}</td>
                          <td className="px-2 py-2.5 font-display font-bold text-ink">{fishName(db, a.fishId)}</td>
                          <td className="px-2 py-2.5 text-[13px]">{userName(db, a.buyerId)}</td>
                          <td className="px-2 py-2.5 text-right num">{a.qty} kg</td>
                          <td className="px-2 py-2.5 text-right num font-bold text-sea">{fmtINR(a.pricePerKg)}</td>
                          <td className="px-4 py-2.5 text-right num font-semibold">{fmtINR(a.qty * a.pricePerKg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </Reveal>

          <Reveal delay={140}>
            <Card title="Price reference — yesterday's market averages" sub={`${market.name}, all ${brokersOfMarket(db, marketId ?? '').length} brokers combined`} pad={false}>
              <ul className="grid sm:grid-cols-2 divide-y sm:divide-y-0 divide-linesoft">
                {yesterdayPrices.map(p => (
                  <li key={p.fishId} className="px-4 py-2.5 flex items-center justify-between hover:bg-foam/50 transition-colors">
                    <span className="font-bold text-[13.5px] text-ink">{p.fishName}</span>
                    <span className="num text-[13px]"><span className="font-bold text-ink">{fmtINR(p.avg)}</span> <span className="text-mist">({fmtINR(p.min)}–{fmtINR(p.max)})</span></span>
                  </li>
                ))}
                {yesterdayPrices.length === 0 && <li className="px-4 py-4 text-sm text-mist">No trade yesterday.</li>}
              </ul>
            </Card>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- notices ---------------- */

function Notices() {
  const { db, me, marketId, market } = useBrokerCtx();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const notices = db.notices
    .filter(n => n.marketId === marketId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

  if (!market || !marketId) return <Shell title="Notices"><Card><Empty icon="anchor" title="No market assigned" /></Card></Shell>;

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      const res = publishNotice(me, { marketId, title, body, pinned });
      setBusy(false);
      if (!res.ok) { toast(res.error, 'err'); return; }
      toast('Notice published — all users were notified.');
      setTitle(''); setBody(''); setPinned(false);
    }, 300);
  };

  return (
    <Shell title="Market notices" crumb={`Broker · ${market.name} · Notices`}>
      <div className="rise mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Broker · broadcast to the market</p>
        <h1 className="font-display font-extrabold text-[26px] text-ink leading-tight mt-1">Market notices</h1>
      </div>
      <div className="grid lg:grid-cols-5 gap-4">
        <Reveal className="lg:col-span-2">
          <Card title="Publish a notice" sub={`Visible on the ${market.name} public board`}>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input placeholder="e.g. Ice available at Gate 2" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Details</Label>
                <Textarea rows={4} placeholder="What should sellers and buyers know?" value={body} onChange={e => setBody(e.target.value)} />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="w-4 h-4 accent-[#f2a93b]" />
                <span className="text-sm font-semibold text-ink">Pin to top of the board</span>
              </label>
              <Button size="lg" className="w-full" icon="megaphone" disabled={busy} onClick={submit}>{busy ? 'Publishing…' : 'Publish notice'}</Button>
            </div>
          </Card>
        </Reveal>
        <Reveal className="lg:col-span-3" delay={80}>
          <Card title={`${market.name} notice board`} sub={`${notices.length} notices`} pad={false}>
            {notices.length === 0 ? (
              <Empty icon="megaphone" title="No notices yet" />
            ) : (
              <ul className="divide-y divide-linesoft">
                {notices.map((n: MarketNotice) => (
                  <NoticeRow key={n.id} n={n} canDelete={n.authorId === me.id} onDelete={() => {
                    const res = deleteNotice(me, n.id);
                    if (!res.ok) toast(res.error, 'err'); else toast('Notice removed.');
                  }} />
                ))}
              </ul>
            )}
          </Card>
        </Reveal>
      </div>
    </Shell>
  );
}

function NoticeRow({ n, canDelete, onDelete }: { n: MarketNotice; canDelete: boolean; onDelete: () => void }) {
  const { db } = useStore();
  const author = db.users.find(u => u.id === n.authorId);
  return (
    <li className="px-4 py-3.5 flex gap-3 hover:bg-foam/50 transition-colors">
      <span className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${n.pinned ? 'bg-ambersoft text-amberink' : 'bg-sea/10 text-sea'}`}>
        <Icon name={n.pinned ? 'pin' : 'megaphone'} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[14px] text-ink flex items-center gap-2 flex-wrap">
          {n.title} {n.pinned && <Badge tone="amber">pinned</Badge>}
        </p>
        <p className="text-[13px] text-mist leading-snug mt-0.5">{n.body}</p>
        <p className="text-[11px] num text-mist/80 mt-1">{author?.name ?? '—'} ({n.authorRole}) · {timeAgo(n.createdAt)}</p>
      </div>
      {canDelete && (
        <button onClick={onDelete} className="self-start p-1.5 rounded-lg text-mist hover:text-coralink hover:bg-coralsoft transition-colors cursor-pointer" title="Remove notice">
          <Icon name="x" size={14} />
        </button>
      )}
    </li>
  );
}

/* ---------------- guarded exports ---------------- */

function BrokerHomeG() { return <Guard role="broker"><BrokerHome /></Guard>; }
function ArrivalsG() { return <Guard role="broker"><Arrivals /></Guard>; }
function AuctionsG() { return <Guard role="broker"><Auctions /></Guard>; }
function NoticesG() {
  return <Guard role="broker"><Notices /></Guard>;
}

export { BrokerHomeG as BrokerHomeGuarded, ArrivalsG as BrokerArrivalsGuarded, AuctionsG as BrokerAuctionsGuarded, NoticesG as BrokerNoticesGuarded };
