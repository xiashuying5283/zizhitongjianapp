/**
 * 检测字符是否为 CJK 扩展区生僻字（系统字体通常不支持）
 * - CJK Extension B: U+20000 ~ U+2A6DF
 * - CJK Extension C: U+2A700 ~ U+2B73F
 * - CJK Extension D: U+2B740 ~ U+2B81F
 * - CJK Extension E: U+2B820 ~ U+2CEAF
 * - CJK Extension F: U+2CEB0 ~ U+2EBEF
 * - CJK Extension G: U+30000 ~ U+3134F
 * - CJK Extension H: U+31350 ~ U+323AF
 * - CJK Extension I: U+2EBF0 ~ U+2EE5F
 */
export function isRareCJK(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;
  return (
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0x2a700 && code <= 0x2b73f) ||
    (code >= 0x2b740 && code <= 0x2b81f) ||
    (code >= 0x2b820 && code <= 0x2ceaf) ||
    (code >= 0x2ceb0 && code <= 0x2ebef) ||
    (code >= 0x30000 && code <= 0x3134f) ||
    (code >= 0x31350 && code <= 0x323af) ||
    (code >= 0x2ebf0 && code <= 0x2ee5f)
  );
}

/**
 * 将文本拆分为普通段和生僻字段
 * 每段包含连续的同类字符
 */
interface TextSegment {
  text: string;
  isRare: boolean;
}

export function splitRareSegments(text: string): TextSegment[] {
  if (!text) return [];

  // 使用 for...of 正确处理 surrogate pairs（如 U+26407 的代理对）
  const segments: TextSegment[] = [];
  let current = '';
  let currentIsRare = false;

  for (const char of text) {
    const rare = isRareCJK(char);
    if (current === '') {
      current = char;
      currentIsRare = rare;
    } else if (rare === currentIsRare) {
      current += char;
    } else {
      segments.push({ text: current, isRare: currentIsRare });
      current = char;
      currentIsRare = rare;
    }
  }

  if (current) {
    segments.push({ text: current, isRare: currentIsRare });
  }

  return segments;
}

/**
 * 检查文本是否包含生僻字
 */
export function containsRareChar(text: string): boolean {
  for (const char of text) {
    if (isRareCJK(char)) return true;
  }
  return false;
}
