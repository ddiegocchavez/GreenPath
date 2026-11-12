/**
 * Lectura del uso de apps de HOY (desde las 00:00 locales) en Android.
 *
 * Suma sesiones a partir de eventos de UsageStatsManager en lugar de usar los
 * intervalos diarios de queryUsageStats, que no siempre empiezan a medianoche local.
 */
import ExpoAndroidUsagestats, {
  getUsageEvents,
  hasUsageStatsPermission,
  requestUsageStatsPermission,
} from 'expo-android-usagestats';

/**
 * Constantes de android.app.usage.UsageEvents.Event (documentación oficial de Android).
 * Ojo: el enum UsageEventType de expo-android-usagestats tiene valores incorrectos
 * (p. ej. SCREEN_NON_INTERACTIVE = 8); por eso usamos estas.
 */
const ACTIVITY_RESUMED = 1;
const ACTIVITY_PAUSED = 2;
const SCREEN_NON_INTERACTIVE = 16;
const ACTIVITY_STOPPED = 23;
const DEVICE_SHUTDOWN = 26;

export type AppUsage = {
  appId: string;
  appLabel: string;
  foregroundMs: number;
};

export type UsageSnapshot = {
  periodStart: Date;
  periodEnd: Date;
  observedAt: Date;
  items: AppUsage[];
};

export type UsageResult =
  | { status: 'ok'; snapshot: UsageSnapshot }
  | { status: 'no_permission' }
  | { status: 'empty'; snapshot: UsageSnapshot }
  | { status: 'error'; message: string };

export function startOfLocalDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function checkPermission(): Promise<boolean> {
  return hasUsageStatsPermission();
}

/** Abre Ajustes → Acceso al uso. El usuario regresa a la app manualmente. */
export async function openPermissionSettings(): Promise<void> {
  await requestUsageStatsPermission();
}

type RawEvent = { packageName: string; className?: string; timeStamp: number; eventType: number };

/**
 * Convierte eventos en milisegundos en primer plano por app.
 *
 * Una app tiene varias pantallas (activities) que se abren y cierran intercaladas;
 * por eso se sigue cada activity por separado y la app cuenta como "en primer plano"
 * mientras tenga al menos una activity reanudada. Así no se suma doble ni se corta antes.
 *
 * - RESUMED abre la activity; PAUSED o STOPPED la cierra.
 * - Si lo primero que vemos de una app es un cierre, la sesión empezó antes de las 00:00:
 *   se cuenta desde periodStart.
 * - Lo que siga abierto se cuenta hasta periodEnd.
 * - Pantalla apagada o apagado del equipo cierran todo.
 */
export function sumForegroundFromEvents(
  events: RawEvent[],
  periodStart: number,
  periodEnd: number,
): Map<string, number> {
  const totals = new Map<string, number>();
  const openActivities = new Map<string, Set<string>>(); // app -> activities reanudadas
  const appOpenSince = new Map<string, number>();
  const seen = new Set<string>();

  const add = (pkg: string, from: number, to: number) => {
    const ms = Math.max(0, Math.min(to, periodEnd) - Math.max(from, periodStart));
    if (ms > 0) totals.set(pkg, (totals.get(pkg) ?? 0) + ms);
  };
  const closeApp = (pkg: string, at: number) => {
    const since = appOpenSince.get(pkg);
    if (since !== undefined) add(pkg, since, at);
    appOpenSince.delete(pkg);
    openActivities.delete(pkg);
  };
  const closeAll = (at: number) => {
    for (const pkg of [...appOpenSince.keys()]) closeApp(pkg, at);
  };

  const sorted = [...events].sort((a, b) => a.timeStamp - b.timeStamp);
  for (const e of sorted) {
    const pkg = e.packageName;
    const activity = e.className ?? '';

    if (e.eventType === SCREEN_NON_INTERACTIVE || e.eventType === DEVICE_SHUTDOWN) {
      closeAll(e.timeStamp);
      continue;
    }
    if (e.eventType === ACTIVITY_RESUMED) {
      seen.add(pkg);
      const set = openActivities.get(pkg) ?? new Set<string>();
      if (set.size === 0) appOpenSince.set(pkg, e.timeStamp);
      set.add(activity);
      openActivities.set(pkg, set);
    } else if (e.eventType === ACTIVITY_PAUSED || e.eventType === ACTIVITY_STOPPED) {
      const set = openActivities.get(pkg);
      if (set?.has(activity)) {
        set.delete(activity);
        if (set.size === 0) closeApp(pkg, e.timeStamp);
      } else if (!seen.has(pkg)) {
        add(pkg, periodStart, e.timeStamp); // venía abierta desde antes de las 00:00
      }
      seen.add(pkg);
    }
  }
  closeAll(periodEnd);
  return totals;
}

/**
 * Apps que no representan uso elegido por la persona (pantalla de inicio, asistentes
 * del sistema). Bienestar digital tampoco las cuenta. Heurística por nombre de paquete.
 */
export function isSystemNoise(appId: string): boolean {
  return /launcher|googlesdksetup|setupwizard|systemui|permissioncontroller/i.test(appId);
}

async function labelFor(appId: string): Promise<string> {
  try {
    const info = await (ExpoAndroidUsagestats as any).getAppInfo(appId);
    return info?.appName || appId;
  } catch {
    return appId;
  }
}

/** Lee el uso entre periodStart y periodEnd y arma la foto. */
async function readRange(periodStart: Date, periodEnd: Date, ownAppId?: string): Promise<UsageSnapshot> {
  const events = await getUsageEvents(periodStart.getTime(), periodEnd.getTime());
  const totals = sumForegroundFromEvents(events ?? [], periodStart.getTime(), periodEnd.getTime());
  const items: AppUsage[] = [];
  for (const [appId, foregroundMs] of totals) {
    if (appId === ownAppId || foregroundMs < 1000 || isSystemNoise(appId)) continue;
    items.push({ appId, appLabel: await labelFor(appId), foregroundMs: Math.round(foregroundMs) });
  }
  items.sort((a, b) => b.foregroundMs - a.foregroundMs);
  return { periodStart, periodEnd, observedAt: new Date(), items };
}

/** Consulta el uso de hoy. Nunca lanza: devuelve un estado. */
export async function readTodayUsage(ownAppId?: string): Promise<UsageResult> {
  try {
    if (!(await hasUsageStatsPermission())) return { status: 'no_permission' };
    const now = new Date();
    const snapshot = await readRange(startOfLocalDay(now), now, ownAppId);
    return snapshot.items.length ? { status: 'ok', snapshot } : { status: 'empty', snapshot };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Días completos anteriores que Android todavía conserva (normalmente 7–10).
 * Devuelve solo los días con actividad; los días sin datos no se inventan.
 */
export async function readPastDays(days: number, ownAppId?: string): Promise<UsageSnapshot[]> {
  if (!(await hasUsageStatsPermission())) return [];
  const out: UsageSnapshot[] = [];
  const todayStart = startOfLocalDay(new Date());
  for (let i = 1; i <= days; i++) {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1);
    try {
      const snap = await readRange(start, end, ownAppId);
      if (snap.items.length) out.push(snap);
    } catch {
      // Un día ilegible no detiene el resto.
    }
  }
  return out;
}
