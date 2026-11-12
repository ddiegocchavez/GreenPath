import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodKey, MenuKey } from './carbon';
import type { FoodLedgerEntry } from './foodLedger';
const KEY = '@greenpath/events_v2'; // keep existing events and migrate lazily
export type SavedEvent = {
  id: string; savedAt: string; guests: number; budgetMXN: number; menu: MenuKey;
  pantry: string[]; estimatedCostMXN: number; plannedKgCO2e: number;
  referenceKgCO2e: number;
  discarded?: { food: FoodKey; grams: number; productionKgCO2e: number }; // legacy
  foodLedger?: FoodLedgerEntry[];
};
export async function loadEvents(): Promise<SavedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(e => e && typeof e.id === 'string') as SavedEvent[] : [];
  } catch { return []; }
}
export async function saveEvent(event: SavedEvent): Promise<void> {
  const existing = await loadEvents();
  await AsyncStorage.setItem(KEY, JSON.stringify([event, ...existing].slice(0, 30)));
}
export async function updateEventLedger(id: string, foodLedger: FoodLedgerEntry[]): Promise<void> {
  const existing = await loadEvents();
  if (!existing.some(e => e.id === id)) throw new Error('Evento no encontrado');
  await AsyncStorage.setItem(KEY, JSON.stringify(existing.map(e => e.id === id ? { ...e, foodLedger } : e)));
}
export async function updateEventDiscard(id: string, discarded: SavedEvent['discarded']): Promise<void> {
  const existing = await loadEvents();
  await AsyncStorage.setItem(KEY, JSON.stringify(existing.map(e => e.id === id ? { ...e, discarded } : e)));
}
