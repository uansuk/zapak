export type Role = 'seller' | 'broker' | 'buyer' | 'admin';
export type Confidence = 'confirmed' | 'likely' | 'possible';
export type IntentionStatus = 'active' | 'fulfilled' | 'cancelled';
export type SupplyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH';

export interface User {
  id: string;
  name: string;
  phone: string;
  password: string;
  role: Role;
  active: boolean;
  note?: string;
  createdAt: string;
}

export interface Market {
  id: string;
  name: string;
  district: string;
  auctionTime: string; // "07:00"
  active: boolean;
}

export interface MarketBroker {
  id: string;
  marketId: string;
  brokerId: string;
  since: string;
}

export interface FishSpecies {
  id: string;
  name: string;
  localName?: string;
  unit: string; // kg
  basePrice: number; // reference ₹/kg
  active: boolean;
}

/** Planned supply. NEVER mutated by auction data. */
export interface SellerIntention {
  id: string;
  sellerId: string;
  marketId: string;
  fishId: string;
  date: string; // YYYY-MM-DD
  plannedQty: number; // kg (planned, separate from actual)
  confidence: Confidence;
  brokerId: string | null; // optional preferred broker
  status: IntentionStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** Actual physical arrival recorded by a broker. Separate from planned qty. */
export interface FishArrival {
  id: string;
  marketId: string;
  brokerId: string;
  sellerId: string | null;
  intentionId: string | null;
  fishId: string;
  date: string;
  actualQty: number; // kg (actual)
  note?: string;
  createdAt: string;
}

export interface Auction {
  id: string;
  arrivalId: string;
  marketId: string;
  brokerId: string;
  fishId: string;
  buyerId: string;
  date: string;
  qty: number; // kg sold in this lot
  pricePerKg: number; // ₹/kg
  createdAt: string;
}

export interface MarketNotice {
  id: string;
  marketId: string;
  authorId: string;
  authorRole: Role;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  marketId: string | null;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface MarketConfig {
  marketId: string;
  mediumKg: number;
  highKg: number;
  veryHighKg: number;
}

export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  role: Role | 'system';
  action: string;
  entity: string;
  entityId?: string;
  message: string;
}

export interface DB {
  seededAt: string;
  users: User[];
  markets: Market[];
  marketBrokers: MarketBroker[];
  species: FishSpecies[];
  intentions: SellerIntention[];
  arrivals: FishArrival[];
  auctions: Auction[];
  notices: MarketNotice[];
  notifications: AppNotification[];
  configs: MarketConfig[];
  audit: AuditLog[];
}

export type Result<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
