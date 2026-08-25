import { useMemo, useState } from 'react';
import { Shell, Guard } from '../components/layout';
import { Badge, Card, CountUp, Empty, Icon, LevelBadge, Reveal, Stat } from '../components/ui';
import { useStore } from '../state/store';
import { brokersOfMarket, marketSellerCount, marketTotals, priceStats, supplyByFish, userName } from '../lib/api';
import { addDays, fmtDate, fmtINR, fmtKg, relDay, timeAgo, timeOf, todayStr } from '../lib/format';

function BuyerDashboard() {
  const { db, user } = useStore();
  const me = user!;
  const markets = db.markets.filter(m => m.active);
  const [marketId, setMarketId] = useState(markets[0]?.id ?? '');
  const [priceDay, setPriceDay] = useState<'yesterday' | 'today'>('yesterday');

  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const viewPriceDate = priceDay === 'yesterday' ? addDays(today, -1) : today;
  const market = markets.find(m => m.id === marketId);

  const supply = useMemo(() => supplyByFish(db, marketId, tomorrow), [db, marketId, tomorrow]);
  const prices = useMemo(() => priceStats(db, marketId, viewPriceDate), [db, marketId, viewPriceDate]);
  const totals = useMemo(() => marketTotals(db, marketId, viewPriceDate), [db, marketId, viewPriceDate]);
  const results = useMemo(
    () => db.auctions
      .filter(a => a.marketId === marketId && (a.date === today || a.date === addDays(today, -1)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 14),
    [db, marketId, today],
  );
  const notices = db.notices.filter(n => n.marketId === marketId).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const myPurchases = db.auctions.filter(a => a.buyerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <Shell title="Buyer dashboard" crumb="Buyer · plan your purchases">
      <div className="rise flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Buyer dashboard</p>
          <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] text-ink leading-tight mt-1">Plan before the bell, {me.name.split(' ')[0]}</h1>
          <p className="text-sm text-mist mt-1">Supply signals, hammer prices and results — bidding stays physical at the market.</p>
        </div>
        <div className="flex rounded-xl border border-line bg-paper p-1 gap-1 shadow-sm">
          {markets.map(m => (
            <button key={m.id} onClick={() => setMarketId(m.id)}
              className={`px-3 sm:px-4 h-9 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${m.id === marketId ? 'bg-deep text-amber shadow' : 'text-mist hover:text-ink hover:bg-foam'}`}>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Expected tomorrow" value={<><CountUp to={supply.reduce((s, r) => s + r.totalQty, 0)} /> kg</>} sub={`${marketSellerCount(db, marketId, tomorrow)} sellers registered`} delay={1} />
        <Stat label={`${relDay(viewPriceDate)} volume`} value={<><CountUp to={totals.kg} /> kg</>} sub={`${totals.lots} lots at ${market?.name}`} delay={2} />
        <Stat label="Species traded" value={totals.fishCount} sub={`${relDay(viewPriceDate).toLowerCase()}`} delay={3} />
        <Stat label="Your last buys" value={myPurchases.length} sub={myPurchases[0] ? `latest ${timeAgo(myPurchases[0].createdAt)}` : 'no purchases yet'} accent delay={4} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Reveal>
          <Card title={`${relDay(tomorrow)}'s expected supply`} sub="Registered supply reported through the platform" pad={false}>
            {supply.length === 0 ? (
              <Empty icon="scale" title="No supply registered yet" sub="Check back — sellers register up to 14 days ahead." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                    <th className="font-bold px-4 py-2">Fish</th>
                    <th className="font-bold px-2 py-2 text-right">Expected</th>
                    <th className="font-bold px-2 py-2 text-right">Sellers</th>
                    <th className="font-bold px-4 py-2 text-right">Supply</th>
                  </tr>
                </thead>
                <tbody>
                  {supply.map(r => (
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
            title="Auction prices"
            sub={`Min / average / max per kg · all ${brokersOfMarket(db, marketId).length} brokers combined`}
            action={
              <div className="flex rounded-lg border border-line overflow-hidden">
                {(['yesterday', 'today'] as const).map(d => (
                  <button key={d} onClick={() => setPriceDay(d)}
                    className={`px-2.5 h-7 text-[11px] font-bold uppercase cursor-pointer transition-colors ${priceDay === d ? 'bg-deep text-amber' : 'bg-white text-mist hover:text-ink'}`}>{d}</button>
                ))}
              </div>
            }
            pad={false}
          >
            {prices.length === 0 ? (
              <Empty icon="tag" title={`No ${priceDay === 'today' ? 'auctions yet today' : 'trade yesterday'}`} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                    <th className="font-bold px-4 py-2">Fish</th>
                    <th className="font-bold px-2 py-2 text-right">Min</th>
                    <th className="font-bold px-2 py-2 text-right">Avg</th>
                    <th className="font-bold px-2 py-2 text-right">Max</th>
                    <th className="font-bold px-4 py-2 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map(p => (
                    <tr key={p.fishId} className="border-t border-linesoft hover:bg-foam/50 transition-colors">
                      <td className="px-4 py-2.5 font-display font-bold text-ink">{p.fishName}</td>
                      <td className="px-2 py-2.5 text-right num text-mist">{fmtINR(p.min)}</td>
                      <td className="px-2 py-2.5 text-right num font-bold text-sea">{fmtINR(p.avg)}</td>
                      <td className="px-2 py-2.5 text-right num text-mist">{fmtINR(p.max)}</td>
                      <td className="px-4 py-2.5 text-right num text-mist">{p.totalKg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </Reveal>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 mt-4">
        <Reveal className="lg:col-span-3">
          <Card title="Recent auction results" sub="Latest lots from yesterday & today — physical auction, recorded by brokers" pad={false}>
            {results.length === 0 ? (
              <Empty icon="gavel" title="No recent results" />
            ) : (
              <ul className="divide-y divide-linesoft max-h-[420px] overflow-y-auto">
                {results.map(a => (
                  <li key={a.id} className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-foam/50 transition-colors">
                    <span className="w-9 h-9 rounded-lg bg-deep text-amber flex items-center justify-center shrink-0"><Icon name="gavel" size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[13.5px] text-ink">
                        {db.species.find(f => f.id === a.fishId)?.name}
                        <span className="text-mist font-medium"> · {a.qty} kg</span>
                      </p>
                      <p className="text-[11.5px] num text-mist mt-0.5">{relDay(a.date)} {timeOf(a.createdAt)} · broker {userName(db, a.brokerId)}</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-bold text-sea">{fmtINR(a.pricePerKg)}<span className="text-[10px] text-mist font-medium">/kg</span></p>
                      <p className="text-[11px] num text-mist">{fmtINR(a.qty * a.pricePerKg)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Reveal>

        <div className="lg:col-span-2 space-y-4">
          <Reveal delay={80}>
            <Card title="Market notices" pad={false}>
              {notices.length === 0 ? <Empty icon="megaphone" title="No notices" /> : (
                <ul className="divide-y divide-linesoft">
                  {notices.map(n => (
                    <li key={n.id} className="px-4 py-3">
                      <p className="font-bold text-[13px] text-ink flex items-center gap-2">{n.pinned && <Icon name="pin" size={12} className="text-amberink" />}{n.title}</p>
                      <p className="text-[12px] text-mist leading-snug mt-0.5">{n.body}</p>
                      <p className="text-[10.5px] num text-mist/80 mt-1">{timeAgo(n.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Reveal>
          <Reveal delay={140}>
            <Card title="Your recent purchases" sub="From broker-recorded auction results" pad={false}>
              {myPurchases.length === 0 ? (
                <Empty icon="tag" title="No purchases recorded yet" sub="When a broker records a lot you won, it shows here." />
              ) : (
                <ul className="divide-y divide-linesoft">
                  {myPurchases.map(a => (
                    <li key={a.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-foam/50 transition-colors">
                      <div>
                        <p className="font-bold text-[13px] text-ink">{db.species.find(f => f.id === a.fishId)?.name} · {a.qty} kg</p>
                        <p className="text-[11px] num text-mist">{db.markets.find(m => m.id === a.marketId)?.name} · {fmtDate(a.date)} </p>
                      </div>
                      <span className="num font-bold text-sea">{fmtINR(a.qty * a.pricePerKg)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Reveal>
        </div>
      </div>

      <Reveal delay={60}>
        <div className="mt-6 rounded-2xl bg-deep text-foam px-5 py-5 sm:px-7 flex flex-wrap items-center justify-between gap-4 border border-deep3">
          <div>
            <h3 className="font-display font-extrabold text-lg text-white flex items-center gap-2"><Icon name="gavel" size={18} className="text-amber" />No online bidding in the MVP</h3>
            <p className="text-sm text-foam/75 mt-1 max-w-xl">The auction remains physical at the market yard. Machhbazar gives you the supply picture and price history so you can bid smarter at the bell.</p>
          </div>
          <Badge tone="deep" className="border border-amber/40 !text-[12px] !px-3 !py-1.5">physical auctions only</Badge>
        </div>
      </Reveal>
    </Shell>
  );
}

export default function BuyerGuarded() {
  return <Guard role="buyer"><BuyerDashboard /></Guard>;
}
