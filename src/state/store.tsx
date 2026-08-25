import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getDB, useDBVersion } from '../lib/db';
import { sessionUser } from '../lib/api';
import type { DB, User } from '../lib/types';

interface Store {
  db: DB;
  user: User | null;
  version: number;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const version = useDBVersion();
  const value = useMemo<Store>(() => {
    const db = getDB();
    return { db, user: sessionUser(), version };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export function homeFor(role: User['role']): string {
  switch (role) {
    case 'seller': return '/seller';
    case 'broker': return '/broker';
    case 'buyer': return '/buyer';
    case 'admin': return '/admin';
  }
}
