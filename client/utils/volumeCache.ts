/**
 * 卷数据缓存 - 只缓存当前阅读的一卷
 */

interface Paragraph {
  id: number;
  volume_number: number;
  year_mark: string;
  emperor: string;
  bc_year: number | null;
  event_index: number;
  paragraph_index: number;
  content: string;
  with_notes: string | null;
  translation: string | null;
  is_chenguangyue: boolean;
}

interface YearGroup {
  emperor: string;
  year_mark: string;
  bc_year: number | null;
  paragraphs: Paragraph[];
}

interface VolumeData {
  volume_number: number;
  years: YearGroup[];
}

interface CatalogYear {
  id: number;
  year_name: string;
  year_num: number;
  year_display: string;
  bc_year: number;
}

interface CatalogEmperor {
  emperor: {
    id: number;
    name: string;
  };
  years: CatalogYear[];
}

interface CatalogData {
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
