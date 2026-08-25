import { useMemo, useState } from 'react';
import { Shell, Guard } from '../components/layout';
import { Badge, Button, Card, CountUp, Empty, Icon, Input, Label, Reveal, Select, Stat, toast } from '../components/ui';
import { useStore } from '../state/store';
import {
  adminAssignBroker, adminCreateUser, adminSaveConfig, adminSaveMarket, adminSaveSpecies,
  adminSetUserActive, adminToggleMarket, adminUnassignBroker, brokersOfMarket,
} from '../lib/api';
import type { Market, Role, User } from '../lib/types';
import { fmtINR, timeAgo } from '../lib/format';

type Tab = 'markets' | 'brokers' | 'users' | 'species' | 'audit';
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'markets', label: 'Markets', icon: 'store' },
  { id: 'brokers', label: 'Brokers', icon: 'users' },
  { id: 'users', label: 'Users', icon: 'shield' },
  { id: 'species', label: 'Fish species', icon: 'fish' },
  { id: 'audit', label: 'Audit log', icon: 'clipboard' },
];

function AdminConsole() {
  const { db, user } = useStore();
  const me = user!;
  const [tab, setTab] = useState<Tab>('markets');

  const weekIntentions = db.intentions.filter(i => i.status !== 'cancelled').length;

  return (
    <Shell title="Admin console" crumb="Admin · network management">
      <div className="rise mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Admin console</p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] text-ink leading-tight mt-1">The whole network, one desk</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Markets" value={db.markets.length} sub={`${db.markets.filter(m => m.active).length} active`} delay={1} />
        <Stat label="Users" value={db.users.length} sub={`${db.users.filter(u => u.role === 'broker').length} brokers · ${db.users.filter(u => u.role === 'seller').length} sellers · ${db.users.filter(u => u.role === 'buyer').length} buyers`} delay={2} />
        <Stat label="Registrations" value={<CountUp to={weekIntentions} />} sub="all non-cancelled intentions" delay={3} />
        <Stat label="Audit entries" value={db.audit.length} sub="every important change logged" accent delay={4} />
      </div>

      <div className="rise rise-2 flex gap-1 mt-6 overflow-x-auto scroll-thin border-b border-line">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 h-11 text-[13px] font-bold whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${tab === t.id ? 'border-sea text-sea' : 'border-transparent text-mist hover:text-ink'}`}>
            <Icon name={t.icon as never} size={15} />{t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'markets' && <MarketsTab me={me} />}
        {tab === 'brokers' && <BrokersTab me={me} />}
        {tab === 'users' && <UsersTab me={me} />}
        {tab === 'species' && <SpeciesTab me={me} />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </Shell>
  );
}

/* ---------------- markets + thresholds ---------------- */

function MarketRow({ m, me }: { m: Market; me: User }) {
  const { db } = useStore();
  const cfg = db.configs.find(c => c.marketId === m.id);
  const [name, setName] = useState(m.name);
  const [district, setDistrict] = useState(m.district);
  const [auctionTime, setAuctionTime] = useState(m.auctionTime);
  const [med, setMed] = useState(String(cfg?.mediumKg ?? 150));
  const [high, setHigh] = useState(String(cfg?.highKg ?? 350));
  const [vh, setVh] = useState(String(cfg?.veryHighKg ?? 700));
  const brokers = brokersOfMarket(db, m.id);

  return (
    <Reveal>
      <div className={`bg-paper border border-line rounded-xl p-4 sm:p-5 ${m.active ? '' : 'opacity-65'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-deep text-amber flex items-center justify-center"><Icon name="store" size={16} /></span>
            <div>
              <p className="font-display font-extrabold text-lg text-ink leading-none">{m.name}</p>
              <p className="text-[12px] text-mist mt-1">{brokers.length} brokers · bell {m.auctionTime} AM</p>
            </div>
          </div>
          <Badge tone={m.active ? 'kelp' : 'coral'}>{m.active ? 'active' : 'inactive'}</Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist">Market details</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label>Auction time</Label><Input type="time" value={auctionTime} onChange={e => setAuctionTime(e.target.value)} /></div>
            </div>
            <div><Label>District</Label><Input value={district} onChange={e => setDistrict(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button size="sm" icon="check" onClick={() => {
                const res = adminSaveMarket(me, { id: m.id, name, district, auctionTime });
                toast(res.ok ? 'Market saved.' : (res as { error: string }).error, res.ok ? 'ok' : 'err');
              }}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => {
                const res = adminToggleMarket(me, m.id);
                toast(res.ok ? `Market ${res.ok && res.data.active ? 'activated' : 'deactivated'}.` : 'Failed', res.ok ? 'ok' : 'err');
              }}>{m.active ? 'Deactivate' : 'Activate'}</Button>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist">Supply thresholds (kg/day) → LOW / MEDIUM / HIGH / VERY HIGH</p>
            <div className="grid grid-cols-3 gap-2.5">
              <div><Label>Medium ≥</Label><Input type="number" value={med} onChange={e => setMed(e.target.value)} /></div>
              <div><Label>High ≥</Label><Input type="number" value={high} onChange={e => setHigh(e.target.value)} /></div>
              <div><Label>Very high ≥</Label><Input type="number" value={vh} onChange={e => setVh(e.target.value)} /></div>
            </div>
            <Button size="sm" variant="dark" icon="settings" onClick={() => {
              const res = adminSaveConfig(me, m.id, { mediumKg: Number(med), highKg: Number(high), veryHighKg: Number(vh) });
              toast(res.ok ? `${m.name} thresholds updated.` : (res as { error: string }).error, res.ok ? 'ok' : 'err');
            }}>Save thresholds</Button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function MarketsTab({ me }: { me: User }) {
  const { db } = useStore();
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [auctionTime, setAuctionTime] = useState('07:00');
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {db.markets.map(m => <MarketRow key={m.id} m={m} me={me} />)}
      </div>
      <Card title="Add a market" sub="New markets start with default supply thresholds 150 / 350 / 700 kg">
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div><Label>Market name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mohanpur" /></div>
          <div><Label>District</Label><Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="West Tripura" /></div>
          <div><Label>Auction time</Label><Input type="time" value={auctionTime} onChange={e => setAuctionTime(e.target.value)} /></div>
          <Button icon="plus" onClick={() => {
            const res = adminSaveMarket(me, { name, district, auctionTime });
            if (!res.ok) { toast(res.error, 'err'); return; }
            toast(`Market ${name} created.`); setName(''); setDistrict('');
          }}>Create market</Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- brokers ---------------- */

function BrokersTab({ me }: { me: User }) {
  const { db } = useStore();
  const [marketId, setMarketId] = useState(db.markets[0]?.id ?? '');
  const [brokerId, setBrokerId] = useState('');
  const allBrokers = db.users.filter(u => u.role === 'broker' && u.active);

  return (
    <div className="space-y-4">
      <Card title="Assign a broker to a market" sub="A market can have many brokers; a broker can cover several markets">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Market</Label>
            <Select value={marketId} onChange={e => setMarketId(e.target.value)}>
              {db.markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Broker</Label>
            <Select value={brokerId} onChange={e => setBrokerId(e.target.value)}>
              <option value="">Choose broker…</option>
              {allBrokers.map(b => <option key={b.id} value={b.id}>{b.name} · {b.phone}</option>)}
            </Select>
          </div>
          <Button icon="check" onClick={() => {
            if (!brokerId) { toast('Pick a broker first.', 'err'); return; }
            const res = adminAssignBroker(me, marketId, brokerId);
            toast(res.ok ? 'Broker assigned.' : (res as { error: string }).error, res.ok ? 'ok' : 'err');
            if (res.ok) setBrokerId('');
          }}>Assign</Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {db.markets.map(m => {
          const list = brokersOfMarket(db, m.id);
          return (
            <Card key={m.id} title={m.name} sub={`${list.length} brokers`} pad={false}>
              {list.length === 0 ? <Empty icon="users" title="No brokers yet" /> : (
                <ul className="divide-y divide-linesoft">
                  {list.map(b => {
                    const mb = db.marketBrokers.find(x => x.marketId === m.id && x.brokerId === b.id)!;
                    return (
                      <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-foam/50 transition-colors">
                        <div>
                          <p className="font-bold text-[13.5px] text-ink">{b.name}</p>
                          <p className="text-[11.5px] num text-mist">{b.phone}{b.note ? ` · ${b.note}` : ''}</p>
                        </div>
                        <button
                          onClick={() => {
                            const res = adminUnassignBroker(me, mb.id);
                            toast(res.ok ? `${b.name} removed from ${m.name}.` : (res as { error: string }).error, res.ok ? 'ok' : 'err');
                          }}
                          className="p-1.5 rounded-lg text-mist hover:text-coralink hover:bg-coralsoft transition-colors cursor-pointer" title="Remove from market"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- users ---------------- */

function UsersTab({ me }: { me: User }) {
  const { db } = useStore();
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('seller');
  const [note, setNote] = useState('');

  const rows = db.users.filter(u => roleFilter === 'all' || u.role === roleFilter)
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  const roleTone = (r: Role) => (r === 'admin' ? 'coral' : r === 'broker' ? 'amber' : r === 'seller' ? 'sea' : 'kelp') as 'coral' | 'amber' | 'sea' | 'kelp';

  return (
    <div className="space-y-4">
      <Card title="Create a user" sub="New accounts sign in with the default demo password “fish123”">
        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <div><Label>Full name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kamal Das" /></div>
          <div><Label>Phone (10 digits)</Label><Input inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={e => setRole(e.target.value as Role)}>
              <option value="seller">Seller / farmer</option>
              <option value="broker">Broker</option>
              <option value="buyer">Buyer</option>
            </Select>
          </div>
          <div><Label hint="optional">Note</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="village / shop" /></div>
          <Button icon="plus" onClick={() => {
            const res = adminCreateUser(me, { name, phone, role, note });
            if (!res.ok) { toast(res.error, 'err'); return; }
            toast(`${role} account created for ${name}.`); setName(''); setPhone(''); setNote('');
          }}>Create</Button>
        </div>
      </Card>

      <Card
        title="All users" sub={`${rows.length} shown`}
        action={
          <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value as 'all' | Role)} className="!h-8 !w-32 !text-xs">
            <option value="all">All roles</option>
            <option value="seller">Sellers</option>
            <option value="broker">Brokers</option>
            <option value="buyer">Buyers</option>
            <option value="admin">Admins</option>
          </Select>
        }
        pad={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                <th className="font-bold px-4 py-2">Name</th>
                <th className="font-bold px-2 py-2">Phone</th>
                <th className="font-bold px-2 py-2">Role</th>
                <th className="font-bold px-2 py-2">Note</th>
                <th className="font-bold px-4 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className={`border-t border-linesoft hover:bg-foam/50 transition-colors ${u.active ? '' : 'opacity-55'}`}>
                  <td className="px-4 py-2.5 font-bold text-ink">{u.name}</td>
                  <td className="px-2 py-2.5 num text-mist">{u.phone}</td>
                  <td className="px-2 py-2.5"><Badge tone={roleTone(u.role)}>{u.role}</Badge></td>
                  <td className="px-2 py-2.5 text-[12.5px] text-mist">{u.note ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {u.id === me.id ? <Badge tone="outline">you</Badge> : (
                      <button
                        onClick={() => {
                          const res = adminSetUserActive(me, u.id, !u.active);
                          toast(res.ok ? `${u.name} ${u.active ? 'deactivated' : 'activated'}.` : (res as { error: string }).error, res.ok ? 'ok' : 'err');
                        }}
                        className={`text-[12px] font-bold px-2.5 py-1 rounded-md cursor-pointer transition-colors ${u.active ? 'text-kelpink bg-kelpsoft hover:bg-kelp hover:text-white' : 'text-coralink bg-coralsoft hover:bg-coral hover:text-white'}`}
                      >
                        {u.active ? 'Active — click to disable' : 'Disabled — click to enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- species ---------------- */

function SpeciesTab({ me }: { me: User }) {
  const { db } = useStore();
  const [name, setName] = useState('');
  const [localName, setLocalName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const avgOf = (fishId: string) => {
    const lots = db.auctions.filter(a => a.fishId === fishId);
    if (lots.length === 0) return null;
    return Math.round(lots.reduce((s, a) => s + a.qty * a.pricePerKg, 0) / lots.reduce((s, a) => s + a.qty, 0));
  };

  return (
    <div className="space-y-4">
      <Card title="Add a species">
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chital" /></div>
          <div><Label hint="optional">Local name</Label><Input value={localName} onChange={e => setLocalName(e.target.value)} /></div>
          <div><Label>Reference price ₹/kg</Label><Input type="number" min={10} value={basePrice} onChange={e => setBasePrice(e.target.value)} /></div>
          <Button icon="plus" onClick={() => {
            const res = adminSaveSpecies(me, { name, unit: 'kg', basePrice: Number(basePrice), localName });
            if (!res.ok) { toast(res.error, 'err'); return; }
            toast(`${name} added to the species list.`); setName(''); setLocalName(''); setBasePrice('');
          }}>Add species</Button>
        </div>
      </Card>

      <Card title="Species & reference prices" sub="Reference price seeds broker price suggestions; market prices always come from auction records" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-mist text-left bg-foam/60">
                <th className="font-bold px-4 py-2">Species</th>
                <th className="font-bold px-2 py-2 text-right">Reference ₹/kg</th>
                <th className="font-bold px-2 py-2 text-right">Auction avg</th>
                <th className="font-bold px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.species.map(f => {
                const avg = avgOf(f.id);
                return (
                  <tr key={f.id} className="border-t border-linesoft hover:bg-foam/50 transition-colors">
                    <td className="px-4 py-2.5">
                      {editingId === f.id ? (
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="!h-8 !w-40" />
                      ) : (
                        <span className="font-display font-bold text-ink">{f.name}{f.localName && <span className="text-mist font-body font-medium text-[12px]"> ({f.localName})</span>}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {editingId === f.id ? (
                        <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="!h-8 !w-24 ml-auto" />
                      ) : (
                        <span className="num font-semibold">{fmtINR(f.basePrice)}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right num text-mist">{avg ? fmtINR(avg) : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {editingId === f.id ? (
                        <div className="inline-flex gap-1.5">
                          <Button size="sm" variant="dark" icon="check" onClick={() => {
                            const res = adminSaveSpecies(me, { id: f.id, name: editName, unit: f.unit, basePrice: Number(editPrice) });
                            toast(res.ok ? 'Species updated.' : (res as { error: string }).error, res.ok ? 'ok' : 'err');
                            if (res.ok) setEditingId(null);
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" icon="edit" onClick={() => { setEditingId(f.id); setEditName(f.name); setEditPrice(String(f.basePrice)); }}>Edit</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- audit ---------------- */

function AuditTab() {
  const { db } = useStore();
  const [entity, setEntity] = useState('all');
  const entities = useMemo(() => [...new Set(db.audit.map(a => a.entity))], [db.audit]);
  const rows = db.audit.filter(a => entity === 'all' || a.entity === entity).slice(0, 60);
  const actionTone = (a: string) =>
    a.includes('CANCEL') || a.includes('DELETE') ? 'coral' : a.includes('CREATE') || a.includes('PUBLISH') ? 'kelp' : a.includes('UPDATE') || a.includes('ASSIGN') ? 'amber' : 'slate';

  return (
    <Card
      title="Audit log" sub="Server-side record of every important change"
      action={
        <Select value={entity} onChange={e => setEntity(e.target.value)} className="!h-8 !w-40 !text-xs">
          <option value="all">All entities</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </Select>
      }
      pad={false}
    >
      {rows.length === 0 ? <Empty icon="clipboard" title="No entries" /> : (
        <ul className="divide-y divide-linesoft max-h-[560px] overflow-y-auto">
          {rows.map(a => (
            <li key={a.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-foam/50 transition-colors">
              <span className="num text-[11px] text-mist w-24 shrink-0">{timeAgo(a.at)}</span>
              <Badge tone={actionTone(a.action) as never}>{a.action}</Badge>
              <span className="text-[13px] text-ink flex-1 min-w-[200px]">{a.message}</span>
              <span className="text-[11.5px] num text-mist">{a.actorName} · {a.role}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AdminGuarded() {
  return <Guard role="admin"><AdminConsole /></Guard>;
}
