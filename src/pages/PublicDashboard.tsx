import { useMemo, useState } from 'react';
import { Shell } from '../components/layout';
import { Badge, Button, Card, CountUp, Empty, Icon, LevelBadge, Reveal, Select, Stat } from '../components/ui';
import { DayBars, HistoryAxis, RangeStrip, Sparkline } from '../components/charts';
import { useStore } from '../state/store';
import { Link } from '../router';
import {
  brokersOfMarket, marketSellerCount, marketSupplyTotalKg, marketTotals,
  priceHistory, priceStats, supplyByFish,
} from '../lib/api';
import { addDays, fmtDate, fmtINR, fmtKg, relDay, timeAgo, todayStr } from '../lib/format';

export default function PublicDashboard() {
  const { db } = useStore();
  const markets = db.markets.filter(m => m.active);
  const [selId, setSelId] = useState(markets[0]?.id ?? '');
  const market = markets.find(m => m.id === selId) ?? markets[0];
  const marketId = market?.id ?? '';

  const today = todayStr();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const prices = useMemo(() => priceStats(db, marketId, yesterday), [db, marketId, yesterday]);
  const supply = useMemo(() => supplyByFish(db, marketId, tomorrow), [db, marketId, tomorrow]);
  const totals = useMemo(() => marketTotals(db, marketId, yesterday), [db, marketId, yesterday]);
  const sellersTomorrow = marketSellerCount(db, marketId, tomorrow);
  const supplyKg = marketSupplyTotalKg(db, marketId, tomorrow);
  const brokers = brokersOfMarket(db, marketId);
  const notices = db.notices.filter(n => n.marketId === marketId).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const [histFish, setHistFish] = useState<string>('');
  const histFishId = histFish || prices[0]?.fishId || db.species[0]?.id || '';
  const history = useMemo(() => priceHistory(db, marketId, histFishId, 7), [db, marketId, histFishId]);
  const histFishName = db.species.find(f => f.id === histFishId)?.name ?? '';

  const topPrice = [...prices].sort((a, b) => b.value - a.value)[0];
  const topSupply = supply[0];

  const upcoming = [0, 1, 2].map(off => ({
    label: off === 0 ? 'Today' : off === 1 ? 'Tmrw' : fmtDate(addDays(today, 2), false),
    value: marketSupplyTotalKg(db, marketId, addDays(today, off)),
  }));

  return (
    <Shell title={`${market?.name ?? 'Market'} board`}>
      {/* market switcher + headline */}
      <div className="rise flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea flex items-center gap-1.5">
            <Icon name="anchor" size={13} /> Public market board · no login needed
          </p>
          <h1 className="font-display font-extrabold text-[26px] sm:text-[32px] text-ink leading-tight mt-1">
            {relDay(yesterday)}'s prices &amp; {relDay(tomorrow).toLowerCase()}'s expected supply
          </h1>
        </div>
        <div className="flex rounded-xl border border-line bg-paper p-1 gap-1 shadow-sm">
          {markets.map(m => (
            <button key={m.id} onClick={() => setSelId(m.id)}
              className={`px-3 sm:px-4 h-9 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${m.id === selId ? 'bg-deep text-amber shadow' : 'text-mist hover:text-ink hover:bg-foam'}`}>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {market && (
        <p className="rise rise-1 text-[13px] text-mist mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1"><Icon name="pin" size={13} className="text-sea" />{market.district}</span>
          <span className="inline-flex items-center gap-1"><Icon name="gavel" size={13} className="text-sea" />Auction bell {market.auctionTime} AM</span>
          <span className="inline-flex items-center gap-1"><Icon name="users" size={13} className="text-sea" />{brokers.length} brokers</span>
          <span className="inline-flex items-center gap-1"><Icon name="calendar" size={13} className="text-sea" />{fmtDate(today)}</span>
        </p>
      )}

      {/* THE BOARD */}
      <Reveal>
        <div className="board-deep rounded-2xl text-foam overflow-hidden border border-deep3 shadow-xl shadow-deep/25">
          <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white flex items-center gap-2.5">
                {market?.name} fish market
                <Badge tone="deep" className="border border-amber/30"><span className="w-1.5 h-1.5 rounded-full bg-amber live-dot" />live</Badge>
              </h2>
              {topPrice && topSupply ? (
                <p className="text-[13px] text-foam/75 mt-1 num">
                  {topPrice.fishName} closed at <span className="text-amber font-bold">{fmtINR(topPrice.avg)}/kg</span> yesterday
                  &nbsp;·&nbsp; <span className="text-white font-semibold">{fmtKg(topSupply.totalQty)}</span> {topSupply.fishName} expected tomorrow
                </p>
              ) : (
                <p className="text-[13px] text-foam/75 mt-1">Board updates as brokers record auctions.</p>
              )}
            </div>
            <div className="flex gap-5 text-right">
              <div><p className="text-[10px] uppercase tracking-wider text-foam/55 font-bold">{relDay(yesterday)} volume</p><p className="num text-xl text-white font-semibold"><CountUp to={totals.kg} suffix=" kg" /></p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-foam/55 font-bold">Turnover</p><p className="num text-xl text-amber font-semibold"><CountUp to={Math.round(totals.value / 1000)} prefix="₹" suffix="k" /></p></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            {/* Yesterday's prices */}
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber flex items-center gap-1.5"><Icon name="tag" size={13} />{relDay(yesterday)}'s auction prices</h3>
                <span className="text-[11px] num text-foam/55">{totals.lots} lots · all brokers combined</span>
              </div>
              {prices.length === 0 ? (
                <p className="text-sm text-foam/60 py-8 text-center">No auctions recorded for yesterday yet.</p>
              ) : (
                <div className="space-y-3">
                  {prices.slice(0, 7).map(p => (
                    <div key={p.fishId} className="group rounded-lg px-3 py-2.5 -mx-1 hover:bg-white/5 transition-colors">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display font-bold text-[15px] text-white">{p.fishName}</span>
                        <span className="num text-lg font-bold text-amber">{fmtINR(p.avg)}<span className="text-[11px] text-foam/60 font-medium">/kg avg</span></span>
                      </div>
                      <div className="mt-2"><RangeStrip min={p.min} avg={p.avg} max={p.max} /></div>
                      <div className="flex justify-between mt-1.5 text-[11px] num text-foam/60">
                        <span>min {fmtINR(p.min)}</span>
                        <span>{p.totalKg} kg · {p.lots} lots</span>
                        <span>max {fmtINR(p.max)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tomorrow's expected supply */}
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber flex items-center gap-1.5"><Icon name="scale" size={13} />{relDay(tomorrow)}'s expected supply</h3>
                <span className="text-[11px] num text-foam/55">{sellersTomorrow} sellers registered</span>
              </div>
              {supply.length === 0 ? (
                <p className="text-sm text-foam/60 py-8 text-center">No supply registered for tomorrow yet — sellers can register up to 14 days ahead.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[380px]">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-foam/50 text-left">
                        <th className="font-bold pb-2 pl-1">Fish</th>
                        <th className="font-bold pb-2 text-right">Expected</th>
                        <th className="font-bold pb-2 text-right">Sellers</th>
                        <th className="font-bold pb-2 text-right pr-1">Supply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supply.map(r => (
                        <tr key={r.fishId} className="border-t border-white/8 hover:bg-white/5 transition-colors">
                          <td className="py-2.5 pl-1">
                            <span className="font-display font-bold text-white text-[15px]">{r.fishName}</span>
                            <span className="block text-[10.5px] num text-foam/50">{r.confirmedKg} kg confirmed</span>
                          </td>
                          <td className="py-2.5 text-right num font-semibold text-white">{fmtKg(r.totalQty)}</td>
                          <td className="py-2.5 text-right num text-foam/75">{r.sellers}</td>
                          <td className="py-2.5 text-right pr-1"><LevelBadge level={r.level} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-amber/30">
                        <td className="py-2.5 pl-1 text-[11px] uppercase tracking-wider font-bold text-amber">Total expected</td>
                        <td className="py-2.5 text-right num font-bold text-amber text-base">{fmtKg(supplyKg)}</td>
                        <td className="py-2.5 text-right num text-amber">{sellersTomorrow}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <p className="mt-3 text-[11px] text-foam/55 leading-relaxed border-t border-white/8 pt-3">
                Registered supply reported through the platform. Seller names and individual quantities are kept private — only market totals are shown.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <Stat label={`${relDay(yesterday)} volume`} value={<CountUp to={totals.kg} suffix=" kg" />} sub={`${totals.lots} auction lots`} delay={1} />
        <Stat label={`${relDay(yesterday)} turnover`} value={<CountUp to={totals.value} prefix="₹" />} sub={`${totals.fishCount} species traded`} delay={2} />
        <Stat label="Sellers registered" value={<CountUp to={sellersTomorrow} />} sub={`for ${relDay(tomorrow).toLowerCase()}`} delay={3} />
        <Stat label="Active brokers" value={brokers.length} sub={`at ${market?.name}`} accent delay={4} />
      </div>

      {/* charts + notices */}
      <div className="grid lg:grid-cols-5 gap-4 mt-5">
        <Reveal className="lg:col-span-3">
          <Card
            title="7-day price history"
            sub={`Market-wide average, all ${brokers.length} brokers combined`}
            action={
              <Select value={histFishId} onChange={e => setHistFish(e.target.value)} className="!h-8 !w-36 !text-xs">
                {db.species.filter(f => f.active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            }
          >
            {history.some(h => h.avg !== null) ? (
              <>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="num text-3xl font-bold text-ink">{fmtINR(history[history.length - 1].avg ?? 0)}</span>
                  <span className="text-xs text-mist num">
                    {(() => {
                      const known = history.filter(h => h.avg !== null);
                      if (known.length < 2) return 'per kg · latest close';
                      const first = known[0].avg!, last = known[known.length - 1].avg!;
                      const d = last - first;
                      return `${d >= 0 ? '▲' : '▼'} ${fmtINR(Math.abs(d))} over 7 days · per kg`;
                    })()}
                  </span>
                </div>
                <Sparkline data={history} />
                <HistoryAxis data={history} />
              </>
            ) : (
              <Empty icon="chart" title={`No ${histFishName} trade this week`} sub="Price history builds as brokers record auction lots." />
            )}
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={80}>
          <Card title="Expected supply — next 3 days" sub="Planned kg registered by sellers" className="h-full">
            <DayBars data={upcoming} />
            <p className="text-[11px] text-mist mt-4">
              Supply levels: LOW &lt; MEDIUM &lt; HIGH &lt; VERY HIGH, set per market by the admin.
            </p>
          </Card>
        </Reveal>
      </div>

      {/* notices + recent stats */}
      <div className="grid lg:grid-cols-5 gap-4 mt-4">
        <Reveal className="lg:col-span-3">
          <Card title="Market notices" sub={`${market?.name} · from brokers & admin`} pad={false}>
            {notices.length === 0 ? (
              <Empty icon="megaphone" title="No notices posted" />
            ) : (
              <ul className="divide-y divide-linesoft">
                {notices.map(n => {
                  const author = db.users.find(u => u.id === n.authorId);
                  return (
                    <li key={n.id} className="px-4 sm:px-5 py-3.5 flex gap-3 hover:bg-foam/60 transition-colors">
                      <span className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${n.pinned ? 'bg-ambersoft text-amberink' : 'bg-sea/10 text-sea'}`}>
                        <Icon name={n.pinned ? 'pin' : 'megaphone'} size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[14px] text-ink flex items-center gap-2 flex-wrap">
                          {n.title}
                          {n.pinned && <Badge tone="amber">pinned</Badge>}
                        </p>
                        <p className="text-[13px] text-mist leading-snug mt-0.5">{n.body}</p>
                        <p className="text-[11px] num text-mist/80 mt-1">{author?.name ?? '—'} · {timeAgo(n.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={80}>
          <Card title="Recent auction activity" sub="Latest recorded lots, all markets" pad={false} className="h-full">
            <ul className="divide-y divide-linesoft max-h-[380px] overflow-y-auto">
              {db.auctions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(a => {
                const buyer = db.users.find(u => u.id === a.buyerId);
                return (
                  <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-foam/60 transition-colors">
                    <div>
                      <p className="text-[13px] font-bold text-ink">
                        {db.species.find(f => f.id === a.fishId)?.name}
                        <span className="text-mist font-medium"> · {db.markets.find(m => m.id === a.marketId)?.name}</span>
                      </p>
                      <p className="text-[11px] num text-mist mt-0.5">{a.qty} kg → {buyer?.name} · {relDay(a.date)}, {timeAgo(a.createdAt)}</p>
                    </div>
                    <span className="num font-bold text-sea whitespace-nowrap">{fmtINR(a.pricePerKg)}<span className="text-[10px] text-mist font-medium">/kg</span></span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Reveal>
      </div>

      {/* CTA strip */}
      <Reveal delay={60}>
        <div className="mt-6 rounded-2xl border border-line bg-paper px-5 py-5 sm:px-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-extrabold text-lg text-ink">Are you bringing fish to market?</h3>
            <p className="text-sm text-mist mt-0.5">Register tomorrow's expected supply in under a minute — it helps brokers and buyers plan.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/login"><Button variant="primary" icon="arrow-right">Seller sign in</Button></Link>
            <Link to="/login"><Button variant="outline">All roles</Button></Link>
          </div>
        </div>
      </Reveal>
    </Shell>
  );
}
