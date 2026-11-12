/** GreenPath carbon calculation engine. No generative AI or network requests.
 * Global average cradle-to-retail / life-cycle food factors from Poore & Nemecek
 * (2018), compiled by Our World in Data. See docs/CARBON_METHODOLOGY.md.
 * Comparisons are hypothetical, not verified avoided emissions.
 */
export type FoodKey = 'beef' | 'chicken' | 'beans' | 'tomato' | 'tortillas' | 'rice';
export type FoodFactor = { label: string; kgCO2ePerKg: number; source: string; geography: string; scope: string };
const source = 'Poore & Nemecek (2018) via Our World in Data';
const scope = 'Global food life-cycle average; not a brand or Mexico-specific footprint';
export const FOOD_FACTORS: Record<FoodKey, FoodFactor> = {
  beef: { label: 'Carne de res (ganado de carne)', kgCO2ePerKg: 99.48, source, geography: 'global', scope },
  chicken: { label: 'Pollo', kgCO2ePerKg: 9.87, source, geography: 'global', scope },
  beans: { label: 'Legumbres (proxy de frijoles)', kgCO2ePerKg: 1.79, source, geography: 'global', scope: scope + '; proxy no específico de frijol mexicano' },
  tomato: { label: 'Tomate', kgCO2ePerKg: 2.09, source, geography: 'global', scope },
  tortillas: { label: 'Maíz (proxy de tortillas)', kgCO2ePerKg: 1.70, source, geography: 'global', scope: scope + '; no incluye procesamiento específico de tortillas' },
  rice: { label: 'Arroz', kgCO2ePerKg: 4.45, source, geography: 'global', scope },
};
export type FoodQuantities = Partial<Record<FoodKey, number>>; // kg
export type CarbonResult = { totalKgCO2e: number; byFood: { food: FoodKey; kg: number; kgCO2e: number }[] };
export function calculateFoodCarbon(items: FoodQuantities): CarbonResult {
  const byFood = (Object.keys(FOOD_FACTORS) as FoodKey[]).filter(k => (items[k] ?? 0) > 0).map(food => {
    const kg = items[food] ?? 0;
    if (!Number.isFinite(kg) || kg < 0) throw new Error('Cantidad inválida');
    return { food, kg, kgCO2e: kg * FOOD_FACTORS[food].kgCO2ePerKg };
  });
  for (const value of Object.values(items)) if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error('Cantidad inválida');
  return { totalKgCO2e: byFood.reduce((sum, x) => sum + x.kgCO2e, 0), byFood };
}
export type MenuKey = 'tradicional' | 'equilibrado' | 'vegetal';
export type MenuPlan = { title: string; note: string; pricePerGuestMXN: number; gramsPerGuest: FoodQuantities };
/** Demonstration recipes/portions, not nutritional or retail price data. */
export const MENUS: Record<MenuKey, MenuPlan> = {
  tradicional: { title: 'Tradicional', note: 'Carne de res, tortillas y tomate', pricePerGuestMXN: 175, gramsPerGuest: { beef: 0.18, tortillas: 0.08, tomato: 0.06 } },
  equilibrado: { title: 'Equilibrado', note: 'Menos res, pollo, frijoles y acompañamientos', pricePerGuestMXN: 125, gramsPerGuest: { beef: 0.09, chicken: 0.09, beans: 0.08, tortillas: 0.08, tomato: 0.06 } },
  vegetal: { title: 'Más vegetal', note: 'Frijoles, arroz, tortillas y tomate', pricePerGuestMXN: 90, gramsPerGuest: { beans: 0.18, rice: 0.10, tortillas: 0.08, tomato: 0.08 } },
};
export function menuQuantities(menu: MenuKey, guests: number): FoodQuantities {
  if (!Number.isInteger(guests) || guests < 1 || guests > 1000) throw new Error('Invitados inválidos');
  return Object.fromEntries(Object.entries(MENUS[menu].gramsPerGuest).map(([food, kg]) => [food, kg * guests])) as FoodQuantities;
}
export function compareMenus(menu: MenuKey, guests: number) {
  const baseline = calculateFoodCarbon(menuQuantities('tradicional', guests));
  const selected = calculateFoodCarbon(menuQuantities(menu, guests));
  return { baseline, selected, differenceKgCO2e: baseline.totalKgCO2e - selected.totalKgCO2e, reference: 'Menú tradicional hipotético, mismas personas; distintas composiciones' };
}
export function estimateDiscardedFood(food: FoodKey, discardedGrams: number) {
  if (!Number.isFinite(discardedGrams) || discardedGrams < 0) throw new Error('Gramos inválidos');
  return discardedGrams / 1000 * FOOD_FACTORS[food].kgCO2ePerKg;
}
/** Electricity-only scenario. Not a validated app-specific or whole-streaming footprint. */
export function estimateElectricityCarbon(kwh: number, kgCO2ePerKwh: number) {
  if (![kwh, kgCO2ePerKwh].every(v => Number.isFinite(v) && v >= 0)) throw new Error('Datos inválidos');
  return kwh * kgCO2ePerKwh;
}
