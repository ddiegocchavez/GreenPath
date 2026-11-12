/**
 * Pantalla temporal del Hito 1: demuestra lectura real del uso de apps.
 * Se reemplaza por las pantallas de GreenPath cuando la lectura esté validada.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { openPermissionSettings, readTodayUsage, UsageResult } from '../features/usage/usageReader';

const OWN_APP_ID = 'com.greenpath.app';

function formatMinutes(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)} s`;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export default function UsageDebugScreen() {
  const [result, setResult] = useState<UsageResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setResult(await readTodayUsage(OWN_APP_ID));
    setLoading(false);
  }, []);

  // Consulta al abrir y al volver a la app (p. ej. desde Ajustes).
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Uso de hoy</Text>

      {loading && <ActivityIndicator />}

      {result?.status === 'no_permission' && (
        <View style={styles.card}>
          <Text style={styles.text}>
            Para ver tu actividad sin capturarla a mano, GreenPath necesita el permiso de acceso al uso.
          </Text>
          <Pressable style={styles.button} onPress={openPermissionSettings}>
            <Text style={styles.buttonText}>Abrir ajustes</Text>
          </Pressable>
        </View>
      )}

      {result?.status === 'error' && (
        <View style={styles.card}>
          <Text style={styles.text}>No pudimos leer tu actividad: {result.message}</Text>
        </View>
      )}

      {result?.status === 'empty' && (
        <View style={styles.card}>
          <Text style={styles.text}>Todavía no hay uso registrado hoy. Usa otra app y vuelve.</Text>
        </View>
      )}

      {result?.status === 'ok' && (
        <>
          <Text style={styles.meta}>
            Medido desde las 00:00 · actualizado {result.snapshot.observedAt.toLocaleTimeString()}
          </Text>
          <FlatList
            data={result.snapshot.items}
            keyExtractor={(i) => i.appId}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.app}>{item.appLabel}</Text>
                  <Text style={styles.pkg}>{item.appId}</Text>
                </View>
                <Text style={styles.time}>{formatMinutes(item.foregroundMs)}</Text>
              </View>
            )}
          />
        </>
      )}

      <Pressable style={styles.button} onPress={refresh}>
        <Text style={styles.buttonText}>Actualizar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: '#F7FBF5' },
  title: { fontSize: 26, fontWeight: '800', color: '#1E2A22', marginBottom: 8 },
  meta: { color: '#55665A', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginVertical: 12 },
  text: { fontSize: 16, color: '#1E2A22' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E3EDE5' },
  app: { fontSize: 16, fontWeight: '700', color: '#1E2A22' },
  pkg: { fontSize: 12, color: '#7A8A7E' },
  time: { fontSize: 16, fontWeight: '700', color: '#168A46' },
  button: {
    backgroundColor: '#1FAF5A', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 4, borderColor: '#168A46', marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
