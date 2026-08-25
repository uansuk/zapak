import type {
  Auction, AuditLog, AppNotification, Confidence, DB, FishArrival, FishSpecies,
  IntentionStatus, Market, MarketBroker, MarketConfig, MarketNotice, Role,
  SellerIntention, User,
} from './types';
import { addDays, atTime, nowIso, todayStr } from './format';

/* Deterministic RNG so the demo is stable within a session */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260214);
const ri = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const rf = (min: number, max: number) => rnd() * (max - min) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

let seq = 0;
const id = (p: string) => `${p}${++seq}`;

export function buildSeed(): DB {
  seq = 0;
  const now = nowIso();
  const today = todayStr();
  const d = (n: number) => addDays(today, n);

  /* ---------- Users ---------- */
  const mkUser = (name: string, phone: string, role: Role, note?: string): User => ({
    id: id('u'), name, phone, password: 'fish123', role, active: true, note, createdAt: d(-30),
  });

  const admin = mkUser('Anita Sarkar', '9000000001', 'admin', 'Market Administrator');

  const khowaiBrokers = [
    mkUser('Bimal Das', '9000000021', 'broker', 'Khowai · Gate 1'),
    mkUser('Niranjan Saha', '9000000022', 'broker', 'Khowai · Gate 2'),
    mkUser('Pradip Debnath', '9000000023', 'broker', 'Khowai · Jetty shed'),
  ];
  const ranirBrokers = [
    mkUser('Subal Chandra', '9000000024', 'broker', 'Ranirbazar · North yard'),
    mkUser('Manik Bhattacharjee', '9000000025', 'broker', 'Ranirbazar · South yard'),
    mkUser('Ratan Das', '9000000026', 'broker', 'Ranirbazar · Gate 1'),
    mkUser('Anil Choudhury', '9000000027', 'broker', 'Ranirbazar · Gate 3'),
  ];
  const battalaBrokers = [
    mkUser('Gopal Sharma', '9000000028', 'broker', 'Battala · Hall A'),
    mkUser('Tapan Karmakar', '9000000029', 'broker', 'Battala · Hall B'),
  ];
  const brokers = [...khowaiBrokers, ...ranirBrokers, ...battalaBrokers];

  const sellers: User[] = [
    mkUser('Abdul Karim', '9000000010', 'seller', 'Rubber Nagar pond cluster'),
    mkUser('Sanjoy Debbarma', '9000000011', 'seller', 'Khowai UPFA farm'),
    mkUser('Ramesh Rudrapaul', '9000000012', 'seller', 'Khowai river catch'),
    mkUser('Bijoy Malakar', '9000000013', 'seller', 'Ranirbazar ponds'),
    mkUser('Sukumar Das', '9000000014', 'seller', 'Jirania beel'),
    mkUser('Anita Rani', '9000000015', 'seller', 'Bishalgarh farm'),
    mkUser('Prakash Jamatia', '9000000016', 'seller', 'Khowai UPFA farm'),
    mkUser('Nabin Chakma', '9000000017', 'seller', 'Tulashikhar ponds'),
    mkUser('Habibur Rahman', '9000000018', 'seller', 'Ranirbazar ponds'),
    mkUser('Lakshmi Rani', '9000000019', 'seller', 'Mohanpur farm'),
    mkUser('Mohan Tripura', '9000000040', 'seller', 'Battala catchers co-op'),
    mkUser('Dulal Das', '9000000041', 'seller', 'Haora river catch'),
  ];

  const buyers: User[] = [
    mkUser('Rajib Rahman', '9000000030', 'buyer', 'Retailer, Gol Bazar'),
    mkUser('Suman Ghosh', '9000000031', 'buyer', 'Wholesale, Krishnanagar'),
    mkUser('Papiya Das', '9000000032', 'buyer', 'Maa Laxmi Fish Corner'),
    mkUser('Bikash Dey', '9000000033', 'buyer', 'City Mart Agartala'),
    mkUser('Anjali Stores', '9000000034', 'buyer', 'Retail chain'),
    mkUser('Prakash Fish House', '9000000035', 'buyer', 'Wholesale'),
    mkUser('Mina Khatun', '9000000036', 'buyer', 'Retailer, Battala'),
    mkUser('Hotel Green Valley', '9000000037', 'buyer', 'Institutional buyer'),
  ];

  const users = [admin, ...brokers, ...sellers, ...buyers];
  const demoSeller = sellers[0];
  const demoBroker = khowaiBrokers[0];
  const demoBuyer = buyers[0];

  /* ---------- Markets ---------- */
  const markets: Market[] = [
    { id: id('m'), name: 'Khowai', district: 'Khowai district', auctionTime: '07:00', active: true },
    { id: id('m'), name: 'Ranirbazar', district: 'West Tripura', auctionTime: '06:30', active: true },
    { id: id('m'), name: 'Battala', district: 'Agartala', auctionTime: '07:30', active: true },
  ];
  const [khowai, ranir, battala] = markets;

  const marketBrokers: MarketBroker[] = [
    ...khowaiBrokers.map(b => ({ id: id('mb'), marketId: khowai.id, brokerId: b.id, since: d(-200) })),
    ...ranirBrokers.map(b => ({ id: id('mb'), marketId: ranir.id, brokerId: b.id, since: d(-180) })),
    ...battalaBrokers.map(b => ({ id: id('mb'), marketId: battala.id, brokerId: b.id, since: d(-120) })),
  ];

  const brokerIdsOf = (marketId: string) =>
    marketBrokers.filter(mb => mb.marketId === marketId).map(mb => mb.brokerId);

  /* ---------- Species ---------- */
  const sp = (name: string, basePrice: number, localName?: string): FishSpecies => ({
    id: id('f'), name, localName, unit: 'kg', basePrice, active: true,
  });
  const species: FishSpecies[] = [
    sp('Rohu', 230, 'Rui'), sp('Catla', 260), sp('Mrigal', 190),
    sp('Silver Carp', 150), sp('Pangas', 110), sp('Tilapia', 130),
    sp('Bata', 170), sp('Koi', 300), sp('Singhi', 330),
    sp('Magur', 360), sp('Golda Prawn', 520), sp('Hilsa', 420, 'Ilish'),
  ];
  const fishByName = (n: string) => species.find(s => s.name === n)!;
  const commonFish = [species[0], species[0], species[1], species[2], species[3], species[4], species[5], species[6]];

  const configs: MarketConfig[] = [
    { marketId: khowai.id, mediumKg: 250, highKg: 600, veryHighKg: 1200 },
    { marketId: ranir.id, mediumKg: 200, highKg: 500, veryHighKg: 1000 },
    { marketId: battala.id, mediumKg: 150, highKg: 350, veryHighKg: 700 },
  ];

  /* ---------- Intentions (planned supply) ---------- */
  const intentions: SellerIntention[] = [];
  const addIntention = (
    seller: User, marketId: string, fish: FishSpecies, date: string,
    plannedQty: number, confidence: Confidence, brokerId: string | null,
    status: IntentionStatus = 'active',
  ): SellerIntention => {
    const row: SellerIntention = {
      id: id('int'), sellerId: seller.id, marketId, fishId: fish.id, date,
      plannedQty, confidence, brokerId, status,
      createdAt: atTime(addDays(date, -ri(1, 2)), '18:30'), updatedAt: now,
    };
    intentions.push(row);
    return row;
  };

  // Random forward-looking intentions: today .. +3 days
  for (const mkt of markets) {
    const bIds = brokerIdsOf(mkt.id);
    for (const off of [0, 1, 2, 3]) {
      const count = ri(5, 9);
      for (let i = 0; i < count; i++) {
        const fish = pick(commonFish);
        const qty = fish.name === 'Rohu' ? ri(8, 40) * 10 : ri(3, 24) * 10;
        const r = rnd();
        const conf: Confidence = r < 0.5 ? 'confirmed' : r < 0.82 ? 'likely' : 'possible';
        const broker = rnd() < 0.72 ? pick(bIds) : null;
        addIntention(pick(sellers), mkt.id, fish, d(off), qty, conf, broker);
      }
    }
    // Past intentions — history for the demo seller and others
    for (const off of [-1, -2]) {
      for (let i = 0; i < 3; i++) {
        addIntention(pick(sellers), mkt.id, pick(commonFish), d(off), ri(4, 20) * 10,
          'confirmed', pick(bIds), rnd() < 0.75 ? 'fulfilled' : 'cancelled');
      }
    }
  }

  // Demo seller (Abdul Karim): guaranteed story across statuses & markets
  const demoIntYesterday = addIntention(demoSeller, khowai.id, fishByName('Rohu'), d(-1), 180, 'confirmed', demoBroker.id, 'fulfilled');
  addIntention(demoSeller, khowai.id, fishByName('Tilapia'), d(-1), 60, 'likely', null, 'cancelled');
  const demoIntentionToday = addIntention(demoSeller, khowai.id, fishByName('Rohu'), d(0), 120, 'confirmed', demoBroker.id);
  addIntention(demoSeller, khowai.id, fishByName('Catla'), d(1), 200, 'confirmed', demoBroker.id);
  addIntention(demoSeller, khowai.id, fishByName('Rohu'), d(1), 220, 'confirmed', demoBroker.id);
  addIntention(demoSeller, khowai.id, fishByName('Mrigal'), d(2), 140, 'likely', demoBroker.id);
  addIntention(demoSeller, ranir.id, fishByName('Silver Carp'), d(1), 90, 'possible', null);

  /* ---------- Arrivals (actual) + Auctions ---------- */
  const arrivals: FishArrival[] = [];
  const auctions: Auction[] = [];

  const addArrival = (
    marketId: string, brokerId: string, date: string, fish: FishSpecies,
    actualQty: number, sellerId: string | null, intentionId: string | null, hhmm: string,
  ): FishArrival => {
    const a: FishArrival = {
      id: id('ar'), marketId, brokerId, sellerId, intentionId, fishId: fish.id,
      date, actualQty, createdAt: atTime(date, hhmm),
    };
    arrivals.push(a);
    return a;
  };

  const addAuction = (arrival: FishArrival, buyerId: string, qty: number, price: number, hhmm: string) => {
    auctions.push({
      id: id('au'), arrivalId: arrival.id, marketId: arrival.marketId, brokerId: arrival.brokerId,
      fishId: arrival.fishId, buyerId, date: arrival.date, qty, pricePerKg: price,
      createdAt: atTime(arrival.date, hhmm),
    });
  };

  const roundPrice = (fish: FishSpecies, drift = 0) =>
    Math.max(40, Math.round((fish.basePrice * rf(0.9, 1.16) + drift) / 5) * 5);

  for (const mkt of markets) {
    const bIds = brokerIdsOf(mkt.id);
    // Past 6 days of trading
    for (const off of [-6, -5, -4, -3, -2, -1]) {
      const isYesterday = off === -1;
      const arrivalCount = isYesterday ? ri(7, 9) : ri(4, 6);
      for (let i = 0; i < arrivalCount; i++) {
        const fish = pick(commonFish);
        const qty = ri(4, 16) * 10;
        const ar = addArrival(mkt.id, pick(bIds), d(off), fish, qty, rnd() < 0.6 ? pick(sellers).id : null, null, `0${ri(6, 7)}:${pick(['10', '25', '40', '55'])}`);
        // Gentle upward drift over the week so history charts look alive
        const drift = off * -2;
        if (rnd() < 0.3 && qty > 60) {
          const q1 = Math.round(qty * 0.6 / 5) * 5;
          addAuction(ar, pick(buyers).id, q1, roundPrice(fish, drift), `0${ri(7, 8)}:${pick(['05', '20', '35', '50'])}`);
          addAuction(ar, pick(buyers).id, qty - q1, roundPrice(fish, drift), `0${ri(8, 9)}:${pick(['05', '20', '35', '50'])}`);
        } else {
          addAuction(ar, pick(buyers).id, qty, roundPrice(fish, drift), `0${ri(7, 9)}:${pick(['05', '20', '35', '50'])}`);
        }
      }
    }
    // Today: early-morning trade so the board feels live
    for (let i = 0; i < ri(2, 3); i++) {
      const fish = pick(commonFish);
      const qty = ri(3, 9) * 10;
      const ar = addArrival(mkt.id, pick(bIds), d(0), fish, qty, rnd() < 0.5 ? pick(sellers).id : null, null, `06:${pick(['40', '50'])}`);
      addAuction(ar, pick(buyers).id, qty, roundPrice(fish), `0${ri(7, 8)}:${pick(['05', '15', '25', '35', '45', '55'])}`);
    }
  }

  // Demo broker (Bimal Das) guaranteed activity today + yesterday
  const arB1 = addArrival(khowai.id, demoBroker.id, d(0), fishByName('Rohu'), 175, demoSeller.id, demoIntentionToday.id, '06:45');
  demoIntentionToday.status = 'fulfilled'; // arrival recorded against the registration
  addAuction(arB1, demoBuyer.id, 100, roundPrice(fishByName('Rohu')), '07:20');
  const arB2 = addArrival(khowai.id, demoBroker.id, d(0), fishByName('Pangas'), 80, null, null, '06:50');
  const arB3 = addArrival(khowai.id, demoBroker.id, d(-1), fishByName('Rohu'), 185, demoSeller.id, demoIntYesterday.id, '06:40');
  addAuction(arB3, demoBuyer.id, 185, roundPrice(fishByName('Rohu')), '07:15');
  addAuction(arB2, demoBuyer.id, 45, roundPrice(fishByName('Pangas')), '07:35');

  /* ---------- Notices ---------- */
  const notices: MarketNotice[] = [];
  const notice = (marketId: string, authorId: string, authorRole: Role, title: string, body: string, daysAgo: number, pinned = false) => {
    notices.push({ id: id('nt'), marketId, authorId, authorRole: authorRole, title, body, pinned, createdAt: atTime(d(-daysAgo), '17:15' ) });
  };
  notice(khowai.id, admin.id, 'admin', 'Weigh-in rules tightened', 'All carts must weigh in at Gate 1 counter at least 30 minutes before the 7:00 AM bell. Late lots auction last.', 3, true);
  notice(khowai.id, demoBroker.id, 'broker', 'Ice now available at the jetty shed', 'Crushed ice ₹40/slab from 5:30 AM. Bring your own crates to speed up loading.', 1);
  notice(khowai.id, khowaiBrokers[1].id, 'broker', 'Strong Hilsa arrivals expected', 'Boats from Kamalpur reported good catch — expect fresh Hilsa lots this week.', 2);
  notice(ranir.id, ranirBrokers[0].id, 'broker', 'Auction bell moved to 6:30 AM', 'From this week the first bell rings 6:30 AM sharp. Wholesale buyers please arrive early.', 2, true);
  notice(ranir.id, admin.id, 'admin', 'Drain cleaning — south yard', 'South yard stays closed tomorrow for drain cleaning. All Ranirbazar lots will auction in the north yard.', 1);
  notice(battala.id, battalaBrokers[0].id, 'broker', 'Hall B roof repair done', 'Hall B reopens tomorrow. Golda prawn lots will move back to Hall B from 7:30 AM.', 1, true);
  notice(battala.id, admin.id, 'admin', 'Sunday market holiday', 'Battala fish market remains closed this Sunday for monthly cleaning.', 4);

  /* ---------- Notifications for demo users ---------- */
  const notifications: AppNotification[] = [
    { id: id('no'), userId: demoSeller.id, marketId: khowai.id, text: 'Notice at Khowai: Weigh-in rules tightened', read: false, createdAt: atTime(d(-1), '09:10') },
    { id: id('no'), userId: demoSeller.id, marketId: khowai.id, text: 'Your Rohu registration for yesterday was marked arrived (185 kg, Bimal Das)', read: false, createdAt: atTime(d(-1), '07:00') },
    { id: id('no'), userId: demoBroker.id, marketId: khowai.id, text: '2 sellers registered Rohu for tomorrow preferring your desk (420 kg)', read: false, createdAt: atTime(d(0), '06:20') },
    { id: id('no'), userId: demoBuyer.id, marketId: khowai.id, text: "Yesterday's price bulletin is live for Khowai", read: false, createdAt: atTime(d(0), '08:00') },
  ];

  /* ---------- Audit ---------- */
  const audit: AuditLog[] = [
    { id: id('al'), at: atTime(d(-3), '10:02'), actorId: admin.id, actorName: admin.name, role: 'admin', action: 'CONFIG_UPDATE', entity: 'MarketConfig', entityId: khowai.id, message: 'Khowai supply thresholds set: 250 / 600 / 1200 kg' },
    { id: id('al'), at: atTime(d(-2), '17:15'), actorId: admin.id, actorName: admin.name, role: 'admin', action: 'NOTICE_PUBLISH', entity: 'MarketNotice', message: 'Published notice at Khowai: Weigh-in rules tightened' },
    { id: id('al'), at: atTime(d(-1), '06:40'), actorId: demoBroker.id, actorName: demoBroker.name, role: 'broker', action: 'ARRIVAL_CREATE', entity: 'FishArrival', message: `Recorded Rohu arrival 185 kg for ${demoSeller.name} at Khowai` },
    { id: id('al'), at: atTime(d(-1), '07:15'), actorId: demoBroker.id, actorName: demoBroker.name, role: 'broker', action: 'AUCTION_CREATE', entity: 'Auction', message: `Auctioned 185 kg Rohu to ${demoBuyer.name} at Khowai` },
    { id: id('al'), at: atTime(d(-1), '19:42'), actorId: demoSeller.id, actorName: demoSeller.name, role: 'seller', action: 'INTENTION_CREATE', entity: 'SellerIntention', message: `Registered 220 kg Rohu for ${d(1)} at Khowai (preferred broker: Bimal Das)` },
  ];

  return {
    seededAt: now, users, markets, marketBrokers, species,
    intentions, arrivals, auctions, notices, notifications, configs, audit,
  };
}
