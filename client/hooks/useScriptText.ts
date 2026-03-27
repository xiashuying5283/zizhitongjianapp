import { useCallback } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { convertScript } from '@/utils/scriptConverter';

/**
 * 根据简繁设置转换文字的 Hook
 * @returns 转换函数 t
 */
export function useScriptText() {
  const { scriptMode } = useSettings();

  /**
   * 将简体中文文字转换为当前设置的文字
   * @param text - 简体中文文字
   */
  const t = useCallback((text: string): string => {
    return convertScript(text, scriptMode);
  }, [scriptMode]);

  return { t, scriptMode };
}
