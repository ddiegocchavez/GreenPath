/** MVP: impacto, reducir y progreso. El módulo de eventos se conserva en el código para una fase posterior. */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import MonitorScreen from '../screens/MonitorScreen';
import ReduceScreen from '../screens/ReduceScreen';
import RewardsScreen from '../screens/RewardsScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();
const icon = (glyph: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
);
export default function Tabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.sprout,
      tabBarInactiveTintColor: '#9FBFAE',
      tabBarStyle: { backgroundColor: colors.forest, borderTopWidth: 0, paddingTop: 6 },
      tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
    }}>
      <Tab.Screen name="Mi impacto" component={MonitorScreen} options={{ tabBarIcon: icon('📊') }} />
      <Tab.Screen name="Reducir" component={ReduceScreen} options={{ tabBarIcon: icon('🌱') }} />
      <Tab.Screen name="Mi progreso" component={RewardsScreen} options={{ tabBarIcon: icon('🏆') }} />
    </Tab.Navigator>
  );
}
