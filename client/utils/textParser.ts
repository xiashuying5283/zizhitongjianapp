/**
 * 文本解析模块 - 识别人名和官职
 * 用于在阅读文本中标记可点击的百科词条
 */

// 示例人名列表（实际应从 API 获取）
export const SAMPLE_CHARACTERS = [
  '秦始皇', '嬴政', '赵政', '刘邦', '刘季', '沛公', '汉高祖',
  '项羽', '项籍', '楚霸王',
  '韩信', '张良', '张子房', '孔明', '诸葛孔明',
  '萧何', '吕雉', '吕后',
  '曹操', '曹孟德', '魏武帝',
  '刘备', '刘玄德', '昭烈帝',
  '孙权', '孙仲谋', '吴大帝',
  '诸葛亮', '卧龙'
];

// 示例官职列表（实际应从 API 获取）
export const SAMPLE_TITLES = [
  '丞相', '相国', '宰相', '太尉', '大将军',
  '尚书令', '御史大夫', '太傅'
];

/**
 * 文本片段类型
 */
export interface TextSegment {
  text: string;
  isEntity: boolean;
  entityType?: 'character' | 'title';
  entityName?: string;
}

/**
 * 解析文本，标记人名和官职
 * @param text 原始文本
 * @param characters 人名列表
 * @param titles 官职列表
 */
export function parseTextForEntities(
  text: string,
  characters: string[] = SAMPLE_CHARACTERS,
  titles: string[] = SAMPLE_TITLES
): TextSegment[] {
  if (!text || text.length === 0) {
    return [{ text, isEntity: false }];
  }

  const segments: TextSegment[] = [];
  let currentIndex = 0;
  let lastIndex = 0;

  // 合并所有实体名称，按长度降序排序（优先匹配长名称）
  const allEntities = [
    ...characters.map(name => ({ name, type: 'character' as const })),
    ...titles.map(name => ({ name, type: 'title' as const }))
  ].sort((a, b) => b.name.length - a.name.length);

  while (currentIndex < text.length) {
    let matched = false;

    // 查找当前位置是否有匹配的实体
    for (const entity of allEntities) {
      if (text.startsWith(entity.name, currentIndex)) {
        // 找到匹配，先添加之前的普通文本
        if (currentIndex > lastIndex) {
          segments.push({
            text: text.substring(lastIndex, currentIndex),
            isEntity: false
          });
        }

        segments.push({
          text: entity.name,
          isEntity: true,
          entityType: entity.type,
          entityName: entity.name
        });

        lastIndex = currentIndex + entity.name.length;
        currentIndex = lastIndex;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 没有匹配，继续向前
      const nextIndex = findNextEntityStart(text, currentIndex + 1, allEntities);
      
      if (nextIndex === -1) {
        // 剩余文本中没有实体
        if (currentIndex < text.length) {
          if (currentIndex > lastIndex) {
            segments.push({
              text: text.substring(lastIndex, currentIndex),
              isEntity: false
            });
          }
          segments.push({
            text: text.substring(currentIndex),
            isEntity: false
          });
        }
        break;
      } else {
        currentIndex = nextIndex;
      }
    }
  }

  return segments;
}

/**
 * 查找下一个实体的起始位置
 */
function findNextEntityStart(
  text: string,
  startIndex: number,
  entities: { name: string; type: string }[]
): number {
  let minIndex = -1;

  for (const entity of entities) {
    const index = text.indexOf(entity.name, startIndex);
    if (index !== -1 && (minIndex === -1 || index < minIndex)) {
      minIndex = index;
    }
  }

  return minIndex;
}

/**
 * 批量获取文本中的所有实体名称
 */
export function extractEntityNamesFromText(
  text: string,
  characters: string[] = SAMPLE_CHARACTERS,
  titles: string[] = SAMPLE_TITLES
): Set<string> {
  const segments = parseTextForEntities(text, characters, titles);
  const entityNames = new Set<string>();

  for (const segment of segments) {
    if (segment.isEntity && segment.entityName) {
      entityNames.add(segment.entityName);
    }
  }

  return entityNames;
}
