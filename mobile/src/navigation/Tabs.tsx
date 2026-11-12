/** Las 3 secciones de GreenPath como pestañas inferiores. */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import EventsScreen from '../screens/EventsScreen';
import MonitorScreen from '../screens/MonitorScreen';
import ReduceScreen from '../screens/ReduceScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
);

export default function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sprout,
        tabBarInactiveTintColor: '#9FBFAE',
        // Sin altura fija: React Navigation suma el margen de la barra de gestos de Android.
        tabBarStyle: { backgroundColor: colors.forest, borderTopWidth: 0, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
      }}
    >
      <Tab.Screen name="Monitor" component={MonitorScreen} options={{ tabBarIcon: icon('📊') }} />
      <Tab.Screen name="Reducir" component={ReduceScreen}
        options={{ title: 'Reducir sin gastar', tabBarLabel: 'Sin gastar', tabBarIcon: icon('🌱') }} />
      <Tab.Screen name="Eventos" component={EventsScreen}
        options={{ title: 'Eventos sostenibles', tabBarIcon: icon('🎉') }} />
    </Tab.Navigator>
  );
}
