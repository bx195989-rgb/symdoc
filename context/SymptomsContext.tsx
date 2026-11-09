import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LogEntry } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import {
  deleteEntryFromCloud,
  pullCloudEntries,
  pushAllEntriesToCloud,
  pushEntryToCloud,
} from '@/lib/syncEntries';

const STORAGE_KEY = 'symptom-tracker-logs';

type NewEntry = Omit<LogEntry, 'id' | 'loggedAt'>;

type EntryUpdate = Partial<Omit<LogEntry, 'id'>>;

type SymptomsContextType = {
  entries: LogEntry[];
  loading: boolean;
  addEntries: (entries: NewEntry[], loggedAt?: string) => Promise<LogEntry[]>;
  updateEntry: (id: string, updates: EntryUpdate) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
};

const SymptomsContext = createContext<SymptomsContextType | undefined>(undefined);

export function SymptomsProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const patientIdRef = useRef<string | null>(null);

  async function persist(next: LogEntry[]) {
    setEntries(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save symptom logs', e);
    }
  }

  // Merge local entries with a signed-in patient's cloud backup: anything only in
  // the cloud gets pulled down (e.g. after reinstalling), anything only local gets
  // pushed up. Local storage stays the source of truth for what the UI shows.
  async function syncWithCloud(patientId: string) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const local: LogEntry[] = raw ? JSON.parse(raw) : [];
      const cloud = await pullCloudEntries(patientId);

      const byId = new Map<string, LogEntry>();
      cloud.forEach((e) => byId.set(e.id, e));
      local.forEach((e) => {
        if (!byId.has(e.id)) byId.set(e.id, e);
      });
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      );
      await persist(merged);

      const localOnly = local.filter((e) => !cloud.some((c) => c.id === e.id));
      if (localOnly.length) await pushAllEntriesToCloud(localOnly, patientId);
    } catch (e) {
      console.warn('Cloud sync failed', e);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setEntries(JSON.parse(raw));
      } catch (e) {
        console.warn('Failed to load symptom logs', e);
      } finally {
        setLoading(false);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? null;
      patientIdRef.current = uid;
      if (uid) await syncWithCloud(uid);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        patientIdRef.current = session.user.id;
        syncWithCloud(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        patientIdRef.current = null;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function addEntries(newEntries: NewEntry[], loggedAt?: string): Promise<LogEntry[]> {
    const timestamp = loggedAt ?? new Date().toISOString();
    const withIds: LogEntry[] = newEntries.map((e) => ({
      ...e,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      loggedAt: timestamp,
    }));
    await persist([...withIds, ...entries]);

    const patientId = patientIdRef.current;
    if (patientId) {
      withIds.forEach((e) => {
        pushEntryToCloud(e, patientId).catch((err) => console.warn('Cloud sync push failed', err));
      });
    }
    return withIds;
  }

  async function updateEntry(id: string, updates: EntryUpdate) {
    const next = entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    await persist(next);

    const patientId = patientIdRef.current;
    if (patientId) {
      const updated = next.find((e) => e.id === id);
      if (updated) {
        pushEntryToCloud(updated, patientId).catch((err) => console.warn('Cloud sync push failed', err));
      }
    }
  }

  async function deleteEntry(id: string) {
    await persist(entries.filter((e) => e.id !== id));

    const patientId = patientIdRef.current;
    if (patientId) {
      deleteEntryFromCloud(id).catch((err) => console.warn('Cloud sync delete failed', err));
    }
  }

  return (
    <SymptomsContext.Provider value={{ entries, loading, addEntries, updateEntry, deleteEntry }}>
      {children}
    </SymptomsContext.Provider>
  );
}

export function useSymptoms() {
  const ctx = useContext(SymptomsContext);
  if (!ctx) throw new Error('useSymptoms must be used within a SymptomsProvider');
  return ctx;
}
