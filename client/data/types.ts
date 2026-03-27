/**
 * 历史地图通用类型定义
 */

// 地点类型
export interface HistoricalLocation {
  id: string;
  name: string;
  modernName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'capital' | 'battlefield' | 'strategic' | 'city';
  description: string;
  faction?: string; // 阵营标识，如 'han', 'chu', 'wei', 'shu', 'wu', 'tang', 'rebel' 等
}

// 时间线事件类型
export interface HistoricalEvent {
  id: string;
  date: string;
  year: number;
  title: string;
  description: string;
  locationId: string;
  location: string;
  type: 'battle' | 'political' | 'movement' | 'treaty' | 'other';
  importance: 'major' | 'minor';
  faction?: string;
  month?: number; // 可选的月份
}

// 路线类型
export interface HistoricalRoute {
  id: string;
  name: string;
  path: string[];
  type: string; // 阵营或类型标识
  description: string;
}

// 年份选项
export interface YearOption {
  value: number;
  label: string;
}

// 地图元数据
export interface MapMeta {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  description: string;
  period: string;
  tags: string[];
}

// 统计数据（通用）
export interface HistoricalStats {
  duration: string;
  majorBattles: number;
  keyFigures?: Record<string, string[]>; // 各阵营关键人物
  [key: string]: any; // 允许其他自定义字段
}

// 完整的地图数据
export interface MapData {
  meta: MapMeta;
  locations: HistoricalLocation[];
  events: HistoricalEvent[];
  routes: HistoricalRoute[];
  stats: HistoricalStats;
  yearOptions: YearOption[];
}
