/**
 * Tab bar shown after login: Dashboard, Notebook, New page.
 * At the bottom on a phone; down the left side in a wide window.
 */
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, headerBar, WIDE_SCREEN } from '../../components/theme';

/** Returns the tabBarIcon function React Navigation calls with the current colour and size. */
const icon = (name) =>
  function TabIcon({ color, size }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_SCREEN;
  return (
    <Tabs
      screenOptions={{
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
        ...headerBar,
        tabBarActiveTintColor: colors.primary,
        tabBarActiveBackgroundColor: wide ? colors.background : 'transparent',
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: wide ? { width: 180 } : { minHeight: 60 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: icon('speedometer-outline') }} />
      <Tabs.Screen name="notebook" options={{ title: 'Notebook', tabBarIcon: icon('book-outline') }} />
      <Tabs.Screen name="new" options={{ title: 'New page', tabBarIcon: icon('add-circle-outline') }} />
    </Tabs>
  );
}
