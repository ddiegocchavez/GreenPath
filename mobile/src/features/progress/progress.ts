/**
 * Lecturas para Mi impacto y Mi progreso desde Supabase (RLS: solo datos propios).
 * Actividad = tiempo de uso MEDIDO; no se convierte a CO2e.
 */
import { getDeviceId } from '../../lib/device';
import { localDate } from '../../lib/dates';
import { supabase } from '../../lib/supabase';

export type DayRow = { local_date: string; total_foreground_ms: number; has_demo_data: boolean };
export type AppTotal = { appId: string; appLabel: string; ms: number };

export function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() - n);
  return d;
}

/** Días con datos entre hoy-`days` y ayer (o hoy si includeToday). */
export async function getDailyActivity(days: number, includeToday = false): Promise<DayRow[]> {
  const device = await getDeviceId();
  const to = includeToday ? localDate(new Date()) : localDate(daysAgo(1));
  const { data, error } = await supabase
    .from('v_daily_activity')
    .select('local_date,total_foreground_ms,has_demo_data')
    .eq('device_id', device)
    .gte('local_date', localDate(daysAgo(days)))
    .lte('local_date', to)
    .order('local_date');
  if (error) throw new Error(error.message);
  return (data ?? []) as DayRow[];
}

/** Totales por app en los últimos `days` días (incluye hoy). */
export async function getAppTotals(days: number): Promise<{ apps: AppTotal[]; daysWithData: number; demo: boolean }> {
  const device = await getDeviceId();
  const { data, error } = await supabase
    .from('usage_daily')
    .select('app_id,app_label,foreground_ms,local_date,is_demo')
    .eq('device_id', device)
    .gte('local_date', localDate(daysAgo(days - 1)));
  if (error) throw new Error(error.message);
  const map = new Map<string, AppTotal>();
  const dates = new Set<string>();
  let demo = false;
  for (const r of data ?? []) {
    dates.add(r.local_date);
    demo = demo || r.is_demo;
    const cur = map.get(r.app_id) ?? { appId: r.app_id, appLabel: r.app_label ?? r.app_id, ms: 0 };
    cur.ms += Number(r.foreground_ms);
    map.set(r.app_id, cur);
  }
  return { apps: [...map.values()].sort((a, b) => b.ms - a.ms), daysWithData: dates.size, demo };
}

export type WeekPoint = { start: string; end: string; avgMs: number | null; days: number; demo: boolean };

/** Promedio diario de uso por semana (últimas `weeks` semanas completas, de la más antigua a la más reciente). */
export async function getWeeklyAverages(weeks = 4): Promise<WeekPoint[]> {
  const rows = await getDailyActivity(weeks * 7);
  const out: WeekPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = localDate(daysAgo(7 * w + 7));
    const end = localDate(daysAgo(7 * w + 1));
    const inWeek = rows.filter((r) => r.local_date >= start && r.local_date <= end);
    const total = inWeek.reduce((a, r) => a + Number(r.total_foreground_ms), 0);
    out.push({
      start, end, days: inWeek.length,
      avgMs: inWeek.length ? total / inWeek.length : null,
      demo: inWeek.some((r) => r.has_demo_data),
    });
  }
  return out;
}

// ---------------------------------------------------------------- Retos (elecciones)

export type Choice = {
  id: number; status: 'elegida' | 'realizada' | 'descartada'; recommendation_id: string;
  chosen_at: string; done_at: string | null; recommendations: { title: string } | null;
};

export async function getChoices(): Promise<Choice[]> {
  const { data, error } = await supabase
    .from('user_choices')
    .select('id,status,recommendation_id,chosen_at,done_at,recommendations(title)')
    .order('chosen_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Choice[];
}

/** "Esto sí va conmigo": registra la intención (no es una acción realizada). */
export async function chooseRecommendation(recommendationId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Sesión requerida');
  const { error } = await supabase
    .from('user_choices')
    .upsert({ user_id: u.user.id, recommendation_id: recommendationId, status: 'elegida' },
      { onConflict: 'user_id,recommendation_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/** Marcar un reto como realizado (autodeclarado). */
export async function markDone(choiceId: number): Promise<void> {
  const { error } = await supabase
    .from('user_choices')
    .update({ status: 'realizada', done_at: new Date().toISOString() })
    .eq('id', choiceId);
  if (error) throw new Error(error.message);
}
