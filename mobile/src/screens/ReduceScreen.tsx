/** Reducir sin gastar: recomendaciones del catálogo curado que no cuestan dinero. */
import { useCallback, useEffect, useState } from 'react';
import { Text, Pressable, View } from 'react-native';
import FoodScreen from './FoodScreen';
import EventsScreen from './EventsScreen';
import Card from '../components/ui/Card';
import Screen from '../components/ui/Screen';
import { supabase } from '../lib/supabase';
import { colors, text } from '../theme';

type Rec = { id: string; title: string; what_to_do: string; why: string; effort: string };

export default function ReduceScreen() {
  const [showFood, setShowFood] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await supabase
      .from('recommendations')
      .select('id,title,what_to_do,why,effort')
      .eq('section', 'reducir_sin_gastar')
      .eq('cost_level', 'sin_gasto');
    setRecs(data ?? []);
    setBusy(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (showEvents) return <EventsScreen onBack={() => setShowEvents(false)} />;
  if (showFood) return <FoodScreen onBack={() => setShowFood(false)} />;

  return (
    <Screen title="Reducir" subtitle="Cambios posibles según tus hábitos y presupuesto" onRefresh={load} refreshing={busy}>
      <Card tone="mint" title="🍎 Alimentación: aprovecha lo que tienes">
        <Text style={[text.body, { color: colors.text }]}>Registra los ingredientes de tu casa y descubre recetas para evitar compras innecesarias y posible desperdicio.</Text>
        <Pressable onPress={() => setShowFood(true)} style={{ marginTop: 12, backgroundColor: colors.forest, padding: 12, borderRadius: 12 }}>
          <Text style={{ color: colors.onDark, textAlign: 'center' }}>Abrir mi alimentación →</Text>
        </Pressable>
      </Card>
      <Card tone="mint" title="🎉 Mis eventos: carne asada">
        <Text style={[text.body, { color: colors.text }]}>Planea invitados, presupuesto y cantidades; compara menus y registra sobrantes para reducir desperdicio.</Text>
        <Pressable onPress={() => setShowEvents(true)} style={{ marginTop: 12, backgroundColor: colors.forest, padding: 12, borderRadius: 12 }}>
          <Text style={{ color: colors.onDark, textAlign: 'center' }}>Planear mi carne asada →</Text>
        </Pressable>
      </Card>
      <Card title="📱 Consumo digital">
        <Text style={[text.body, { color: colors.text }]}>Consulta tu actividad real en Mi impacto. Reducir minutos no equivale automáticamente a reducir CO₂e.</Text>
      </Card>
      {recs?.length === 0 && (
        <Card tone="mint" title="Catálogo en preparación">
          <Text style={[text.body, { color: colors.text }]}>
            Estamos curando recomendaciones con fuente. Pronto verás aquí cambios que sí van contigo.
          </Text>
        </Card>
      )}
      {recs?.map((r) => (
        <Card key={r.id} title={`Esfuerzo ${r.effort}`}>
          <Text style={[text.heading, { color: colors.forest }]}>{r.title}</Text>
          <Text style={[text.body, { color: colors.text, marginTop: 6 }]}>{r.what_to_do}</Text>
        </Card>
      ))}
    </Screen>
  );
}
