/** Contenedor de pantalla: fondo, márgenes seguros y desplazamiento. */
import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space, text } from '../../theme';

export default function Screen({ title, subtitle, children, onRefresh, refreshing = false }: {
  title: string; subtitle?: string; children: ReactNode; onRefresh?: () => void; refreshing?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.leaf]} />
        ) : undefined}
      >
        <View style={styles.header}>
          <Text style={[text.title, { color: colors.forest }]}>{title}</Text>
          {subtitle ? <Text style={[text.body, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.mist },
  content: { padding: space.lg, paddingBottom: space.xxl },
  header: { marginBottom: space.lg, gap: 2 },
});
