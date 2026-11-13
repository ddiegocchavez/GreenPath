/** Preferencias del usuario (tabla preferences, RLS: solo la propia). */
import { supabase } from '../../lib/supabase';

export type Budget = 'sin_gasto' | 'bajo' | 'medio' | 'alto';
export type Effort = 'minimo' | 'moderado' | 'alto';
export type Preferences = { budget: Budget; effort: Effort; willing_changes: string[] };

export const BUDGET_LABEL: Record<Budget, string> = { sin_gasto: 'Sin gasto', bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };
export const EFFORT_LABEL: Record<Effort, string> = { minimo: 'Mínimo', moderado: 'Moderado', alto: 'Alto' };
export const CHANGES: { key: string; label: string; tag: string }[] = [
  { key: 'mas_vegetales', label: 'Más vegetales', tag: 'alimentacion' },
  { key: 'menos_desperdicio', label: 'Menos desperdicio', tag: 'despensa' },
  { key: 'menos_pantalla', label: 'Menos pantalla', tag: 'digital' },
];

export async function getPreferences(): Promise<Preferences | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from('preferences').select('budget,effort,willing_changes').eq('user_id', u.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Preferences) ?? null;
}

export async function savePreferences(p: Preferences): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Sesión requerida');
  const { error } = await supabase
    .from('preferences')
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq('user_id', u.user.id);
  if (error) throw new Error(error.message);
}

export function describePreferences(p: Preferences | null): string {
  if (!p) return 'Sin definir';
  const changes = CHANGES.filter((c) => p.willing_changes.includes(c.key)).map((c) => c.label);
  return [`Presupuesto: ${BUDGET_LABEL[p.budget]}`, `Esfuerzo ${EFFORT_LABEL[p.effort].toLowerCase()}`, ...changes].join(' · ');
}
