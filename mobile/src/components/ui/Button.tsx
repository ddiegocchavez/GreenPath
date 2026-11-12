/** Botón grande con relieve: se hunde al pulsarlo. */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../../theme';

type Variant = 'primary' | 'secondary';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
};

const palette: Record<Variant, { bg: string; edge: string; fg: string }> = {
  primary: { bg: colors.leaf, edge: colors.pine, fg: colors.onDark },
  secondary: { bg: colors.mint, edge: colors.sprout, fg: colors.forest },
};

export default function Button({ title, onPress, variant = 'primary', loading, disabled }: Props) {
  const p = palette[variant];
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" style={{ opacity: off ? 0.6 : 1 }}>
      {({ pressed }) => (
        <View style={[styles.edge, { backgroundColor: p.edge }]}>
          <View style={[styles.face, { backgroundColor: p.bg, transform: [{ translateY: pressed ? 0 : -4 }] }]}>
            {loading ? <ActivityIndicator color={p.fg} /> : <Text style={[styles.label, { color: p.fg }]}>{title}</Text>}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: { borderRadius: radius.md, marginTop: 4 },
  face: { borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  label: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3 },
});
