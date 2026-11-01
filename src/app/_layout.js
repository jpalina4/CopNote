/**
 * Root layout (Expo Router). Every screen in src/app is rendered inside this.
 *
 * Provider order matters:
 *   SQLiteProvider  – opens the database and runs migrations BEFORE any screen renders
 *   AuthProvider    – needs the database, so it sits inside SQLiteProvider
 *   RootNavigator   – needs auth state to decide which screens are allowed
 */
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingView } from '../components/StateViews';
import { colors } from '../components/theme';
import { AuthProvider, useAuth } from '../services/AuthContext';
import { DATABASE_NAME, migrateDbIfNeeded } from '../database/schema';
import LockScreen from '../screens/LockScreen';

const headerStyle = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

function RootNavigator() {
  const { officer, locked, restoring, reportActivity } = useAuth();
  if (restoring) return <LoadingView message="Starting CopNote…" />;
  const signedIn = Boolean(officer);

  return (
    // onStartShouldSetResponderCapture sees EVERY touch first. We note the
    // activity and return false so the touch carries on to its real target.
    <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { reportActivity(); return false; }}>
      <View style={{ flex: 1 }} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={locked}>
        <Stack screenOptions={headerStyle}>
          {/* Protected routes: screens only exist while their guard is true.
              Logging in or out automatically redirects to an allowed screen. */}
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ title: 'Officer registration' }} />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="page/[id]" options={{ title: 'Page' }} />
            <Stack.Screen name="edit/[id]" options={{ title: 'Edit draft' }} />
          </Stack.Protected>
        </Stack>
      </View>
      {signedIn && locked ? <LockScreen /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
