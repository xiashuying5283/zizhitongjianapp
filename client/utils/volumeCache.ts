/**
 * 卷数据缓存 - 只缓存当前阅读的一卷
 */

export interface Paragraph {
  id: number;
  volume_number: number;
  year_mark: string;
  emperor: string;
  bc_year: number | null;
  event_index: number;
  paragraph_index: number;
  global_index: number;  // 全局索引，用于计算阅读进度
  content: string;
  content_traditional?: string | null;
  with_notes: string | null;
  with_notes_traditional?: string | null;
  translation: string | null;
  translation_traditional?: string | null;
  is_chenguangyue: boolean;
}

export interface YearGroup {
  emperor: string;
  emperor_title?: string | null;
  year_mark: string;
  year_display?: string;
  era_name?: string | null;
  era_phase?: string | null;
  gan_zhi?: string | null;
  bc_year: number | null;
  emperor_note?: string | null;
  paragraphs: Paragraph[];
}

export interface VolumeData {
  volume_number: number;
  years: YearGroup[];
}

export interface CatalogYear {
  id: number;
  year_name: string;
  year_display: string;
  year_num?: number;
  bc_year: number | null;
}

export interface CatalogEmperor {
  emperor: {
    id: number;
    name: string;
  };
  years: CatalogYear[];
}

export interface CatalogData {
  volume: {
    id: number;
    volume_number: number;
    title?: string;
  };
  catalog: CatalogEmperor[];
}

// 缓存当前阅读的卷
let cachedVolumeNumber: number | null = null;
let cachedVolumeData: VolumeData | null = null;
let cachedCatalogData: CatalogData | null = null;

/**
 * 获取缓存的卷数据
 */
export function getCachedVolume(volumeNumber: number): {
  volumeData: VolumeData | null;
  catalogData: CatalogData | null;
} {
  if (cachedVolumeNumber === volumeNumber) {
    return {
      volumeData: cachedVolumeData,
      catalogData: cachedCatalogData,
    };
  }
  return { volumeData: null, catalogData: null };
}

/**
 * 缓存卷数据
 */
export function setCachedVolume(
  volumeNumber: number,
  volumeData: VolumeData,
  catalogData: CatalogData | null
): void {
  cachedVolumeNumber = volumeNumber;
  cachedVolumeData = volumeData;
  cachedCatalogData = catalogData;
}

/**
 * 清除缓存
 */
export function clearVolumeCache(): void {
  cachedVolumeNumber = null;
  cachedVolumeData = null;
  cachedCatalogData = null;
}
