/**
 * Recompensas: puntos por reducción de ACTIVIDAD medida (no de CO2).
 * El cálculo y el otorgamiento viven en el servidor (weekly_reduction / claim_weekly_points).
 */
import { getDeviceId } from '../../lib/device';
import { localDate } from '../../lib/dates';
import { supabase } from '../../lib/supabase';

export type Period = { start: string; end: string; ms: number; days: number; avg_ms: number };

export type WeeklyStatus = {
  rule_version: string;
  current: Period;
  previous: Period;
  comparable: boolean;
  reason: string | null;
  reduction_pct: number | null;
  points: number;
  includes_demo_data: boolean;
  last_claim_window_end: string | null;
  can_claim: boolean;
};

export const RULE_TEXT =
  '10 puntos por cada 1 % que reduzcas tu tiempo de uso promedio por día frente a los 7 días anteriores, ' +
  'a partir de 5 % y hasta 500 puntos. Si tu uso sube, no pierdes puntos. ' +
  'Solo cuenta si ambos periodos tienen al menos 5 días con datos.';

/** Niveles para la barra de progreso. */
export const LEVELS = [
  { name: 'Semilla', min: 0 },
  { name: 'Brote', min: 250 },
  { name: 'Retoño', min: 750 },
  { name: 'Árbol', min: 1500 },
  { name: 'Bosque', min: 3000 },
] as const;

export function levelFor(total: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1].min) i++;
  const current = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const progress = next ? (total - current.min) / (next.min - current.min) : 1;
  return { current, next, progress: Math.max(0, Math.min(1, progress)) };
}

export async function getWeeklyStatus(): Promise<WeeklyStatus> {
  const { data, error } = await supabase.rpc('weekly_reduction', {
    p_device: await getDeviceId(),
    p_today: localDate(new Date()),
  });
  if (error) throw new Error(error.message);
  return data as WeeklyStatus;
}

export async function claimWeeklyPoints(): Promise<{ ok: boolean; points?: number }> {
  const { data, error } = await supabase.rpc('claim_weekly_points', {
    p_device: await getDeviceId(),
    p_today: localDate(new Date()),
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; points?: number };
}

export type LedgerRow = { id: number; points: number; reason: string; created_at: string; is_demo: boolean };

export async function getLedger(): Promise<LedgerRow[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('id,points,reason,created_at,is_demo')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LedgerRow[];
}
