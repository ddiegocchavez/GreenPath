import {
  Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_900Black, useFonts,
} from '@expo-google-fonts/nunito';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './features/auth/AuthProvider';
import Tabs from './navigation/Tabs';
import AuthScreen from './screens/AuthScreen';
import { colors } from './theme';

function Root() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest }}>
        <ActivityIndicator color={colors.sprout} />
      </View>
    );
  }
  return session ? (
    <NavigationContainer><Tabs /></NavigationContainer>
  ) : (
    <AuthScreen />
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_900Black });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.forest }} />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
