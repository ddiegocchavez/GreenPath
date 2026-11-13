/**
 * Reducir: preferencias (tabla preferences), receta con lo que tienes (despensa local)
 * y alternativas del catálogo curado (tabla recommendations), filtradas por esfuerzo y costo.
 * "Esto sí va conmigo" registra una intención (user_choices), no una acción realizada.
 * Diseño: docs/producto/mockups/reducir-v3.png
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon, { IconName } from '../components/ui/Icon';
import Screen from '../components/ui/Screen';
import { loadPantry, RECIPES, suggestRecipes } from '../features/food';
import {
  BUDGET_LABEL, Budget, CHANGES, describePreferences, Effort, EFFORT_LABEL, getPreferences, Preferences, savePreferences,
} from '../features/preferences/preferences';
import { chooseRecommendation, getChoices } from '../features/progress/progress';
import { filterForUser, getRecommendations, Recommendation } from '../features/recommendations/recommendations';
import { colors, fonts, radius, space } from '../theme';
import EventsScreen from './EventsScreen';
import FoodScreen from './FoodScreen';

type RecipeView = { name: string; ingredients: string[]; missing: string[]; tip: string };

const iconFor = (r: Recommendation): IconName => (r.tags.includes('digital') ? 'phone' : 'leaf');

export default function ReduceScreen() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [recipe, setRecipe] = useState<RecipeView | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<'food' | 'events' | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [p, r, c, pantry] = await Promise.all([getPreferences(), getRecommendations(), getChoices(), loadPantry()]);
      setPrefs(p);
      setRecs(filterForUser(r, p));
      setChosen(new Set(c.filter((x) => x.status !== 'descartada').map((x) => x.recommendation_id)));
      const best = suggestRecipes(pantry)[0];
      setRecipe(best ? { ...best, ingredients: [...best.ingredients] } : { ...RECIPES[0], ingredients: [...RECIPES[0].ingredients], missing: [...RECIPES[0].ingredients] });
    } catch (e) {
      Alert.alert('No se pudo cargar', e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (open === 'food') return <FoodScreen onBack={() => { setOpen(null); load(); }} />;
  if (open === 'events') return <EventsScreen onBack={() => setOpen(null)} />;

  const savePrefs = async () => {
    if (!draft) return;
    try { await savePreferences(draft); setDraft(null); await load(); }
    catch (e) { Alert.alert('No se pudo guardar', e instanceof Error ? e.message : String(e)); }
  };

  const choose = async (r: Recommendation) => {
    try { await chooseRecommendation(r.id); setChosen(new Set([...chosen, r.id])); }
    catch (e) { Alert.alert('No se pudo guardar', e instanceof Error ? e.message : String(e)); }
  };

  const nextOption = (id: string) => {
    const i = recs.findIndex((r) => r.id === id);
    setExpanded(recs[(i + 1) % recs.length]?.id ?? null);
  };

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button">
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const have = recipe ? recipe.ingredients.filter((i) => !recipe.missing.includes(i)) : [];

  return (
    <Screen brand title="Reducir" subtitle="Opciones para tu día a día" onRefresh={load} refreshing={busy}>
      {/* Preferencias */}
      <View style={styles.prefCard}>
        <View style={styles.prefRow}>
          <Icon name="sliders" size={30} color={colors.forest} />
          <View style={styles.prefDivider} />
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Tus preferencias</Text>
            <Text style={styles.muted}>{describePreferences(prefs)}</Text>
          </View>
          <Pressable onPress={() => setDraft(draft ? null : prefs)} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.edit}>{draft ? 'Cerrar' : 'Editar'}</Text>
          </Pressable>
        </View>
        {draft && (
          <View style={styles.editor}>
            <Text style={styles.label}>Presupuesto</Text>
            <View style={styles.chips}>{(Object.keys(BUDGET_LABEL) as Budget[]).map((b) => chip(BUDGET_LABEL[b], draft.budget === b, () => setDraft({ ...draft, budget: b })))}</View>
            <Text style={styles.label}>Esfuerzo que aceptas</Text>
            <View style={styles.chips}>{(Object.keys(EFFORT_LABEL) as Effort[]).map((e) => chip(EFFORT_LABEL[e], draft.effort === e, () => setDraft({ ...draft, effort: e })))}</View>
            <Text style={styles.label}>Cambios que te interesan</Text>
            <View style={styles.chips}>{CHANGES.map((c) => chip(c.label, draft.willing_changes.includes(c.key), () =>
              setDraft({ ...draft, willing_changes: draft.willing_changes.includes(c.key) ? draft.willing_changes.filter((k) => k !== c.key) : [...draft.willing_changes, c.key] })))}</View>
            <Pressable onPress={savePrefs} style={[styles.primary, { marginTop: space.md }]} accessibilityRole="button">
              <Text style={styles.primaryText}>Guardar preferencias</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Aprovecha lo que tienes */}
      <Text style={styles.section}>Aprovecha lo que tienes</Text>
      {recipe && (
        <View style={styles.recipeCard}>
          <Image source={require('../../assets/hero-reducir.jpg')} style={styles.recipeImg} resizeMode="cover" />
          {recipe.name !== RECIPES[0].name && <Text style={styles.imgNote}>Imagen ilustrativa</Text>}
          <View style={styles.recipeHead}>
            <Text style={styles.recipeTitle}>{recipe.name}</Text>
            <Text style={styles.badge}>{recipe.missing.length === 0 ? 'Tienes todo' : `Te faltan ${recipe.missing.length}`}</Text>
          </View>
          <Text style={styles.body}>
            {have.length ? `Usa lo que ya tienes: ${have.join(', ').toLowerCase()}.` : `Ingredientes: ${recipe.ingredients.join(', ').toLowerCase()}.`}
            {have.length && recipe.missing.length ? ` Te falta: ${recipe.missing.join(', ').toLowerCase()}.` : ''}
          </Text>
          <Text style={styles.small}>{have.length ? recipe.tip : 'Marca lo que tienes en Mi despensa para sugerencias a tu medida.'}</Text>
          <Pressable onPress={() => setOpen('food')} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>Ver receta  →</Text>
          </Pressable>
        </View>
      )}

      {/* Alternativas para ti (catálogo) */}
      <View style={styles.altCard}>
        <View style={styles.altHead}>
          <Icon name="leaf" size={26} color={colors.forest} />
          <Text style={styles.altTitle}>Alternativas para ti</Text>
        </View>
        {recs.length === 0 && <Text style={[styles.body, { padding: space.lg }]}>No hay alternativas con tus preferencias actuales. Prueba aceptar más esfuerzo o presupuesto.</Text>}
        {recs.map((r, i) => (
          <View key={r.id} style={[styles.altItem, i > 0 && styles.altBorder]}>
            <Pressable onPress={() => setExpanded(expanded === r.id ? null : r.id)} style={styles.altRow} accessibilityRole="button">
              {iconFor(r) === 'phone' ? <Icon name="phone" size={26} color={colors.forest} /> : null}
              <Text style={styles.altText}>{r.title}</Text>
              <View style={{ transform: [{ rotate: expanded === r.id ? '90deg' : '0deg' }] }}>
                <Icon name="chevron" size={22} color={colors.forest} />
              </View>
            </Pressable>
            {expanded === r.id && (
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>Qué hacer</Text><Text style={styles.body}>{r.what_to_do}</Text>
                <Text style={styles.detailLabel}>Por qué</Text><Text style={styles.body}>{r.why}</Text>
                <Text style={styles.detailLabel}>Datos y supuestos</Text><Text style={styles.small}>{r.data_and_assumptions}</Text>
                <Text style={styles.small}>Impacto: {r.impact_note} · Esfuerzo: {EFFORT_LABEL[r.effort].toLowerCase()} · {r.cost_note ?? (r.cost_level === 'sin_gasto' ? 'Sin gasto' : `Costo ${r.cost_level}`)}</Text>
                {r.sources.map((s) => (
                  <Pressable key={s.url} onPress={() => Linking.openURL(s.url)}><Text style={styles.source}>Fuente: {s.title} ↗</Text></Pressable>
                ))}
                <View style={styles.actions}>
                  <Pressable onPress={() => choose(r)} disabled={chosen.has(r.id)} style={[styles.primary, styles.action, chosen.has(r.id) && styles.done]} accessibilityRole="button">
                    <Text style={styles.primaryText}>{chosen.has(r.id) ? '✓ Va contigo' : 'Esto sí va conmigo'}</Text>
                  </Pressable>
                  <Pressable onPress={() => nextOption(r.id)} style={[styles.secondary, styles.action]} accessibilityRole="button">
                    <Text style={styles.secondaryText}>Ver otra opción</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Accesos */}
      <View style={styles.tiles}>
        <Pressable onPress={() => setOpen('food')} style={styles.tile} accessibilityRole="button">
          <Icon name="fridge" size={34} color={colors.forest} /><Text style={styles.tileText}>Mi despensa</Text>
        </Pressable>
        <Pressable onPress={() => setOpen('events')} style={styles.tile} accessibilityRole="button">
          <Icon name="party" size={34} color={colors.forest} /><Text style={styles.tileText}>Mis eventos</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prefCard: { backgroundColor: '#FFF', borderRadius: radius.lg, borderWidth: 1, borderColor: '#D9E8DD', padding: space.lg, marginBottom: space.xl },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  prefDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#E1ECE4' },
  prefTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.forest },
  edit: { fontFamily: fonts.semibold, fontSize: 17, color: colors.forest },
  editor: { marginTop: space.md, borderTopWidth: 1, borderColor: '#E1ECE4', paddingTop: space.sm },
  label: { fontFamily: fonts.bold, color: colors.forest, marginTop: space.md, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: '#CFE0D4', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFF' },
  chipActive: { backgroundColor: colors.mint, borderColor: colors.leaf },
  chipText: { fontFamily: fonts.semibold, color: colors.text },
  chipTextActive: { color: colors.forest },
  section: { fontFamily: fonts.semibold, fontSize: 20, color: colors.forest, marginBottom: space.md },
  recipeCard: { backgroundColor: '#FFF', borderRadius: radius.lg, borderWidth: 1, borderColor: '#D9E8DD', padding: space.md, marginBottom: space.xl },
  recipeImg: { width: '100%', height: 200, borderRadius: radius.md },
  imgNote: { position: 'absolute', top: space.md + 8, left: space.md + 8, backgroundColor: 'rgba(15,61,46,0.75)', color: '#FFF', fontFamily: fonts.semibold, fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, overflow: 'hidden' },
  recipeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md, gap: space.sm },
  recipeTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.forest, flex: 1 },
  badge: { backgroundColor: colors.mint, color: colors.forest, fontFamily: fonts.semibold, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 21, marginTop: 4 },
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: 6 },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  primary: { backgroundColor: colors.leaf, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: space.md },
  primaryText: { color: '#FFF', fontFamily: fonts.bold, fontSize: 16 },
  secondary: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.leaf, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center', marginTop: space.md },
  secondaryText: { color: colors.forest, fontFamily: fonts.bold, fontSize: 15 },
  altCard: { backgroundColor: '#F4FAF5', borderRadius: radius.lg, borderWidth: 1, borderColor: '#D9E8DD', overflow: 'hidden', marginBottom: space.xl },
  altHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.mint, padding: space.lg },
  altTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.forest },
  altItem: { paddingHorizontal: space.lg },
  altBorder: { borderTopWidth: 1, borderColor: '#E1ECE4' },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  altText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.forest },
  detail: { paddingBottom: space.lg },
  detailLabel: { fontFamily: fonts.bold, color: colors.forest, marginTop: space.sm },
  source: { fontFamily: fonts.semibold, fontSize: 13, color: colors.pine, marginTop: 6, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
  done: { backgroundColor: colors.pine },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: '#FFF', borderRadius: radius.lg, borderWidth: 1, borderColor: '#D9E8DD', padding: space.lg },
  tileText: { fontFamily: fonts.regular, fontSize: 17, color: colors.forest },
});
