/** Event food mass balance, in grams. Does not claim avoided emissions. */
import { FOOD_FACTORS } from './carbon';
import type { FoodKey } from './carbon';
export type FoodLedgerEntry = { food: FoodKey; purchasedGrams: number; consumedGrams: number; savedGrams: number; discardedGrams: number };
export function calculateLedger(entries: FoodLedgerEntry[]) {
  const seen = new Set<FoodKey>();
  let purchasedKgCO2e = 0, discardedProductionKgCO2e = 0;
  let purchasedGrams = 0, consumedGrams = 0, savedGrams = 0, discardedGrams = 0;
  for (const e of entries) {
    if (!FOOD_FACTORS[e.food] || seen.has(e.food)) throw new Error('Alimento duplicado o no reconocido');
    seen.add(e.food);
    const values = [e.purchasedGrams, e.consumedGrams, e.savedGrams, e.discardedGrams];
    if (values.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Las cantidades deben ser positivas o cero');
    if (e.consumedGrams + e.savedGrams + e.discardedGrams > e.purchasedGrams + 0.001) throw new Error('La suma de consumido, guardado y desechado supera lo comprado');
    purchasedGrams += e.purchasedGrams;
    consumedGrams += e.consumedGrams;
    savedGrams += e.savedGrams;
    discardedGrams += e.discardedGrams;
    const factor = FOOD_FACTORS[e.food].kgCO2ePerKg;
    purchasedKgCO2e += e.purchasedGrams / 1000 * factor;
    discardedProductionKgCO2e += e.discardedGrams / 1000 * factor;
  }
  return { purchasedGrams, consumedGrams, savedGrams, discardedGrams, unaccountedGrams: purchasedGrams-consumedGrams-savedGrams-discardedGrams, purchasedKgCO2e, discardedProductionKgCO2e };
}
