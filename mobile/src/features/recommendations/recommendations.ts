/** Catálogo curado de recomendaciones (sin IA), filtrado por preferencias. */
import { supabase } from '../../lib/supabase';
import { CHANGES, Preferences } from '../preferences/preferences';

export type Recommendation = {
  id: string; section: string; title: string; what_to_do: string; why: string; data_and_assumptions: string;
  sources: { title: string; url: string }[]; effort: 'minimo' | 'moderado' | 'alto';
  cost_level: 'sin_gasto' | 'bajo' | 'medio' | 'alto'; cost_note: string | null; impact_note: string; tags: string[];
};

const EFFORT_RANK = { minimo: 0, moderado: 1, alto: 2 } as const;
const COST_RANK = { sin_gasto: 0, bajo: 1, medio: 2, alto: 3 } as const;

export async function getRecommendations(): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('id,section,title,what_to_do,why,data_and_assumptions,sources,effort,cost_level,cost_note,impact_note,tags')
    .eq('section', 'reducir_sin_gastar');
  if (error) throw new Error(error.message);
  return (data ?? []) as Recommendation[];
}

/**
 * Respeta las restricciones: esfuerzo y costo no mayores a lo que acepta la persona.
 * Ordena primero las que coinciden con los cambios que está dispuesta a hacer.
 */
export function filterForUser(recs: Recommendation[], prefs: Preferences | null): Recommendation[] {
  if (!prefs) return recs;
  const wantedTags = CHANGES.filter((c) => prefs.willing_changes.includes(c.key)).map((c) => c.tag);
  return recs
    .filter((r) => EFFORT_RANK[r.effort] <= EFFORT_RANK[prefs.effort] && COST_RANK[r.cost_level] <= COST_RANK[prefs.budget])
    .sort((a, b) => Number(b.tags.some((t) => wantedTags.includes(t))) - Number(a.tags.some((t) => wantedTags.includes(t))));
}
