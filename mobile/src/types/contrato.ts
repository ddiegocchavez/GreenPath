/** Contrato de sincronización v1. Fuente de verdad: shared/contrato/sync-v1.schema.json */
export type SyncItemV1 = {
  app_id: string;
  app_label?: string;
  foreground_ms: number; // milisegundos, entero >= 0
};

export type SyncPayloadV1 = {
  schema_version: 1;
  device_id: string;
  device_label?: string;
  timezone: string;
  local_date: string; // YYYY-MM-DD
  period_start: string; // ISO con desfase
  period_end: string;
  observed_at: string;
  source: 'android_usagestats';
  is_demo?: boolean;
  items: SyncItemV1[];
};

export type SyncResultV1 = {
  ok: boolean;
  local_date: string;
  apps_saved: number;
  ignored_as_older: number;
};
