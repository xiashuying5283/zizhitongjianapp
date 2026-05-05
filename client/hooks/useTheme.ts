import { ThemePalettes } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSettings } from '@/contexts/SettingsContext';

function getTheme(themeVariant: keyof typeof ThemePalettes, colorScheme?: 'dark' | 'light' | null) {
  const isDark = colorScheme === 'dark';
  const theme = ThemePalettes[themeVariant][colorScheme ?? 'light'];

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
    ...getTheme(settings.themeVariant, colorScheme),
    fontSize: settings.fontSize,
  };
}

export {
  useTheme,
}
