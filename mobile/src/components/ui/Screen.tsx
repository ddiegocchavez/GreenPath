/** Contenedor de pantalla: fondo, márgenes seguros, desplazamiento y botón opcional de volver. */
import { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, space, text } from '../../theme';

export default function Screen({ title, subtitle, children, onRefresh, refreshing = false, onBack, backLabel = 'Volver' }: {
  title: string; subtitle?: string; children: ReactNode; onRefresh?: () => void; refreshing?: boolean;
  onBack?: () => void; backLabel?: string;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
          <Text style={styles.backText}>← {backLabel}</Text>
        </Pressable>
      ) : null}
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
  back: {
    alignSelf: 'flex-start', marginLeft: space.lg, marginTop: space.sm,
    backgroundColor: colors.mint, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14,
  },
  backText: { fontFamily: fonts.bold, color: colors.forest, fontSize: 15 },
});
