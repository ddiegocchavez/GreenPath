/** Pestañas: Mi impacto · Reducir · Mi progreso. Barra clara con íconos de línea (mockups v3). */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon, { IconName } from '../components/ui/Icon';
import MonitorScreen from '../screens/MonitorScreen';
import ReduceScreen from '../screens/ReduceScreen';
import RewardsScreen from '../screens/RewardsScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator();
const icon = (name: IconName) => ({ color }: { color: string }) => <Icon name={name} size={26} color={color} />;

export default function Tabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.leaf,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E1ECE4', paddingTop: 6 },
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 13 },
    }}>
      <Tab.Screen name="Mi impacto" component={MonitorScreen} options={{ tabBarIcon: icon('chart') }} />
      <Tab.Screen name="Reducir" component={ReduceScreen} options={{ tabBarIcon: icon('leaf') }} />
      <Tab.Screen name="Mi progreso" component={RewardsScreen} options={{ tabBarIcon: icon('trophy') }} />
    </Tab.Navigator>
  );
}
