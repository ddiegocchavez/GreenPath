/** Reducir sin gastar: recomendaciones del catálogo curado que no cuestan dinero. */
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import Card from '../components/ui/Card';
import Screen from '../components/ui/Screen';
import { supabase } from '../lib/supabase';
import { colors, text } from '../theme';

type Rec = { id: string; title: string; what_to_do: string; why: string; effort: string };

export default function ReduceScreen() {
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

  return (
    <Screen title="Reducir sin gastar" subtitle="Un paso para hoy, sin gastar un peso" onRefresh={load} refreshing={busy}>
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
