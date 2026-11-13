/** Encabezado de marca: hoja + "GreenPath" y acceso al perfil (cerrar sesión). */
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { signOut } from '../../features/auth/AuthProvider';
import { colors, fonts, space } from '../../theme';
import Icon from './Icon';

export default function AppHeader() {
  const profile = () =>
    Alert.alert('Tu cuenta', '¿Quieres cerrar sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => { signOut(); } },
    ]);
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Icon name="leaf" size={24} color={colors.leaf} />
        <Text style={styles.brandText}>GreenPath</Text>
      </View>
      <Pressable onPress={profile} accessibilityRole="button" accessibilityLabel="Perfil" hitSlop={12}>
        <Icon name="user" size={26} color={colors.forest} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontFamily: fonts.bold, fontSize: 20, color: colors.forest },
});
