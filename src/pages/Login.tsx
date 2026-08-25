import { useState, type FormEvent } from 'react';
import { Shell } from '../components/layout';
import { Button, Icon, Input, Label, toast } from '../components/ui';
import { login } from '../lib/api';
import { navigate } from '../router';
import { homeFor, useStore } from '../state/store';

const demoAccounts = [
  { role: 'Seller', name: 'Abdul Karim', phone: '9000000010', desc: 'Registers expected supply, tracks own fish', icon: 'scale' },
  { role: 'Broker', name: 'Bimal Das', phone: '9000000021', desc: 'Records arrivals & auction results at Khowai', icon: 'gavel' },
  { role: 'Buyer', name: 'Rajib Rahman', phone: '9000000030', desc: 'Watches supply, prices and auction results', icon: 'tag' },
  { role: 'Admin', name: 'Anita Sarkar', phone: '9000000001', desc: 'Manages markets, users and thresholds', icon: 'shield' },
];

export default function Login() {
  const { user } = useStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <Shell title="Sign in">
        <div className="max-w-md mx-auto text-center py-16">
          <p className="font-display font-bold text-xl text-ink">You are already signed in as {user.name}.</p>
          <Button className="mt-4" icon="arrow-right" onClick={() => navigate(homeFor(user.role))}>Go to my dashboard</Button>
        </div>
      </Shell>
    );
  }

  const doLogin = (ph: string, pw: string) => {
    setBusy(true);
    setTimeout(() => {
      const res = login(ph, pw);
      setBusy(false);
      if (!res.ok) { toast(res.error, 'err'); return; }
      toast(`Welcome back, ${res.data.name.split(' ')[0]}!`);
      navigate(homeFor(res.data.role));
    }, 350);
  };

  const submit = (e: FormEvent) => { e.preventDefault(); doLogin(phone, password); };

  return (
    <Shell title="Sign in">
      <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-6 items-start">
        <div className="rise">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sea">Role-based sign in</p>
          <h1 className="font-display font-extrabold text-3xl text-ink leading-tight mt-1.5">
            One board.<br />Four seats at the market.
          </h1>
          <p className="text-sm text-mist mt-3 leading-relaxed max-w-sm">
            Sellers register expected supply, brokers record physical auction results, buyers watch prices, and the admin keeps the network running. Every role sees only what it should.
          </p>
          <div className="board-deep rounded-xl p-4 mt-5 text-foam/80 text-[13px] leading-relaxed max-w-sm">
            <p className="text-amber font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5"><Icon name="shield" size={13} />Privacy rules</p>
            Seller names, phones and individual quantities never appear on public or cross-broker views. Market supply is shown as totals only.
          </div>
        </div>

        <div className="rise rise-2 bg-paper border border-line rounded-2xl shadow-lg shadow-deep/10 p-5 sm:p-6">
          <h2 className="font-display font-bold text-lg text-ink">Sign in</h2>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <Label>Phone number</Label>
              <Input inputMode="numeric" placeholder="10-digit mobile" value={phone} maxLength={10}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} required />
            </div>
            <div>
              <Label hint="demo password: fish123">Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy} icon="arrow-right">
              {busy ? 'Checking…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-linesoft">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist mb-2.5">One-tap demo accounts</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {demoAccounts.map(a => (
                <button key={a.phone} onClick={() => { setPhone(a.phone); setPassword('fish123'); doLogin(a.phone, 'fish123'); }}
                  className="group text-left rounded-xl border border-line bg-white p-3 hover:border-sea hover:shadow-md transition-all cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-deep text-amber flex items-center justify-center"><Icon name={a.icon as never} size={14} /></span>
                    <span className="font-display font-bold text-[13.5px] text-ink">{a.role}</span>
                  </span>
                  <span className="block text-[12px] font-semibold text-sea mt-1.5 num">{a.name} · {a.phone}</span>
                  <span className="block text-[11.5px] text-mist mt-0.5 leading-snug">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
