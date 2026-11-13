/**
 * Mi progreso: evolución semanal del uso MEDIDO (no CO2e), retos (user_choices),
 * puntos por reducir tiempo de uso (points_ledger, otorgados en el servidor) y recompensas.
 * Diseño: docs/producto/mockups/progreso-v3.png
 */
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import LineChart from '../components/charts/LineChart';
import Icon from '../components/ui/Icon';
import Screen from '../components/ui/Screen';
import { Choice, getChoices, getWeeklyAverages, markDone, WeekPoint } from '../features/progress/progress';
import {
  claimWeeklyPoints, getLedger, getWeeklyStatus, LedgerRow, levelFor, RULE_TEXT, WeeklyStatus,
} from '../features/rewards/rewards';
import { syncPastDays } from '../features/sync/syncUsage';
import { colors, fonts, radius, space } from '../theme';

const OWN_APP_ID = 'com.greenpath.app';
const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d}/${m}`;
};

export default function RewardsScreen() {
  const navigation = useNavigation<any>();
  const [weeks, setWeeks] = useState<WeekPoint[]>([]);
  const [status, setStatus] = useState<WeeklyStatus | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [showRetos, setShowRetos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      await syncPastDays(OWN_APP_ID).catch(() => 0);
      const [w, s, l, c] = await Promise.all([getWeeklyAverages(4), getWeeklyStatus(), getLedger(), getChoices()]);
      setWeeks(w); setStatus(s); setLedger(l); setChoices(c);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => navigation.addListener('focus', load), [navigation, load]);

  const claim = async () => {
    setClaiming(true);
    try {
      const r = await claimWeeklyPoints();
      await load();
      setMsg(r.ok ? `¡Sumaste ${r.points} puntos! 🎉` : 'No hay puntos por reclamar en este periodo.');
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setClaiming(false);
  };

  const complete = async (c: Choice) => {
    try { await markDone(c.id); await load(); setMsg('¡Reto completado! 🌱'); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };

  const total = ledger.reduce((a, r) => a + r.points, 0);
  const lvl = levelFor(total);
  const done = choices.filter((c) => c.status === 'realizada');
  const next = choices.find((c) => c.status === 'elegida');
  const demo = weeks.some((w) => w.demo);
  const hasData = weeks.some((w) => w.avgMs != null);
  const pct = status?.reduction_pct != null ? Number(status.reduction_pct) : null;

  return (
    <Screen brand title="Mi progreso" subtitle="Mira cómo avanzas." onRefresh={load} refreshing={busy}>
      <Image source={require('../../assets/hero-progreso.jpg')} style={styles.hero} resizeMode="cover" />

      {/* Evolución: uso medido por semana */}
      <View style={styles.evo}>
        <View style={styles.evoHead}>
          <Icon name="leaf" size={26} color={colors.forest} />
          <Text style={styles.evoTitle}>Tu evolución</Text>
          <Text style={styles.chip}>{demo ? 'Incluye demo' : 'Medido'}</Text>
        </View>
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>Uso promedio por día (horas) · por semana</Text>
          {hasData ? (
            <LineChart
              points={weeks.map((w) => ({
                label: shortDate(w.start),
                value: w.avgMs == null ? null : w.avgMs / 3600000,
                caption: w.avgMs == null ? undefined : `${(w.avgMs / 3600000).toFixed(1)} h`,
              }))}
              format={(v) => v.toFixed(1)}
            />
          ) : (
            <Text style={styles.body}>Aún no hay semanas con datos. Abre GreenPath cada día para ver tu evolución.</Text>
          )}
        </View>
        <Text style={styles.note}>Tiempo de uso medido en este teléfono · no es CO₂e.</Text>
      </View>

      {/* Retos y puntos */}
      <View style={styles.card}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="check" size={30} color={colors.forest} />
            <View style={{ flex: 1 }}><Text style={styles.statLabel}>Retos completados</Text><Text style={styles.statValue}>{done.length}</Text></View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Icon name="trophy" size={30} color={colors.forest} />
            <View><Text style={styles.statLabel}>Tus puntos</Text><Text style={styles.statValue}>{total.toLocaleString('es-MX')}</Text></View>
          </View>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, lvl.progress * 100)}%` }]} /></View>
        <Text style={styles.note}>
          Nivel {lvl.current.name}{lvl.next ? ` · faltan ${(lvl.next.min - total).toLocaleString('es-MX')} para ${lvl.next.name}` : ''} · Los puntos reconocen que reduces tu tiempo de uso.
        </Text>
        {status?.comparable && pct != null && (
          <Text style={[styles.body, { marginTop: space.sm }]}>
            {pct > 0 ? `Esta semana redujiste tu uso ${pct.toFixed(1)} %.` : `Esta semana tu uso subió ${Math.abs(pct).toFixed(1)} %.`}
          </Text>
        )}
        {status && !status.comparable && <Text style={styles.note}>{status.reason}</Text>}
        {status?.can_claim && (
          <Pressable onPress={claim} disabled={claiming} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>{claiming ? 'Reclamando…' : `Reclamar ${status.points} puntos`}</Text>
          </Pressable>
        )}
      </View>

      {msg && <Text style={styles.msg}>{msg}</Text>}

      {/* Próximo reto */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu próximo reto</Text>
        {next ? (
          <Pressable onPress={() => complete(next)} style={styles.retoRow} accessibilityRole="button">
            <Icon name="circle" size={30} color={colors.forest} />
            <Text style={styles.retoText}>{next.recommendations?.title ?? next.recommendation_id}</Text>
            <Text style={styles.retoHint}>Hecho</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.navigate('Reducir')} style={styles.retoRow} accessibilityRole="button">
            <Icon name="circle" size={30} color={colors.textMuted} />
            <Text style={styles.retoText}>Elige una alternativa en Reducir</Text>
            <Icon name="chevron" size={22} color={colors.forest} />
          </Pressable>
        )}
      </View>

      {/* Recompensas */}
      <View style={[styles.card, styles.rewardRow]}>
        <Icon name="gift" size={34} color={colors.forest} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Recompensas</Text>
          <Text style={styles.statLabel}>Comercios aliados · Próximamente</Text>
        </View>
        <Icon name="chevron" size={22} color={colors.forest} />
      </View>

      <Pressable onPress={() => setShowRetos((v) => !v)} style={styles.primary} accessibilityRole="button">
        <Text style={styles.primaryText}>{showRetos ? 'Ocultar mis retos' : 'Ver mis retos  →'}</Text>
      </Pressable>

      {showRetos && (
        <View style={[styles.card, { marginTop: space.lg }]}>
          {choices.length === 0 && <Text style={styles.body}>Aún no eliges retos. En Reducir, toca "Esto sí va conmigo".</Text>}
          {choices.map((c) => (
            <View key={c.id} style={styles.retoRow}>
              <Icon name={c.status === 'realizada' ? 'check' : 'circle'} size={24} color={colors.forest} />
              <Text style={styles.retoText}>{c.recommendations?.title ?? c.recommendation_id}</Text>
              <Text style={styles.retoHint}>{c.status === 'realizada' ? 'Realizado' : 'Elegido'}</Text>
            </View>
          ))}
          <Text style={styles.note}>Elegir un reto no es lo mismo que realizarlo. {RULE_TEXT}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 150, borderRadius: radius.lg, marginBottom: space.lg },
  evo: { backgroundColor: colors.mint, borderRadius: radius.lg, padding: space.lg, marginBottom: space.lg },
  evoHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  evoTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 22, color: colors.forest },
  chip: { backgroundColor: '#E9F4EC', borderWidth: 1, borderColor: '#CFE0D4', color: colors.forest, fontFamily: fonts.semibold, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  chartCard: { backgroundColor: '#FFF', borderRadius: radius.md, padding: space.md },
  chartLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, marginBottom: space.sm },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: space.sm, lineHeight: 18 },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 21 },
  card: { backgroundColor: '#FFF', borderRadius: radius.lg, borderWidth: 1, borderColor: '#D9E8DD', padding: space.lg, marginBottom: space.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.sm },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#E1ECE4', marginHorizontal: space.sm },
  statLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, flexShrink: 1 },
  statValue: { fontFamily: fonts.bold, fontSize: 32, color: colors.forest },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.mint, overflow: 'hidden', marginTop: space.md },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.leaf },
  cardTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.forest },
  retoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md },
  retoText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  retoHint: { fontFamily: fonts.semibold, fontSize: 13, color: colors.pine },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  primary: { backgroundColor: colors.leaf, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: space.md },
  primaryText: { color: '#FFF', fontFamily: fonts.bold, fontSize: 18 },
  msg: { fontFamily: fonts.bold, color: colors.pine, textAlign: 'center', marginBottom: space.md },
});
