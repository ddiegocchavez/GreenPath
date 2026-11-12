/** Tarjeta suave. `tone` cambia el fondo: blanco, menta o bosque (oscuro). */
import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, space, text } from '../../theme';

type Tone = 'light' | 'mint' | 'forest';

export default function Card({ children, tone = 'light', title, style }: {
  children?: ReactNode; tone?: Tone; title?: string; style?: ViewStyle;
}) {
  const bg = tone === 'forest' ? colors.forest : tone === 'mint' ? colors.mint : '#FFFFFF';
  const fg = tone === 'forest' ? colors.onDark : colors.forest;
  return (
    <View style={[styles.card, { backgroundColor: bg }, style]}>
      {title ? <Text style={[text.label, styles.title, { color: fg }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg, padding: space.lg, marginBottom: space.md,
    borderWidth: 1, borderColor: '#D3EBDB',
  },
  title: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: space.sm, opacity: 0.85 },
});
