import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function AppTabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const renderTabIcon = (name: ComponentProps<typeof FontAwesome6>['name']) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <View
        style={{
          minWidth: 42,
          height: 34,
          paddingHorizontal: 10,
          borderRadius: 9999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? theme.primarySoft : 'transparent',
          borderWidth: focused ? 1 : 0,
          borderColor: focused ? theme.border : 'transparent',
        }}
      >
        <FontAwesome6
          name={name}
          size={focused ? 18 : 17}
          color={color}
          solid={focused}
        />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          height: Platform.OS === 'web' ? 72 : 62 + insets.bottom,
          paddingBottom: Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 8),
          paddingTop: 8,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarItemStyle: {
          height: Platform.OS === 'web' ? 72 : undefined,
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '阅读',
          tabBarLabel: '阅读',
          tabBarIcon: renderTabIcon('book-open'),
        }}
      />
      <Tabs.Screen
        name="encyclopedia"
        options={{
          title: '探索',
          tabBarLabel: '探索',
          tabBarIcon: renderTabIcon('compass'),
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '社区',
          tabBarLabel: '社区',
          tabBarIcon: renderTabIcon('comments'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarLabel: '我的',
          tabBarIcon: renderTabIcon('user'),
        }}
      />
    </Tabs>
  );
}
