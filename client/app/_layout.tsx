import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ColorSchemeProvider } from '@/hooks/useColorScheme';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
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
            </Stack>
            <Toast />
          </GestureHandlerRootView>
        </ColorSchemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
