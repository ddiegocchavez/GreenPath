/**
 * Mi impacto (Monitor): capta el uso de apps en Android y lo transforma en datos comprensibles.
 * Separa siempre: actividad MEDIDA · huella ESTIMADA (con fuente) · PENDIENTE (sin factor).
 * Diseño: docs/producto/mockups/impacto-v3.png
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Screen from '../components/ui/Screen';
import { FoodSummary, getFoodSummary } from '../features/progress/foodSummary';
import { AppTotal, getAppTotals } from '../features/progress/progress';
import { syncPastDays, syncSnapshot, SyncOutcome } from '../features/sync/syncUsage';
import { openPermissionSettings, readTodayUsage, UsageResult } from '../features/usage/usageReader';
import { formatDuration } from '../lib/dates';
import { colors, fonts, radius, space } from '../theme';
import EventsScreen from './EventsScreen';
import FoodScreen from './FoodScreen';

const OWN_APP_ID = 'com.greenpath.app';
type Range = 'hoy' | 'semana';

export default function MonitorScreen() {
  const [range, setRange] = useState<Range>('hoy');
  const [usage, setUsage] = useState<UsageResult | null>(null);
  const [sync, setSync] = useState<SyncOutcome | null>(null);
  const [week, setWeek] = useState<{ apps: AppTotal[]; daysWithData: number; demo: boolean } | null>(null);
  const [food, setFood] = useState<FoodSummary | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<'food' | 'events' | null>(null);
  const backfilled = useRef(false);

  // Consulta y sincroniza al abrir, al volver a la app y al actualizar.
  const refresh = useCallback(async () => {
    setBusy(true);
    const r = await readTodayUsage(OWN_APP_ID);
    setUsage(r);
    if (r.status === 'ok') setSync(await syncSnapshot(r.snapshot));
    if (!backfilled.current && r.status !== 'no_permission') {
      backfilled.current = true;
      await syncPastDays(OWN_APP_ID).catch(() => 0); // días que Android conserva, idempotente
    }
    const [w, f] = await Promise.all([getAppTotals(7).catch(() => null), getFoodSummary()]);
    setWeek(w);
    setFood(f);
    setBusy(false);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  if (open === 'food') return <FoodScreen onBack={() => { setOpen(null); refresh(); }} />;
  if (open === 'events') return <EventsScreen onBack={() => { setOpen(null); refresh(); }} />;

  const today = usage?.status === 'ok' ? usage.snapshot.items.map((i) => ({ appId: i.appId, appLabel: i.appLabel, ms: i.foregroundMs })) : [];
  const apps = range === 'hoy' ? today : week?.apps ?? [];
  const total = apps.reduce((a, i) => a + i.ms, 0);
  const max = apps[0]?.ms ?? 1;
  const shown = showAll ? apps.slice(0, 10) : apps.slice(0, 2);
  const isDemo = range === 'semana' && !!week?.demo;

  return (
    <Screen brand title="Mi impacto" subtitle="Consumo digital y alimentación" onRefresh={refresh} refreshing={busy}>
      <Image source={require('../../assets/hero-impacto.jpg')} style={styles.hero} resizeMode="cover" />

      <View style={styles.rangeRow}>
        <View style={styles.segment}>
          {(['hoy', 'semana'] as Range[]).map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={[styles.segBtn, range === r && styles.segActive]} accessibilityRole="button">
              <Text style={[styles.segText, range === r && styles.segTextActive]}>{r === 'hoy' ? 'Hoy' : 'Semana'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.chip}>{isDemo ? 'Incluye demo' : 'Medido'}</Text>
      </View>

      {usage?.status === 'no_permission' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Un paso para empezar</Text>
          <Text style={styles.body}>
            Para medir tu actividad sin que la captures a mano, activa el acceso al uso para GreenPath.
            Solo leemos cuánto tiempo usas cada app, no lo que haces dentro.
          </Text>
          <View style={{ height: space.md }} />
          <Button title="Activar acceso al uso" onPress={openPermissionSettings} />
        </View>
      )}

      {/* Huella estimada: alimentación (estimada con fuente) y digital (pendiente) */}
      <View style={styles.footprint}>
        <View style={styles.cardHead}>
          <Icon name="clipboard" size={24} color={colors.forest} />
          <Text style={styles.cardTitle}>Tu huella estimada</Text>
        </View>
        <View style={styles.footRow}>
          <View style={styles.footBox}>
            <Text style={styles.footLabel}>Alimentación</Text>
            <Text style={styles.footValue}>
              {food?.kgCO2e != null ? `${food.kgCO2e.toFixed(1)} kg CO₂e` : 'Sin registros'}
            </Text>
          </View>
          <View style={styles.footBox}>
            <Text style={styles.footLabel}>Digital</Text>
            <Text style={styles.footValue}>Pendiente</Text>
          </View>
        </View>
        <Text style={styles.footNote}>
          {food?.note ?? '…'} · Digital: no convertimos minutos en CO₂e sin un factor con fuente.
        </Text>
      </View>

      {/* Consumo digital medido */}
      {usage?.status !== 'no_permission' && (
        <View style={styles.card}>
          <View style={styles.digitalHead}>
            <Icon name="phone" size={26} color={colors.forest} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Consumo digital</Text>
              <Text style={styles.muted}>
                {range === 'hoy' ? 'Tiempo registrado hoy' : `Últimos 7 días · ${week?.daysWithData ?? 0} días con datos`}
              </Text>
            </View>
            <Text style={styles.total}>{formatDuration(total)}</Text>
          </View>

          {apps.length === 0 ? (
            <Text style={[styles.body, { marginTop: space.md }]}>
              {usage?.status === 'error' ? `No pudimos leer tu actividad: ${usage.message}` : 'Aún no hay actividad registrada.'}
            </Text>
          ) : (
            <Pressable onPress={() => setShowAll((v) => !v)} style={styles.appsWrap} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                {shown.map((a) => (
                  <View key={a.appId} style={styles.appRow}>
                    <View style={styles.appHead}>
                      <Text style={styles.appName} numberOfLines={1}>{a.appLabel}</Text>
                      <Text style={styles.appTime}>{formatDuration(a.ms)}</Text>
                    </View>
                    <View style={styles.track}><View style={[styles.bar, { width: `${Math.max(4, (a.ms / max) * 100)}%` }]} /></View>
                  </View>
                ))}
              </View>
              <View style={{ transform: [{ rotate: showAll ? '90deg' : '0deg' }], paddingLeft: space.sm }}>
                <Icon name="chevron" size={22} color={colors.forest} />
              </View>
            </Pressable>
          )}
          {range === 'hoy' && sync?.status === 'synced' && (
            <Text style={styles.syncNote}>✓ Guardado en tu cuenta · {sync.at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>
          )}
          {range === 'hoy' && sync?.status === 'error' && (
            <Text style={styles.syncNote}>No se pudo guardar: {sync.message}. Se reintentará al actualizar.</Text>
          )}
        </View>
      )}

      {/* Alimentación */}
      <View style={styles.card}>
        <View style={styles.digitalHead}>
          <Icon name="utensils" size={28} color={colors.forest} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Alimentación</Text>
            <Text style={styles.muted}>
              {food ? `${food.events} evento(s) registrado(s) · ${food.pantryItems} alimento(s) en tu despensa` : '…'}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setOpen('events')} style={styles.linkRow} accessibilityRole="button">
          <Text style={styles.link}>Ver huella de mis eventos</Text>
          <Icon name="arrow" size={20} color={colors.forest} />
        </Pressable>
        <Pressable onPress={() => setOpen('food')} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>Registrar alimento  +</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 190, borderRadius: radius.lg, marginBottom: space.lg },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: '#CFE0D4', borderRadius: radius.md, backgroundColor: '#FFF', overflow: 'hidden', width: '58%' },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segActive: { backgroundColor: colors.mint },
  segText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  segTextActive: { fontFamily: fonts.bold, color: colors.forest },
  chip: { backgroundColor: colors.mint, color: colors.forest, fontFamily: fonts.semibold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, overflow: 'hidden' },
  footprint: { backgroundColor: colors.mint, borderRadius: radius.lg, padding: space.lg, marginBottom: space.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  cardTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.forest },
  footRow: { flexDirection: 'row', gap: space.md },
  footBox: { flex: 1, backgroundColor: '#FFF', borderRadius: radius.md, padding: space.md },
  footLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  footValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.forest, marginTop: 4 },
  footNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: space.md, lineHeight: 17 },
  card: { backgroundColor: '#FFF', borderRadius: radius.lg, borderWidth: 1, borderColor: '#D9E8DD', padding: space.lg, marginBottom: space.lg },
  digitalHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  total: { fontFamily: fonts.bold, fontSize: 20, color: colors.forest },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 21 },
  appsWrap: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
  appRow: { marginBottom: space.md },
  appHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: 6 },
  appName: { fontFamily: fonts.regular, fontSize: 16, color: colors.text, flex: 1 },
  appTime: { fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  track: { height: 7, borderRadius: radius.pill, backgroundColor: colors.mint, overflow: 'hidden' },
  bar: { height: 7, borderRadius: radius.pill, backgroundColor: colors.leaf },
  syncNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: space.xs },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E1ECE4', paddingVertical: space.md, marginTop: space.md },
  link: { fontFamily: fonts.regular, fontSize: 16, color: colors.forest },
  primary: { backgroundColor: colors.leaf, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: space.lg },
  primaryText: { color: '#FFF', fontFamily: fonts.bold, fontSize: 17 },
});
