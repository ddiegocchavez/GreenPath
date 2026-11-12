/** Registro e inicio de sesión con correo y contraseña. */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/ui/Button';
import { signIn, signUp } from '../features/auth/AuthProvider';
import { colors, fonts, radius, space, text } from '../theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    if (!email.includes('@') || password.length < 8) {
      setMsg('Escribe un correo válido y una contraseña de al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    if (mode === 'login') {
      const err = await signIn(email, password);
      if (err) setMsg(err === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err);
    } else {
      const r = await signUp(email, password);
      if (r.error) setMsg(r.error);
      else if (r.needsConfirmation) setMsg('Te enviamos un correo para confirmar tu cuenta.');
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.hero}>
          <Text style={styles.logo}>GreenPath</Text>
          <Text style={[text.body, styles.tagline]}>
            Haz visible tu impacto y encuentra cambios que sí van contigo.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input} placeholder="Correo" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" keyboardType="email-address" autoComplete="email"
            value={email} onChangeText={setEmail}
          />
          <TextInput
            style={styles.input} placeholder="Contraseña (mín. 8)" placeholderTextColor={colors.textMuted}
            secureTextEntry autoComplete={mode === 'login' ? 'password' : 'new-password'}
            value={password} onChangeText={setPassword}
          />
          {msg ? <Text style={[text.small, styles.msg]}>{msg}</Text> : null}
          <Button title={mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} loading={busy} />
          <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}>
            <Text style={styles.switch}>
              {mode === 'login' ? '¿Primera vez? Crea tu cuenta' : '¿Ya tienes cuenta? Entra'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.forest },
  wrap: { flex: 1, justifyContent: 'space-between' },
  hero: { padding: space.xl, paddingTop: space.xxl * 2 },
  logo: { fontFamily: fonts.black, fontSize: 42, color: colors.sprout },
  tagline: { color: colors.onDark, marginTop: space.sm, fontSize: 18, lineHeight: 25 },
  form: {
    backgroundColor: colors.mist, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: space.xl, gap: space.md,
  },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 2, borderColor: colors.mint,
    paddingHorizontal: space.lg, paddingVertical: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.text,
  },
  msg: { color: colors.error },
  switch: { textAlign: 'center', fontFamily: fonts.bold, color: colors.pine, padding: space.sm },
});
