import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Font from 'expo-font';
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ColorSchemeProvider } from '@/hooks/useColorScheme';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'RareCJKSubset': require('@/assets/fonts/RareCJKSubset.ttf'),
        });
        console.log('RareCJKSubset font loaded');
      } catch (error) {
        console.warn('Failed to load RareCJKSubset font:', error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <ColorSchemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark"></StatusBar>
            <Stack screenOptions={{
              // 设置所有页面的切换动画为从右侧滑入，适用于iOS 和 Android
              animation: 'slide_from_right',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              // 隐藏自带的头部
              headerShown: false
            }}>
              <Stack.Screen name="(tabs)" options={{ title: "" }} />
              <Stack.Screen name="volume-detail" options={{ title: "" }} />
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
            </Stack>
            <Toast />
          </GestureHandlerRootView>
        </ColorSchemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
