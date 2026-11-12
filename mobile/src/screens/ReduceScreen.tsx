/** Reducir: accesos rápidos, evento sostenible y recomendaciones del catálogo (UI de referencia v2). */
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import FoodScreen from './FoodScreen';
import EventsScreen from './EventsScreen';
import Screen from '../components/ui/Screen';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, space } from '../theme';

type Rec = { id: string; title: string; what_to_do: string; why: string; effort: string };
type Target = 'food' | 'digital' | 'events';
const shortcuts: { icon: string; label: string; key: Target }[] = [
  { icon: '🍴', label: 'Alimentación', key: 'food' },
  { icon: '📱', label: 'Consumo digital', key: 'digital' },
  { icon: '🥫', label: 'Mi despensa', key: 'food' },
  { icon: '🎉', label: 'Mis eventos', key: 'events' },
];

export default function ReduceScreen() {
  const navigation = useNavigation<any>();
  const [showFood, setShowFood] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await supabase.from('recommendations').select('id,title,what_to_do,why,effort')
      .eq('section', 'reducir_sin_gastar').eq('cost_level', 'sin_gasto');
    setRecs(data ?? []);
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (key: Target) => {
    if (key === 'events') setShowEvents(true);
    else if (key === 'food') setShowFood(true);
    else navigation.navigate('Mi impacto'); // el consumo digital vive en el Monitor
  };

  if (showEvents) return <EventsScreen onBack={() => setShowEvents(false)} />;
  if (showFood) return <FoodScreen onBack={() => setShowFood(false)} />;

  return (
    <Screen title="Reduce tu huella 🌱" subtitle="Elige cómo quieres reducir tu impacto." onRefresh={load} refreshing={busy}>
      <View style={styles.shortcutGrid}>
        {shortcuts.map((item, index) => (
          <Pressable key={`${item.label}-${index}`} onPress={() => open(item.key)} accessibilityRole="button"
            style={[styles.shortcut, item.key === 'events' && styles.shortcutActive]}>
            <Text style={styles.shortcutIcon}>{item.icon}</Text>
            <Text style={styles.shortcutText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Organiza un evento sostenible</Text>
      <Image source={require('../../assets/event-table.png')} style={styles.eventImage} resizeMode="cover" />
      <View style={styles.eventCard}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventTitle}>Carne asada</Text>
          <Text style={styles.badge}>Personalizable</Text>
        </View>
        <Text style={styles.eventBody}>Planea una reunión considerando presupuesto, número de invitados, alimentos y desperdicio.</Text>
        <Pressable onPress={() => setShowEvents(true)} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>Planear mi evento  →</Text>
        </Pressable>
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>GreenPath sugiere cantidades para evitar desperdicio y compara menús de menor impacto con factores publicados.</Text>
      </View>

      {recs?.map((r) => (
        <View key={r.id} style={styles.rec}>
          <Text style={styles.recTitle}>{r.title}</Text>
          <Text style={styles.recBody}>{r.what_to_do}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm, marginBottom: space.lg },
  shortcut: { width: '48.5%', minHeight: 72, borderRadius: radius.lg, borderWidth: 1, borderColor: '#D3E3D7', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', gap: 4 },
  shortcutActive: { backgroundColor: colors.mint, borderColor: colors.leaf },
  shortcutIcon: { fontSize: 20 },
  shortcutText: { color: colors.forest, fontFamily: fonts.semibold, fontSize: 13 },
  sectionTitle: { color: colors.forest, fontFamily: fonts.bold, fontSize: 18, marginBottom: space.sm },
  eventImage: { width: '100%', height: 205, borderRadius: radius.lg },
  eventCard: { backgroundColor: '#FFF', borderColor: '#D3E3D7', borderWidth: 1, borderRadius: radius.lg, padding: space.md, marginTop: space.sm, marginBottom: space.sm },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  badge: { color: colors.pine, backgroundColor: colors.mint, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, fontFamily: fonts.bold, fontSize: 12, overflow: 'hidden' },
  eventBody: { color: colors.textMuted, fontFamily: fonts.regular, lineHeight: 21, marginTop: space.sm },
  primary: { backgroundColor: colors.leaf, borderRadius: radius.pill, paddingVertical: 12, marginTop: space.md, alignItems: 'center' },
  primaryText: { color: '#FFF', fontFamily: fonts.bold, fontSize: 15 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.mint, borderRadius: radius.md, padding: space.md },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  rec: { backgroundColor: '#FFF', borderRadius: radius.md, padding: space.md, marginTop: space.sm },
  recTitle: { color: colors.forest, fontFamily: fonts.bold },
  recBody: { color: colors.textMuted, fontFamily: fonts.regular, marginTop: 4 },
});
