import { useEffect, useState } from 'react';
import type { DB } from './types';
import { buildSeed } from './seed';

const DB_KEY = 'machhbazar_db_v3';
const SESSION_KEY = 'machhbazar_session_v3';

let cache: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB | null {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DB;
    if (!parsed.users || !parsed.markets || !parsed.auctions) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(db: DB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* storage full — keep in-memory copy */
  }
}

function bump() {
  listeners.forEach(fn => fn());
}

export function getDB(): DB {
  if (!cache) {
    cache = load();
    if (!cache) {
      cache = buildSeed();
      persist(cache);
    }
  }
  return cache;
}

/** Run a mutation against the DB, persist, notify subscribers. */
export function mutate<T>(fn: (db: DB) => T): T {
  const db = getDB();
  const result = fn(db);
  persist(db);
  bump();
  return result;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Re-render hook: bumps whenever the DB changes. */
export function useDBVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => subscribe(() => setV(x => x + 1)), []);
  return v;
}

/* ---------- Session ---------- */

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(userId: string | null) {
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
  bump();
}

/** Wipe and reseed (demo utility). */
export function resetDemoData() {
  cache = buildSeed();
  persist(cache);
  bump();
}
