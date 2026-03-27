import { View, Text, ActivityIndicator } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { styles } from './styles';

export default function DemoPage() {
  const { theme, isDark } = useTheme();

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View
        style={styles.container}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{...styles.title, color: theme.textPrimary}}>应用开发中</Text>
        <Text style={{...styles.description, color: theme.textSecondary}}>请稍候，界面即将呈现</Text>
      </View>
    </Screen>
  );
}
