/** Envía la foto del día a Supabase (función sync_usage). Reemplaza, nunca suma. */
import { getDeviceId, getDeviceLabel } from '../../lib/device';
import { isoWithOffset, localDate, timeZone } from '../../lib/dates';
import { supabase } from '../../lib/supabase';
import type { SyncPayloadV1, SyncResultV1 } from '../../types/contrato';
import type { UsageSnapshot } from '../usage/usageReader';

export async function buildPayload(snapshot: UsageSnapshot): Promise<SyncPayloadV1> {
  return {
    schema_version: 1,
    device_id: await getDeviceId(),
    device_label: getDeviceLabel(),
    timezone: timeZone(),
    local_date: localDate(snapshot.periodStart),
    period_start: isoWithOffset(snapshot.periodStart),
    period_end: isoWithOffset(snapshot.periodEnd),
    observed_at: isoWithOffset(snapshot.observedAt),
    source: 'android_usagestats',
    is_demo: false,
    items: snapshot.items.map((i) => ({
      app_id: i.appId,
      app_label: i.appLabel,
      foreground_ms: Math.min(86400000, Math.max(0, Math.round(i.foregroundMs))),
    })),
  };
}

export type SyncOutcome =
  | { status: 'synced'; result: SyncResultV1; at: Date }
  | { status: 'error'; message: string };

export async function syncSnapshot(snapshot: UsageSnapshot): Promise<SyncOutcome> {
  try {
    const payload = await buildPayload(snapshot);
    const { data, error } = await supabase.rpc('sync_usage', { payload });
    if (error) return { status: 'error', message: error.message };
    return { status: 'synced', result: data as SyncResultV1, at: new Date() };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
