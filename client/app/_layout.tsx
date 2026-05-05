import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ColorSchemeProvider } from '@/hooks/useColorScheme';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const rootState = useRootNavigationState();
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!rootState?.key || isLoading) return;

    const inLoginRoute = segments.includes('login');

    if (!isAuthenticated && !inLoginRoute) {
      router.replace('/login');
    } else if (isAuthenticated && inLoginRoute) {
      router.replace('/');
    }
  }, [rootState?.key, isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
      <AuthProvider>
        <AuthGuard>
          <SettingsProvider>
            <ColorSchemeProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <StatusBar style="dark"></StatusBar>
                <Stack screenOptions={{
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                  headerShown: false
                }}>
                  <Stack.Screen name="(tabs)" options={{ title: "" }} />
                  <Stack.Screen name="volume-detail" options={{ title: "" }} />
                  <Stack.Screen name="encyclopedia-detail" options={{ title: "" }} />
                  <Stack.Screen name="map-event" options={{ title: "" }} />
                  <Stack.Screen name="browse" options={{ title: "" }} />
                  <Stack.Screen name="login" options={{ title: "" }} />
                  <Stack.Screen name="post-detail" options={{ title: "" }} />
                  <Stack.Screen name="create-post" options={{ title: "" }} />
                  <Stack.Screen name="character-detail" options={{ title: "" }} />
                  <Stack.Screen name="character-graph" options={{ title: "" }} />
                  <Stack.Screen name="settings" options={{ title: "" }} />
                  <Stack.Screen name="about" options={{ title: "" }} />
                  <Stack.Screen name="vip" options={{ title: "" }} />
                  <Stack.Screen name="feedback" options={{ title: "" }} />
                  <Stack.Screen name="contact" options={{ title: "" }} />
                  <Stack.Screen name="edit-profile" options={{ title: "" }} />
                  <Stack.Screen name="bookmarks" options={{ title: "" }} />
                  <Stack.Screen name="notes" options={{ title: "" }} />
                  <Stack.Screen name="reading-stats" options={{ title: "" }} />
                  <Stack.Screen name="historical-maps" options={{ title: "" }} />
                  <Stack.Screen name="characters" options={{ title: "" }} />
                  <Stack.Screen name="titles" options={{ title: "" }} />
                  <Stack.Screen name="events" options={{ title: "" }} />
                  <Stack.Screen name="quotes" options={{ title: "" }} />
                  <Stack.Screen name="era-names" options={{ title: "" }} />
                  <Stack.Screen name="group-chat" options={{ title: "" }} />
                  <Stack.Screen name="chat-rooms" options={{ title: "" }} />
                  <Stack.Screen name="create-character" options={{ title: "" }} />
                  <Stack.Screen name="geography" options={{ title: "" }} />
                  <Stack.Screen name="geography-detail" options={{ title: "" }} />
                  <Stack.Screen name="era-detail" options={{ title: "" }} />
                  <Stack.Screen name="encyclopedia-search" options={{ title: "" }} />
                </Stack>
                <Toast />
              </GestureHandlerRootView>
            </ColorSchemeProvider>
          </SettingsProvider>
        </AuthGuard>
      </AuthProvider>
  );
}
