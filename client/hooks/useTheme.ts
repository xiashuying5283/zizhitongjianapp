import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSettings } from '@/contexts/SettingsContext';

function getTheme(colorScheme?: 'dark' | 'light' | null) {
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  return {
    theme,
    isDark,
  };
}

function useTheme() {
  const systemColorScheme = useColorScheme();
  const settings = useSettings();
  
  // 根据用户设置决定使用哪个主题
  let colorScheme: 'dark' | 'light' | null = systemColorScheme ?? null;
  if (settings.themeMode === 'dark') {
    colorScheme = 'dark';
  } else if (settings.themeMode === 'light') {
    colorScheme = 'light';
  }
  // 'system' 模式下使用系统设置

  return {
    ...getTheme(colorScheme),
    fontSize: settings.fontSize,
  };
}

export {
  useTheme,
}
