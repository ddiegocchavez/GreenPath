/**
 * Monitor: capta el uso de apps (Android) y lo transforma en datos comprensibles.
 * Separa siempre: actividad medida · emisiones estimadas (o pendientes) · estado de guardado.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Screen from '../components/ui/Screen';
import { estimateElectricityCarbon } from '../features/carbon';
import { signOut } from '../features/auth/AuthProvider';
import { syncSnapshot, SyncOutcome } from '../features/sync/syncUsage';
import { openPermissionSettings, readTodayUsage, UsageResult } from '../features/usage/usageReader';
import { getDeviceLabel } from '../lib/device';
import { formatDuration } from '../lib/dates';
import { colors, fonts, radius, space, text } from '../theme';

const OWN_APP_ID = 'com.greenpath.app';

export default function MonitorScreen() {
  const [usage, setUsage] = useState<UsageResult | null>(null);
  const [sync, setSync] = useState<SyncOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [kwhText, setKwhText] = useState('');
  const [factorText, setFactorText] = useState('');

  // Consulta y sincroniza al abrir, al volver a la app y al actualizar.
  const refresh = useCallback(async () => {
    setBusy(true);
    const r = await readTodayUsage(OWN_APP_ID);
    setUsage(r);
    if (r.status === 'ok') setSync(await syncSnapshot(r.snapshot));
    setBusy(false);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const items = usage?.status === 'ok' ? usage.snapshot.items : [];
  const total = items.reduce((a, i) => a + i.foregroundMs, 0);
  const max = items[0]?.foregroundMs ?? 1;

  return (
    <Screen title="Mi impacto" subtitle="Alimentación y actividad digital: empieza por lo medible" onRefresh={refresh} refreshing={busy}>
      <Card tone="mint" title="🍎 Alimentación">
        <Text style={[text.body, styles.dark]}>Tu despensa y las recetas están disponibles en Reducir. El CO₂e alimentario requiere cantidades, una referencia comparable y factores documentados; no mostramos cifras inventadas.</Text>
      </Card>
      {usage?.status === 'no_permission' && (
        <Card tone="mint" title="Un paso para empezar">
          <Text style={[text.body, styles.dark]}>
            Para medir tu actividad sin que la captures a mano, activa el acceso al uso para GreenPath.
            Solo leemos cuánto tiempo usas cada app, no lo que haces dentro.
          </Text>
          <View style={{ height: space.md }} />
          <Button title="Activar acceso al uso" onPress={openPermissionSettings} />
        </Card>
      )}

      {usage?.status === 'error' && (
        <Card title="No pudimos leer tu actividad">
          <Text style={[text.body, styles.dark]}>{usage.message}</Text>
        </Card>
      )}

      {usage?.status === 'empty' && (
        <Card tone="mint" title="Aún no hay actividad hoy">
          <Text style={[text.body, styles.dark]}>Usa tu celular un rato y desliza hacia abajo para actualizar.</Text>
        </Card>
      )}

      {usage?.status === 'ok' && (
        <>
          <Card tone="forest" title="Actividad registrada · medida">
            <Text style={styles.big}>{formatDuration(total)}</Text>
            <Text style={[text.small, styles.light]}>
              en {items.length} apps desde las 00:00 · {getDeviceLabel()}
            </Text>
          </Card>

          <Card title="Huella estimada">
            <View style={styles.pendingRow}>
              <View style={styles.pendingDot} />
              <Text style={[text.label, { color: colors.pending }]}>ESTIMACIÓN PENDIENTE</Text>
            </View>
            <Text style={[text.body, styles.dark]}>
              El tiempo en una app no revela por sí solo cuántos datos o energía usó. No inventamos un factor:
              mostraremos una estimación cuando tengamos uno con fuente.
            </Text>
          </Card>

          <Card title="Por app">
            {items.slice(0, 10).map((i) => (
              <View key={i.appId} style={styles.appRow}>
                <View style={styles.appHead}>
                  <Text style={[text.label, styles.dark]} numberOfLines={1}>{i.appLabel}</Text>
                  <Text style={[text.label, { color: colors.pine }]}>{formatDuration(i.foregroundMs)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${Math.max(4, (i.foregroundMs / max) * 100)}%` }]} />
                </View>
              </View>
            ))}
          </Card>

          <Text style={[text.small, styles.syncNote]}>
            {sync?.status === 'synced'
              ? `✓ Guardado en tu cuenta a las ${sync.at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · también visible en la web`
              : sync?.status === 'error'
                ? `No se pudo guardar: ${sync.message}. Se reintentará al actualizar.`
                : 'Guardando…'}
          </Text>
        </>
      )}

      <Card title="Escenario de electricidad · opcional">
        <Text style={[text.body, styles.dark]}>Si conoces los kWh consumidos y el factor de emisión eléctrico aplicable, calcula solo esa parte. NO se deduce del tiempo de uso de las apps ni representa su huella completa.</Text>
        <Text style={[text.label, styles.dark, {marginTop: 10}]}>Electricidad consumida (kWh)</Text>
        <TextInput accessibilityLabel="Electricidad en kWh" keyboardType="decimal-pad" value={kwhText} onChangeText={setKwhText} placeholder="Ej. 0.5" style={styles.input}/>
        <Text style={[text.label, styles.dark, {marginTop: 10}]}>Factor (kg CO₂e/kWh)</Text>
        <TextInput accessibilityLabel="Factor eléctrico" keyboardType="decimal-pad" value={factorText} onChangeText={setFactorText} placeholder="Ingresa un factor con fuente" style={styles.input}/>
        {kwhText.trim() !== '' && factorText.trim() !== '' && Number.isFinite(Number(kwhText.replace(',','.'))) && Number.isFinite(Number(factorText.replace(',','.'))) && Number(kwhText.replace(',','.')) >= 0 && Number(factorText.replace(',','.')) >= 0 && <Text style={[text.body, styles.dark]}>Resultado del escenario: {estimateElectricityCarbon(Number(kwhText.replace(',','.')), Number(factorText.replace(',','.'))).toFixed(3)} kg CO₂e.</Text>}
        <Text style={[text.small, styles.dark]}>Debes documentar año, región y fuente del factor antes de usar el resultado en un reporte. No se generan puntos con este escenario.</Text>
      </Card>

      <Pressable onPress={signOut}><Text style={styles.signOut}>Cerrar sesión</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dark: { color: colors.text },
  light: { color: colors.sprout },
  big: { fontFamily: fonts.black, fontSize: 40, color: colors.onDark },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  pendingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pending },
  appRow: { marginBottom: space.md },
  appHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: 6 },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.mint, overflow: 'hidden' },
  bar: { height: 10, borderRadius: radius.pill, backgroundColor: colors.leaf },
  syncNote: { color: colors.textMuted, textAlign: 'center', marginVertical: space.md },
  input: { borderWidth: 1, borderColor: '#C9DACD', borderRadius: 10, padding: 12, color: colors.text, marginTop: 6 },
  signOut: { textAlign: 'center', fontFamily: fonts.bold, color: colors.textMuted, padding: space.md },
});
