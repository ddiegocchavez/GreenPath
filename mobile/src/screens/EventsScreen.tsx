/** Eventos sostenibles: carne asada y fiesta, con lista y productos del catálogo curado. */
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import Card from '../components/ui/Card';
import Screen from '../components/ui/Screen';
import { supabase } from '../lib/supabase';
import { colors, text } from '../theme';

type Ev = { id: string; name: string; description: string | null };

export default function EventsScreen() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await supabase.from('events').select('id,name,description');
    setEvents(data ?? []);
    setBusy(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen title="Eventos sostenibles" subtitle="¿Qué se arma? Planea con menos impacto" onRefresh={load} refreshing={busy}>
      {events?.length === 0 && (
        <Card tone="mint" title="En preparación">
          <Text style={[text.body, { color: colors.text }]}>
            Pronto: carnes asadas y fiestas con productos sustentables y enlaces verificados.
          </Text>
        </Card>
      )}
      {events?.map((e) => (
        <Card key={e.id}>
          <Text style={[text.heading, { color: colors.forest }]}>{e.name}</Text>
          {e.description ? <Text style={[text.body, { color: colors.text }]}>{e.description}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}
