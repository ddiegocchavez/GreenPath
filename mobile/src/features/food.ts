/** Inventario local y sugerencias deterministas: sin llamadas a IA ni factores inventados. */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@greenpath/pantry/v1';
export const INGREDIENTS = ['Tortillas', 'Huevo', 'Tomate', 'Cebolla', 'Frijoles', 'Arroz', 'Avena', 'Plátano', 'Leche', 'Zanahoria', 'Papa', 'Lentejas'] as const;
export type Ingredient = typeof INGREDIENTS[number];
export type Recipe = { name: string; ingredients: Ingredient[]; tip: string };
export const RECIPES: Recipe[] = [
  { name: 'Bowl de frijoles y verduras', ingredients: ['Frijoles', 'Arroz', 'Tomate', 'Cebolla'], tip: 'Una comida completa con legumbres y lo que tengas de verdura.' },
  { name: 'Huevos a la mexicana', ingredients: ['Huevo', 'Tomate', 'Cebolla'], tip: 'Aprovecha el tomate maduro antes de que se eche a perder.' },
  { name: 'Tacos de frijoles', ingredients: ['Tortillas', 'Frijoles'], tip: 'Usa las tortillas y frijoles que ya tienes.' },
  { name: 'Arroz con lentejas', ingredients: ['Arroz', 'Lentejas', 'Cebolla'], tip: 'Una opción de legumbres sin comprar carne.' },
  { name: 'Avena con plátano', ingredients: ['Avena', 'Plátano', 'Leche'], tip: 'Aprovecha plátanos maduros.' },
  { name: 'Tacos de papa', ingredients: ['Tortillas', 'Papa', 'Cebolla'], tip: 'Utiliza las papas que tienes almacenadas.' },
  { name: 'Arroz con verduras', ingredients: ['Arroz', 'Zanahoria', 'Tomate'], tip: 'Aprovecha las verduras antes de que se deterioren.' },
];
export async function loadPantry(): Promise<Ingredient[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? INGREDIENTS.filter(i => parsed.includes(i)) : [];
  } catch { return []; }
}
export async function savePantry(items: Ingredient[]) { await AsyncStorage.setItem(KEY, JSON.stringify(items)); }
export function suggestRecipes(items: Ingredient[]) {
  return RECIPES.map(recipe => ({
    ...recipe,
    missing: recipe.ingredients.filter(i => !items.includes(i)),
    available: recipe.ingredients.filter(i => items.includes(i)).length,
  })).filter(r => r.available > 0).sort((a, b) => a.missing.length - b.missing.length || b.available - a.available);
}
