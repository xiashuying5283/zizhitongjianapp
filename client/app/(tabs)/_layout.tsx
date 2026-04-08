import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.backgroundDefault,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          height: Platform.OS === 'web' ? 64 : 54 + insets.bottom,
          paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
          paddingTop: Platform.OS === 'web' ? 8 : 4,
          // 有色阴影
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 4,
        },
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarItemStyle: {
          height: Platform.OS === 'web' ? 64 : undefined,
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '阅读',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 
              name={focused ? "book-open" : "book-open"} 
              size={focused ? 22 : 20} 
              color={color}
              solid={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="encyclopedia"
        options={{
          title: '百科',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6
              name="book"
              size={focused ? 22 : 20}
              color={color}
              solid={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          title: '地图',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 
              name="map" 
              size={focused ? 22 : 20} 
              color={color}
              solid={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '社区',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 
              name="comments" 
              size={focused ? 22 : 20} 
              color={color}
              solid={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 
              name="user" 
              size={focused ? 22 : 20} 
              color={color}
              solid={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
