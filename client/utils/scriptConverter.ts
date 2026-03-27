import * as OpenCC from 'opencc-js';

// 简体转繁体转换器
const s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });

/**
 * 将简体中文转换为繁体中文
 */
export function toTraditional(text: string): string {
  if (!text) return text;
  return s2tConverter(text);
}

/**
 * 根据脚本模式转换文字
 * @param text - 简体中文文字
 * @param mode - 'simplified' 或 'traditional'
 */
export function convertScript(text: string, mode: 'simplified' | 'traditional'): string {
  if (!text) return text;
  if (mode === 'simplified') return text;
  return toTraditional(text);
}
