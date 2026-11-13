/**
 * Resumen de alimentación a partir de lo que la persona registró en el teléfono
 * (eventos y despensa, AsyncStorage). CO2e = estimado con factores publicados; nunca inventado.
 */
import { loadEvents } from '../eventStorage';
import { calculateLedger } from '../foodLedger';
import { loadPantry } from '../food';

export type FoodSummary = {
  events: number;
  pantryItems: number;
  kgCO2e: number | null;
  basis: 'registro' | 'plan' | 'ninguno';
  note: string;
};

export async function getFoodSummary(): Promise<FoodSummary> {
  const [events, pantry] = await Promise.all([loadEvents(), loadPantry()]);
  const withLedger = events.filter((e) => e.foodLedger && e.foodLedger.length > 0);
  if (withLedger.length) {
    const kg = withLedger.reduce((a, e) => a + calculateLedger(e.foodLedger!).purchasedKgCO2e, 0);
    return {
      events: events.length, pantryItems: pantry.length, kgCO2e: kg, basis: 'registro',
      note: `Alimentos comprados en ${withLedger.length} evento(s) registrado(s) · estimado`,
    };
  }
  if (events.length) {
    return {
      events: events.length, pantryItems: pantry.length, kgCO2e: events[0].plannedKgCO2e, basis: 'plan',
      note: 'Plan de tu último evento · estimado',
    };
  }
  return { events: 0, pantryItems: pantry.length, kgCO2e: null, basis: 'ninguno', note: 'Registra un evento para estimarla' };
}
