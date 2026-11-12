/**
 * Recompensas: barra de puntos acumulados por nivel, comparación de los últimos 7 días
 * contra los 7 anteriores y reclamo de puntos. Puntos ≠ emisiones: se muestran aparte.
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Screen from '../components/ui/Screen';
import {
  claimWeeklyPoints, getLedger, getWeeklyStatus, LedgerRow, levelFor, RULE_TEXT, WeeklyStatus,
} from '../features/rewards/rewards';
import { syncPastDays } from '../features/sync/syncUsage';
import { formatDuration } from '../lib/dates';
import { colors, fonts, radius, space, text } from '../theme';

const OWN_APP_ID = 'com.greenpath.app';

export default function RewardsScreen() {
  const [status, setStatus] = useState<WeeklyStatus | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      await syncPastDays(OWN_APP_ID); // sube los días que Android conserva (idempotente)
      const [s, l] = await Promise.all([getWeeklyStatus(), getLedger()]);
      setStatus(s);
      setLedger(l);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const claim = async () => {
    setClaiming(true);
    try {
      const r = await claimWeeklyPoints();
      await load();
      setMsg(r.ok ? `¡Sumaste ${r.points} puntos! 🎉` : 'No hay puntos por reclamar en este periodo.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setClaiming(false);
  };

  const total = ledger.reduce((a, r) => a + r.points, 0);
  const lvl = levelFor(total);
  const pct = status?.reduction_pct != null ? Number(status.reduction_pct) : null;

  return (
    <Screen title="Mi progreso" subtitle="Hábitos registrados, puntos y recompensas" onRefresh={load} refreshing={busy}>
      <Card tone="mint" title="🌱 Progreso de carbono">
        <Text style={[text.body, { color: colors.text }]}>Reducción de CO₂e: pendiente de medición validada. Los puntos actuales premian cambios de tiempo de pantalla, no reducciones demostradas de emisiones.</Text>
      </Card>
      {/* Barra de puntos acumulados */}
      <Card tone="forest" title={`Nivel ${lvl.current.name}`}>
        <Text style={styles.points}>{total.toLocaleString('es-MX')} <Text style={styles.pointsUnit}>puntos</Text></Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(3, lvl.progress * 100)}%` }]} />
        </View>
        <Text style={[text.small, { color: colors.sprout, marginTop: space.sm }]}>
          {lvl.next
            ? `Te faltan ${(lvl.next.min - total).toLocaleString('es-MX')} puntos para ${lvl.next.name}`
            : '¡Llegaste al nivel máximo!'}
        </Text>
      </Card>

      {/* Comparación de periodos */}
      {status && (
        <Card title="Tu uso promedio: últimos 7 días vs. anteriores">
          <View style={styles.compare}>
            <View style={styles.col}>
              <Text style={[text.small, styles.muted]}>Antes · por día</Text>
              <Text style={styles.colValue}>{formatDuration(status.previous.avg_ms)}</Text>
              <Text style={[text.small, styles.muted]}>{status.previous.days} días con datos</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.col}>
              <Text style={[text.small, styles.muted]}>Ahora · por día</Text>
              <Text style={styles.colValue}>{formatDuration(status.current.avg_ms)}</Text>
              <Text style={[text.small, styles.muted]}>{status.current.days} días con datos</Text>
            </View>
          </View>

          {status.comparable && pct != null ? (
            <Text style={[text.heading, { color: pct > 0 ? colors.pine : colors.textMuted, marginTop: space.md }]}>
              {pct > 0 ? `Redujiste tu uso ${pct.toFixed(1)} %` : `Tu uso subió ${Math.abs(pct).toFixed(1)} %`}
              {status.points > 0 ? ` · ${status.points} puntos` : ''}
            </Text>
          ) : (
            <Text style={[text.body, { color: colors.text, marginTop: space.md }]}>
              Aún no podemos comparar. {status.reason} Sigue abriendo GreenPath cada día.
            </Text>
          )}

          {status.includes_demo_data && (
            <Text style={[text.small, styles.demo]}>Incluye datos de demostración</Text>
          )}

          {status.can_claim && (
            <View style={{ marginTop: space.md }}>
              <Button title={`Reclamar ${status.points} puntos`} onPress={claim} loading={claiming} />
            </View>
          )}
          {!status.can_claim && status.last_claim_window_end && (
            <Text style={[text.small, styles.muted, { marginTop: space.sm }]}>
              Ya reclamaste los puntos de este periodo. El siguiente se abre en 7 días.
            </Text>
          )}
        </Card>
      )}

      {msg && <Text style={[text.label, styles.msg]}>{msg}</Text>}

      <Card tone="mint" title="Cómo se ganan">
        <Text style={[text.body, { color: colors.text }]}>{RULE_TEXT}</Text>
        <Text style={[text.small, styles.muted, { marginTop: space.sm }]}>
          Mide reducción de tiempo de uso, no de CO₂: esa estimación sigue pendiente de un factor con fuente.
        </Text>
      </Card>

      <Card title="Canjea tus puntos">
        <Text style={[text.body, { color: colors.text }]}>
          Próximamente: recompensas de tiendas sustentables y negocios locales.
        </Text>
      </Card>

      {ledger.length > 0 && (
        <Card title="Historial">
          {ledger.map((r) => (
            <View key={r.id} style={styles.ledgerRow}>
              <Text style={[text.small, { color: colors.text, flex: 1 }]}>
                {r.reason}{r.is_demo ? ' · demo' : ''}
              </Text>
              <Text style={[text.label, { color: colors.pine }]}>+{r.points}</Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  points: { fontFamily: fonts.black, fontSize: 40, color: colors.onDark },
  pointsUnit: { fontFamily: fonts.bold, fontSize: 18, color: colors.sprout },
  track: { height: 16, borderRadius: radius.pill, backgroundColor: colors.pine, marginTop: space.md, overflow: 'hidden' },
  fill: { height: 16, borderRadius: radius.pill, backgroundColor: colors.sprout },
  compare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  col: { flex: 1, gap: 2 },
  colValue: { fontFamily: fonts.black, fontSize: 22, color: colors.forest },
  arrow: { fontFamily: fonts.black, fontSize: 22, color: colors.sprout, marginHorizontal: space.sm },
  muted: { color: colors.textMuted },
  demo: { color: colors.pending, marginTop: space.sm },
  msg: { color: colors.pine, textAlign: 'center', marginBottom: space.md },
  ledgerRow: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.mint },
});
