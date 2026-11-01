/** Bottom tab bar shown after login: Dashboard, Notebook, New page. */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../components/theme';

/** Returns the tabBarIcon function React Navigation calls with the current colour and size. */
const icon = (name) =>
  function TabIcon({ color, size }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.brandRed,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { minHeight: 60 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: icon('speedometer-outline') }} />
      <Tabs.Screen name="notebook" options={{ title: 'Notebook', tabBarIcon: icon('book-outline') }} />
      <Tabs.Screen name="new" options={{ title: 'New page', tabBarIcon: icon('add-circle-outline') }} />
    </Tabs>
  );
}
