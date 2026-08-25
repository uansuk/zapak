import { getDB, mutate, setSessionUserId, getSessionUserId } from './db';
import type {
  Auction, Confidence, DB, FishArrival, MarketConfig, MarketNotice,
  Result, SellerIntention, SupplyLevel, User,
} from './types';
import { addDays, fmtDate, fmtINR, nowIso, relDay, todayStr } from './format';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const fail = (error: string): Result<never> => ({ ok: false, error });
const ok = <T,>(data: T): Result<T> => ({ ok: true, data });

function log(db: DB, actor: User, action: string, entity: string, message: string, entityId?: string) {
  db.audit.unshift({
    id: `al${Date.now()}${db.audit.length}`, at: nowIso(), actorId: actor.id,
    actorName: actor.name, role: actor.role, action, entity, entityId, message,
  });
  if (db.audit.length > 400) db.audit.length = 400;
}

function notify(db: DB, userId: string, text: string, marketId: string | null) {
  db.notifications.unshift({
    id: `no${Date.now()}${db.notifications.length}`, userId, marketId, text, read: false, createdAt: nowIso(),
  });
}

const userById = (db: DB, id: string) => db.users.find(u => u.id === id);
const assertActive = (u: User | undefined, role?: string): u is User =>
  !!u && u.active && (!role || u.role === role);

export function sessionUser(): User | null {
  const id = getSessionUserId();
  if (!id) return null;
  const u = getDB().users.find(x => x.id === id);
  return u && u.active ? u : null;
}

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

export function login(phone: string, password: string): Result<User> {
  const db = getDB();
  const u = db.users.find(x => x.phone === phone.trim());
  if (!u) return fail('No account found for this phone number.');
  if (!u.active) return fail('This account has been deactivated. Contact the market admin.');
  if (u.password !== password) return fail('Incorrect password. Demo password is “fish123”.');
  setSessionUserId(u.id);
  mutate(d => log(d, u, 'LOGIN', 'User', `${u.name} signed in (${u.role})`, u.id));
  return ok(u);
}

export function logout(actor: User) {
  setSessionUserId(null);
  mutate(d => log(d, actor, 'LOGOUT', 'User', `${actor.name} signed out`, actor.id));
}

/* ------------------------------------------------------------------ */
/* seller: intentions (planned supply)                                 */
/* ------------------------------------------------------------------ */

export interface IntentionInput {
  marketId: string; fishId: string; date: string; plannedQty: number;
  confidence: Confidence; brokerId: string | null; note?: string;
}

function validateIntention(db: DB, actor: User, inp: IntentionInput): string | null {
  if (actor.role !== 'seller') return 'Only sellers can register expected fish.';
  const mkt = db.markets.find(m => m.id === inp.marketId && m.active);
  if (!mkt) return 'Choose a valid market.';
  const fish = db.species.find(f => f.id === inp.fishId && f.active);
  if (!fish) return 'Choose a fish species.';
  const today = todayStr();
  if (!inp.date || inp.date < today) return 'Date must be today or in the future.';
  if (inp.date > addDays(today, 14)) return 'Registrations open only 14 days ahead.';
  if (!Number.isFinite(inp.plannedQty) || inp.plannedQty < 10) return 'Quantity must be at least 10 kg.';
  if (inp.plannedQty > 5000) return 'Quantity cannot exceed 5,000 kg per registration.';
  if (!['confirmed', 'likely', 'possible'].includes(inp.confidence)) return 'Choose a confidence level.';
  if (inp.brokerId) {
    const linked = db.marketBrokers.some(mb => mb.marketId === inp.marketId && mb.brokerId === inp.brokerId);
    if (!linked) return 'That broker does not operate in the selected market.';
  }
  return null;
}

export function createIntention(actor: User, inp: IntentionInput): Result<SellerIntention> {
  const err = validateIntention(getDB(), actor, inp);
  if (err) return fail(err);
  return mutate(db => {
    const now = nowIso();
    const row: SellerIntention = {
      id: `int${Date.now()}`, sellerId: actor.id, marketId: inp.marketId, fishId: inp.fishId,
      date: inp.date, plannedQty: Math.round(inp.plannedQty), confidence: inp.confidence,
      brokerId: inp.brokerId, status: 'active', note: inp.note?.trim() || undefined,
      createdAt: now, updatedAt: now,
    };
    db.intentions.push(row);
    const mkt = db.markets.find(m => m.id === inp.marketId)!;
    const fish = db.species.find(f => f.id === inp.fishId)!;
    const broker = inp.brokerId ? userById(db, inp.brokerId) : null;
    log(db, actor, 'INTENTION_CREATE', 'SellerIntention',
      `Registered ${row.plannedQty} kg ${fish.name} for ${fmtDate(inp.date)} at ${mkt.name}${broker ? ` (preferred broker: ${broker.name})` : ''}`, row.id);
    if (broker) notify(db, broker.id, `${actor.name} registered ${row.plannedQty} kg ${fish.name} for ${relDay(inp.date)} at ${mkt.name} preferring your desk.`, mkt.id);
    return ok(row);
  });
}

export function updateIntention(actor: User, intentionId: string, inp: IntentionInput): Result<SellerIntention> {
  const db = getDB();
  const row = db.intentions.find(i => i.id === intentionId);
  if (!row || row.sellerId !== actor.id) return fail('Registration not found.');
  if (row.status === 'cancelled') return fail('Cancelled registrations cannot be edited — create a new one.');
  if (row.date < todayStr()) return fail('Past registrations are locked.');
  const err = validateIntention(db, actor, inp);
  if (err) return fail(err);
  return mutate(d => {
    const fish = d.species.find(f => f.id === inp.fishId)!;
    row.marketId = inp.marketId; row.fishId = inp.fishId; row.date = inp.date;
    row.plannedQty = Math.round(inp.plannedQty); row.confidence = inp.confidence;
    row.brokerId = inp.brokerId; row.note = inp.note?.trim() || undefined; row.updatedAt = nowIso();
    log(d, actor, 'INTENTION_UPDATE', 'SellerIntention', `Updated registration → ${row.plannedQty} kg ${fish.name} on ${fmtDate(row.date)}`, row.id);
    return ok(row);
  });
}

export function cancelIntention(actor: User, intentionId: string): Result {
  const db = getDB();
  const row = db.intentions.find(i => i.id === intentionId);
  if (!row || row.sellerId !== actor.id) return fail('Registration not found.');
  if (row.status !== 'active') return fail('Only active registrations can be cancelled.');
  if (row.date < todayStr()) return fail('Past registrations are locked and cannot be cancelled.');
  return mutate(d => {
    row.status = 'cancelled'; row.updatedAt = nowIso();
    const fish = d.species.find(f => f.id === row.fishId)!;
    const mkt = d.markets.find(m => m.id === row.marketId)!;
    log(d, actor, 'INTENTION_CANCEL', 'SellerIntention', `Cancelled ${row.plannedQty} kg ${fish.name} on ${fmtDate(row.date)} at ${mkt.name}`, row.id);
    return ok(undefined);
  });
}

export const canEditIntention = (i: SellerIntention) => i.status === 'active' && i.date >= todayStr();

/* ------------------------------------------------------------------ */
/* broker: arrivals (actual) & auctions                                */
/* ------------------------------------------------------------------ */

export function brokerMarkets(db: DB, brokerId: string): string[] {
  return db.marketBrokers.filter(mb => mb.brokerId === brokerId).map(mb => mb.marketId);
}

export function primaryMarketId(db: DB, brokerId: string): string | null {
  return brokerMarkets(db, brokerId)[0] ?? null;
}

export function recordArrival(
  actor: User,
  inp: { fishId: string; actualQty: number; sellerId: string | null; intentionId: string | null; note?: string },
): Result<FishArrival> {
  const db = getDB();
  if (actor.role !== 'broker') return fail('Only brokers can record arrivals.');
  const marketId = primaryMarketId(db, actor.id);
  if (!marketId) return fail('You are not attached to any market.');
  const fish = db.species.find(f => f.id === inp.fishId && f.active);
  if (!fish) return fail('Choose a fish species.');
  const qty = Math.round(inp.actualQty);
  if (!Number.isFinite(qty) || qty < 1) return fail('Actual quantity must be at least 1 kg.');
  if (qty > 10000) return fail('Actual quantity cannot exceed 10,000 kg.');
  const today = todayStr();
  let intention: SellerIntention | null = null;
  if (inp.intentionId) {
    intention = db.intentions.find(i => i.id === inp.intentionId) ?? null;
    if (!intention || intention.status !== 'active' || intention.date !== today || intention.marketId !== marketId)
      return fail('The linked registration is not valid for today at your market.');
    if (inp.sellerId && intention.sellerId !== inp.sellerId) return fail('Seller does not match the registration.');
  }
  if (inp.sellerId) {
    const s = userById(db, inp.sellerId);
    if (!assertActive(s, 'seller')) return fail('Choose a valid seller.');
  }
  return mutate(d => {
    const row: FishArrival = {
      id: `ar${Date.now()}`, marketId, brokerId: actor.id, sellerId: inp.intentionId ? intention!.sellerId : inp.sellerId,
      intentionId: inp.intentionId, fishId: inp.fishId, date: today, actualQty: qty,
      note: inp.note?.trim() || undefined, createdAt: nowIso(),
    };
    d.arrivals.push(row);
    if (intention) { intention.status = 'fulfilled'; intention.updatedAt = nowIso(); }
    const seller = row.sellerId ? userById(d, row.sellerId) : null;
    log(d, actor, 'ARRIVAL_CREATE', 'FishArrival',
      `Recorded ${fish.name} arrival ${qty} kg${seller ? ` for ${seller.name}` : ' (open lot)'} at ${d.markets.find(m => m.id === marketId)!.name}`, row.id);
    if (seller) notify(d, seller.id, `Your ${fish.name} registration at ${d.markets.find(m => m.id === marketId)!.name} was marked arrived (${qty} kg, ${actor.name}).`, marketId);
    return ok(row);
  });
}

export function arrivalRemaining(db: DB, arrivalId: string): number {
  const ar = db.arrivals.find(a => a.id === arrivalId);
  if (!ar) return 0;
  const sold = db.auctions.filter(a => a.arrivalId === arrivalId).reduce((s, a) => s + a.qty, 0);
  return Math.max(0, ar.actualQty - sold);
}

export function recordAuction(
  actor: User,
  inp: { arrivalId: string; buyerId: string; qty: number; pricePerKg: number },
): Result<Auction> {
  const db = getDB();
  if (actor.role !== 'broker') return fail('Only brokers can record auction results.');
  const ar = db.arrivals.find(a => a.id === inp.arrivalId);
  if (!ar) return fail('Choose an arrival lot to auction.');
  if (ar.brokerId !== actor.id) return fail('You can auction only lots recorded at your own desk.');
  if (ar.date !== todayStr()) return fail('Only today’s arrival lots can be auctioned.');
  const remaining = arrivalRemaining(db, ar.id);
  if (remaining <= 0) return fail('This lot is already fully auctioned.');
  const buyer = userById(db, inp.buyerId);
  if (!assertActive(buyer, 'buyer')) return fail('Choose a valid buyer.');
  const qty = Math.round(inp.qty);
  if (!Number.isFinite(qty) || qty < 1) return fail('Lot quantity must be at least 1 kg.');
  if (qty > remaining) return fail(`Only ${remaining} kg remain in this lot.`);
  const price = Math.round(inp.pricePerKg);
  if (!Number.isFinite(price) || price < 10) return fail('Price must be at least ₹10 per kg.');
  if (price > 5000) return fail('Price above ₹5,000/kg — please double-check.');
  return mutate(d => {
    const row: Auction = {
      id: `au${Date.now()}`, arrivalId: ar.id, marketId: ar.marketId, brokerId: actor.id,
      fishId: ar.fishId, buyerId: buyer.id, date: ar.date, qty, pricePerKg: price, createdAt: nowIso(),
    };
    d.auctions.push(row);
    const fish = d.species.find(f => f.id === ar.fishId)!;
    const mkt = d.markets.find(m => m.id === ar.marketId)!;
    log(d, actor, 'AUCTION_CREATE', 'Auction',
      `Auctioned ${qty} kg ${fish.name} to ${buyer.name} at ${fmtINR(price)}/kg at ${mkt.name}`, row.id);
    notify(d, buyer.id, `You bought ${qty} kg ${fish.name} at ${mkt.name} for ${fmtINR(price)}/kg.`, ar.marketId);
    return ok(row);
  });
}

/* ------------------------------------------------------------------ */
/* notices                                                             */
/* ------------------------------------------------------------------ */

export function publishNotice(actor: User, inp: { marketId: string; title: string; body: string; pinned: boolean }): Result<MarketNotice> {
  const db = getDB();
  const isBrokerOfMarket = actor.role === 'broker' && brokerMarkets(db, actor.id).includes(inp.marketId);
  if (actor.role !== 'admin' && !isBrokerOfMarket) return fail('You can publish notices only for your own market.');
  if (!db.markets.some(m => m.id === inp.marketId && m.active)) return fail('Choose a valid market.');
  if (inp.title.trim().length < 5) return fail('Title must be at least 5 characters.');
  if (inp.body.trim().length < 10) return fail('Notice body must be at least 10 characters.');
  return mutate(d => {
    const row: MarketNotice = {
      id: `nt${Date.now()}`, marketId: inp.marketId, authorId: actor.id, authorRole: actor.role,
      title: inp.title.trim(), body: inp.body.trim(), pinned: inp.pinned, createdAt: nowIso(),
    };
    d.notices.unshift(row);
    const mkt = d.markets.find(m => m.id === inp.marketId)!;
    log(d, actor, 'NOTICE_PUBLISH', 'MarketNotice', `Published notice at ${mkt.name}: ${row.title}`, row.id);
    d.users.filter(u => u.active && u.id !== actor.id).forEach(u =>
      notify(d, u.id, `Notice at ${mkt.name}: ${row.title}`, mkt.id));
    return ok(row);
  });
}

export function deleteNotice(actor: User, noticeId: string): Result {
  const db = getDB();
  const row = db.notices.find(n => n.id === noticeId);
  if (!row) return fail('Notice not found.');
  if (actor.role !== 'admin' && row.authorId !== actor.id) return fail('You can remove only your own notices.');
  return mutate(d => {
    d.notices = d.notices.filter(n => n.id !== noticeId);
    log(d, actor, 'NOTICE_DELETE', 'MarketNotice', `Removed notice: ${row.title}`, row.id);
    return ok(undefined);
  });
}

/* ------------------------------------------------------------------ */
/* notifications                                                       */
/* ------------------------------------------------------------------ */

export function markAllRead(actor: User) {
  mutate(d => d.notifications.forEach(n => { if (n.userId === actor.id) n.read = true; }));
}

/* ------------------------------------------------------------------ */
/* admin                                                               */
/* ------------------------------------------------------------------ */

const assertAdmin = (u: User): string | null => (u.role === 'admin' ? null : 'Admin access required.');

export function adminSaveMarket(actor: User, inp: { id?: string; name: string; district: string; auctionTime: string }) {
  const err = assertAdmin(actor); if (err) return fail(err);
  if (inp.name.trim().length < 2) return fail('Market name is required.');
  return mutate(d => {
    if (inp.id) {
      const m = d.markets.find(x => x.id === inp.id)!;
      m.name = inp.name.trim(); m.district = inp.district.trim(); m.auctionTime = inp.auctionTime;
      log(d, actor, 'MARKET_UPDATE', 'Market', `Updated market ${m.name}`, m.id);
      return ok(m);
    }
    const m = { id: `m${Date.now()}`, name: inp.name.trim(), district: inp.district.trim(), auctionTime: inp.auctionTime, active: true };
    d.markets.push(m);
    d.configs.push({ marketId: m.id, mediumKg: 150, highKg: 350, veryHighKg: 700 });
    log(d, actor, 'MARKET_CREATE', 'Market', `Created market ${m.name}`, m.id);
    return ok(m);
  });
}

export function adminToggleMarket(actor: User, marketId: string) {
  const err = assertAdmin(actor); if (err) return fail(err);
  return mutate(d => {
    const m = d.markets.find(x => x.id === marketId); if (!m) return fail('Market not found.');
    m.active = !m.active;
    log(d, actor, 'MARKET_UPDATE', 'Market', `${m.active ? 'Activated' : 'Deactivated'} market ${m.name}`, m.id);
    return ok(m);
  });
}

export function adminSaveSpecies(actor: User, inp: { id?: string; name: string; unit: string; basePrice: number; localName?: string }) {
  const err = assertAdmin(actor); if (err) return fail(err);
  if (inp.name.trim().length < 2) return fail('Species name is required.');
  if (!Number.isFinite(inp.basePrice) || inp.basePrice < 10) return fail('Reference price must be at least ₹10.');
  return mutate(d => {
    if (inp.id) {
      const f = d.species.find(x => x.id === inp.id)!;
      f.name = inp.name.trim(); f.basePrice = Math.round(inp.basePrice);
      log(d, actor, 'SPECIES_UPDATE', 'FishSpecies', `Updated species ${f.name} (ref ${fmtINR(f.basePrice)}/kg)`, f.id);
      return ok(f);
    }
    const f = { id: `f${Date.now()}`, name: inp.name.trim(), localName: inp.localName?.trim() || undefined, unit: inp.unit || 'kg', basePrice: Math.round(inp.basePrice), active: true };
    d.species.push(f);
    log(d, actor, 'SPECIES_CREATE', 'FishSpecies', `Added species ${f.name}`, f.id);
    return ok(f);
  });
}

export function adminAssignBroker(actor: User, marketId: string, brokerUserId: string) {
  const err = assertAdmin(actor); if (err) return fail(err);
  const db = getDB();
  const b = userById(db, brokerUserId);
  if (!assertActive(b, 'broker')) return fail('Choose a valid broker.');
  const m = db.markets.find(x => x.id === marketId); if (!m) return fail('Choose a market.');
  if (db.marketBrokers.some(mb => mb.marketId === marketId && mb.brokerId === brokerUserId))
    return fail(`${b.name} is already assigned to ${m.name}.`);
  return mutate(d => {
    d.marketBrokers.push({ id: `mb${Date.now()}`, marketId, brokerId: brokerUserId, since: todayStr() });
    log(d, actor, 'BROKER_ASSIGN', 'MarketBroker', `Assigned ${b.name} to ${m.name}`);
    return ok(undefined);
  });
}

export function adminUnassignBroker(actor: User, mbId: string) {
  const err = assertAdmin(actor); if (err) return fail(err);
  return mutate(d => {
    const mb = d.marketBrokers.find(x => x.id === mbId); if (!mb) return fail('Assignment not found.');
    const b = userById(d, mb.brokerId); const m = d.markets.find(x => x.id === mb.marketId);
    d.marketBrokers = d.marketBrokers.filter(x => x.id !== mbId);
    log(d, actor, 'BROKER_UNASSIGN', 'MarketBroker', `Removed ${b?.name ?? 'broker'} from ${m?.name ?? 'market'}`);
    return ok(undefined);
  });
}

export function adminCreateUser(actor: User, inp: { name: string; phone: string; role: User['role']; note?: string }) {
  const err = assertAdmin(actor); if (err) return fail(err);
  if (inp.name.trim().length < 2) return fail('Name is required.');
  if (!/^\d{10}$/.test(inp.phone.trim())) return fail('Phone must be exactly 10 digits.');
  const db = getDB();
  if (db.users.some(u => u.phone === inp.phone.trim())) return fail('An account with this phone already exists.');
  return mutate(d => {
    const u: User = {
      id: `u${Date.now()}`, name: inp.name.trim(), phone: inp.phone.trim(), password: 'fish123',
      role: inp.role, active: true, note: inp.note?.trim() || undefined, createdAt: nowIso(),
    };
    d.users.push(u);
    log(d, actor, 'USER_CREATE', 'User', `Created ${inp.role} account for ${u.name}`, u.id);
    return ok(u);
  });
}

export function adminSetUserActive(actor: User, userId: string, active: boolean) {
  const err = assertAdmin(actor); if (err) return fail(err);
  if (userId === actor.id) return fail('You cannot deactivate your own account.');
  return mutate(d => {
    const u = userById(d, userId); if (!u) return fail('User not found.');
    u.active = active;
    log(d, actor, 'USER_UPDATE', 'User', `${active ? 'Activated' : 'Deactivated'} ${u.name} (${u.role})`, u.id);
    return ok(u);
  });
}

export function adminSaveConfig(actor: User, marketId: string, cfg: Omit<MarketConfig, 'marketId'>) {
  const err = assertAdmin(actor); if (err) return fail(err);
  const { mediumKg, highKg, veryHighKg } = cfg;
  if (![mediumKg, highKg, veryHighKg].every(n => Number.isFinite(n) && n > 0))
    return fail('Thresholds must be positive numbers.');
  if (!(mediumKg < highKg && highKg < veryHighKg))
    return fail('Thresholds must increase: medium < high < very high.');
  return mutate(d => {
    const m = d.markets.find(x => x.id === marketId); if (!m) return fail('Market not found.');
    const c = d.configs.find(x => x.marketId === marketId);
    if (c) Object.assign(c, cfg); else d.configs.push({ marketId, ...cfg });
    log(d, actor, 'CONFIG_UPDATE', 'MarketConfig', `${m.name} supply thresholds set: ${mediumKg} / ${highKg} / ${veryHighKg} kg`, marketId);
    return ok(undefined);
  });
}

/* ------------------------------------------------------------------ */
/* read selectors (aggregations & authorization-aware views)           */
/* ------------------------------------------------------------------ */

export interface SupplyRow {
  fishId: string; fishName: string; totalQty: number; sellers: number;
  level: SupplyLevel; confirmedKg: number;
}

export function levelForQty(cfg: MarketConfig | undefined, qty: number): SupplyLevel {
  if (!cfg) return qty >= 500 ? 'HIGH' : qty >= 150 ? 'MEDIUM' : 'LOW';
  if (qty >= cfg.veryHighKg) return 'VERY HIGH';
  if (qty >= cfg.highKg) return 'HIGH';
  if (qty >= cfg.mediumKg) return 'MEDIUM';
  return 'LOW';
}

/** Market-wide expected supply — cancelled intentions excluded, aggregated across ALL brokers. */
export function supplyByFish(db: DB, marketId: string, date: string): SupplyRow[] {
  const cfg = db.configs.find(c => c.marketId === marketId);
  const rows = db.intentions
    .filter(i => i.marketId === marketId && i.date === date && i.status !== 'cancelled')
    .reduce((map, i) => {
      const r = map.get(i.fishId) ?? { fishId: i.fishId, qty: 0, sellers: new Set<string>(), confirmedKg: 0 };
      r.qty += i.plannedQty;
      r.sellers.add(i.sellerId);
      if (i.confidence === 'confirmed') r.confirmedKg += i.plannedQty;
      map.set(i.fishId, r);
      return map;
    }, new Map<string, { fishId: string; qty: number; sellers: Set<string>; confirmedKg: number }>());
  return [...rows.values()]
    .map(r => ({
      fishId: r.fishId,
      fishName: db.species.find(f => f.id === r.fishId)?.name ?? '—',
      totalQty: r.qty, sellers: r.sellers.size, confirmedKg: r.confirmedKg,
      level: levelForQty(cfg, r.qty),
    }))
    .sort((a, b) => b.totalQty - a.totalQty);
}

export function marketSupplyTotalKg(db: DB, marketId: string, date: string): number {
  return supplyByFish(db, marketId, date).reduce((s, r) => s + r.totalQty, 0);
}

export function marketSellerCount(db: DB, marketId: string, date: string): number {
  return new Set(
    db.intentions.filter(i => i.marketId === marketId && i.date === date && i.status !== 'cancelled').map(i => i.sellerId),
  ).size;
}

export interface PriceRow {
  fishId: string; fishName: string; min: number; avg: number; max: number;
  totalKg: number; lots: number; value: number;
}

/** Prices computed from actual auction records, aggregated across ALL brokers of the market. */
export function priceStats(db: DB, marketId: string, date: string): PriceRow[] {
  const rows = db.auctions
    .filter(a => a.marketId === marketId && a.date === date)
    .reduce((map, a) => {
      const r = map.get(a.fishId) ?? { fishId: a.fishId, kg: 0, value: 0, lots: 0, min: Infinity, max: 0 };
      r.kg += a.qty; r.value += a.qty * a.pricePerKg; r.lots += 1;
      r.min = Math.min(r.min, a.pricePerKg); r.max = Math.max(r.max, a.pricePerKg);
      map.set(a.fishId, r);
      return map;
    }, new Map<string, { fishId: string; kg: number; value: number; lots: number; min: number; max: number }>());
  return [...rows.values()]
    .map(r => ({
      fishId: r.fishId, fishName: db.species.find(f => f.id === r.fishId)?.name ?? '—',
      min: r.min, avg: Math.round(r.value / r.kg), max: r.max,
      totalKg: r.kg, lots: r.lots, value: r.value,
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

export function marketTotals(db: DB, marketId: string, date: string) {
  const list = db.auctions.filter(a => a.marketId === marketId && a.date === date);
  return {
    lots: list.length,
    kg: list.reduce((s, a) => s + a.qty, 0),
    value: list.reduce((s, a) => s + a.qty * a.pricePerKg, 0),
    fishCount: new Set(list.map(a => a.fishId)).size,
  };
}

export function priceHistory(db: DB, marketId: string, fishId: string, days = 7) {
  const today = todayStr();
  const out: { date: string; avg: number | null; kg: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const lots = db.auctions.filter(a => a.marketId === marketId && a.fishId === fishId && a.date === date);
    const kg = lots.reduce((s, a) => s + a.qty, 0);
    const value = lots.reduce((s, a) => s + a.qty * a.pricePerKg, 0);
    out.push({ date, avg: kg > 0 ? Math.round(value / kg) : null, kg });
  }
  return out;
}

export function brokersOfMarket(db: DB, marketId: string): User[] {
  const ids = db.marketBrokers.filter(mb => mb.marketId === marketId).map(mb => mb.brokerId);
  return db.users.filter(u => ids.includes(u.id) && u.active);
}

export function marketsOfBroker(db: DB, brokerId: string) {
  const ids = brokerMarkets(db, brokerId);
  return db.markets.filter(m => ids.includes(m.id));
}

export interface TickerItem { marketName: string; fishName: string; price: number; qty: number; time: string; }

export function tickerItems(db: DB): TickerItem[] {
  return [...db.auctions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 14)
    .map(a => ({
      marketName: db.markets.find(m => m.id === a.marketId)?.name ?? '',
      fishName: db.species.find(f => f.id === a.fishId)?.name ?? '',
      price: a.pricePerKg, qty: a.qty, time: a.createdAt,
    }));
}

export function activeSellers(db: DB): User[] { return db.users.filter(u => u.role === 'seller' && u.active); }
export function activeBuyers(db: DB): User[] { return db.users.filter(u => u.role === 'buyer' && u.active); }
export function activeBrokers(db: DB): User[] { return db.users.filter(u => u.role === 'broker' && u.active); }

export const fishName = (db: DB, id: string) => db.species.find(f => f.id === id)?.name ?? '—';
export const userName = (db: DB, id: string | null) => (id ? db.users.find(u => u.id === id)?.name ?? '—' : 'Open lot');
export const marketName = (db: DB, id: string) => db.markets.find(m => m.id === id)?.name ?? '—';
