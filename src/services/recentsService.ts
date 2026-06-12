import * as FileSystem from 'expo-file-system/legacy';
import type { ScopeConfig } from '../types';

const RECENTS_PATH = `${FileSystem.documentDirectory}recents.json`;
const MAX_RECENTS = 10;

async function readRecents(): Promise<ScopeConfig[]> {
  const info = await FileSystem.getInfoAsync(RECENTS_PATH);
  if (!info.exists) return [];
  try {
    const raw = await FileSystem.readAsStringAsync(RECENTS_PATH);
    return JSON.parse(raw) as ScopeConfig[];
  } catch {
    return [];
  }
}

async function writeRecents(scopes: ScopeConfig[]): Promise<void> {
  await FileSystem.writeAsStringAsync(RECENTS_PATH, JSON.stringify(scopes));
}

/**
 * Prepends scope to the recents list, deduplicating by JSON equality,
 * and trims to the most recent MAX_RECENTS entries.
 */
export async function saveRecentScope(scope: ScopeConfig): Promise<void> {
  const key = JSON.stringify(scope);
  const existing = await readRecents();
  const deduped = existing.filter(s => JSON.stringify(s) !== key);
  const next = [scope, ...deduped].slice(0, MAX_RECENTS);
  await writeRecents(next);
}

export async function getRecentScopes(): Promise<ScopeConfig[]> {
  return readRecents();
}

export async function clearRecents(): Promise<void> {
  await writeRecents([]);
}
