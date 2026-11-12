/** MVP de alimentación: aprovechar lo que ya existe, sin inventar CO₂e evitado. */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Card from '../components/ui/Card';
import Screen from '../components/ui/Screen';
import { INGREDIENTS, Ingredient, loadPantry, savePantry, suggestRecipes } from '../features/food';
import { colors, fonts, space, text } from '../theme';

export default function FoodScreen({ onBack }: { onBack?: () => void } = {}) {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { loadPantry().then(v => { setItems(v); setLoaded(true); }); }, []);
  const toggle = async (ingredient: Ingredient) => {
    const next = items.includes(ingredient) ? items.filter(i => i !== ingredient) : [...items, ingredient];
    setItems(next);
    await savePantry(next);
  };
  const recipes = suggestRecipes(items).slice(0, 4);
  return (
    <Screen title="Mi alimentación" subtitle="Aprovecha lo que tienes antes de comprar más" onBack={onBack} backLabel="Volver a Reducir">
      <Card tone="forest" title="Tu despensa">
        <Text style={[text.body, { color: colors.onDark }]}>Selecciona los alimentos que ya tienes en casa. No necesitas comprar productos caros para comenzar.</Text>
      </Card>
      <Card title="¿Qué tienes hoy?">
        <View style={styles.chips}>
          {INGREDIENTS.map(i => (
            <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: items.includes(i) }} onPress={() => toggle(i)} style={[styles.chip, items.includes(i) && styles.selected]}>
              <Text style={[styles.chipText, items.includes(i) && styles.selectedText]}>{items.includes(i) ? '✓ ' : '+ '}{i}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card tone="mint" title="Recetas con lo que ya tienes">
        {!loaded || items.length === 0 ? <Text style={text.body}>Selecciona ingredientes para recibir sugerencias sin usar IA.</Text> : recipes.map(r => (
          <View key={r.name} style={styles.recipe}>
            <Text style={[text.heading, { color: colors.forest }]}>{r.name}</Text>
            <Text style={[text.body, { color: colors.text }]}>{r.missing.length === 0 ? '✓ Tienes todos los ingredientes' : `Te falta: ${r.missing.join(', ')}`}</Text>
            <Text style={[text.small, { color: colors.textMuted }]}>{r.tip}</Text>
          </View>
        ))}
        {loaded && items.length > 0 && recipes.length === 0 && <Text style={text.body}>Aún no hay coincidencias. Agrega más ingredientes.</Text>}
      </Card>
      <Card title="¿Cuánto carbono evitaste?">
        <Text style={[text.body, { color: colors.text }]}>Todavía no hay una cifra verificable. Tener ingredientes o ver recetas no demuestra que se evitó desperdicio. En la siguiente etapa registraremos alimentos efectivamente aprovechados y compararemos contra una línea base con factores de emisión documentados.</Text>
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderRadius: 18, backgroundColor: colors.mint, paddingHorizontal: 12, paddingVertical: 9 },
  selected: { backgroundColor: colors.forest },
  chipText: { color: colors.forest, fontFamily: fonts.bold },
  selectedText: { color: colors.onDark },
  recipe: { gap: 4, paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.sprout },
});
