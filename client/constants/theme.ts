export const Colors = {
  light: {
    // === 文字层级（灰度区分） ===
    textPrimary: "#1A1A1A", // 原文 - 纯黑（最高优先级）
    textSecondary: "#444444", // 译文/次要 - 中灰
    textMuted: "#666666", // 辅助文字 - 浅灰
    // === 主题色 ===
    primary: "#1A1A1A", // 主色 - 纯黑
    accent: "#1A365D", // 辅色 - 低饱和藏蓝（链接/交互）
    success: "#2D5A3D", // 成功 - 低饱和绿
    error: "#8B3A3A", // 错误 - 低饱和红
    // === 背景层级 ===
    backgroundRoot: "#F8F6F2", // 根背景 - 米白/宣纸色
    backgroundDefault: "#FDFCFA", // 卡片背景 - 近白
    backgroundSecondary: "#F5F3EF", // 二级背景 - 浅米灰
    backgroundTertiary: "#F2F0EC", // 三级背景 - 浅米灰
    // === 按钮 ===
    buttonPrimaryText: "#FFFFFF", // 主按钮文字 - 白色
    // === Tab ===
    tabIconSelected: "#1A1A1A", // Tab 选中图标 - 纯黑
    // === 边框 ===
    border: "#E8E6E2", // 边框 - 细线灰
    borderLight: "#F0EEE8", // 浅色边框
    // === 阅读区专用 ===
    textOriginal: "#1A1A1A", // 原文 - 纯黑粗体
    textAnnotation: "#A84448", // 胡三省注 - 浅红（古注色）
    textTranslation: "#444444", // 译文 - 中灰
    backgroundAnnotation: "#F5F3EF", // 注文背景
    backgroundTranslation: "#FAF8F4", // 译文背景
    // === 状态色 ===
    statusReading: "#D97706", // 在读 - 琥珀色
    statusRead: "#059669", // 已读 - 翠绿
    statusUnread: "#9CA3AF", // 未读 - 浅灰
  },
  dark: {
    // === 文字层级（深色模式） ===
    textPrimary: "#FAFAF9", // 主要文字 - 纸张白
    textSecondary: "#B8B8B8", // 次要文字 - 中灰
    textMuted: "#78716C", // 辅助文字 - 深灰
    // === 主题色 ===
    primary: "#FAFAF9", // 主色 - 纸张白
    accent: "#A3B8CC", // 辅色 - 浅藏蓝
    success: "#6EE7B7", // 成功 - 浅绿
    error: "#FCA5A5", // 错误 - 浅红
    // === 背景层级 ===
    backgroundRoot: "#121212", // 根背景 - 深灰（护眼）
    backgroundDefault: "#1E1E1E", // 卡片背景
    backgroundSecondary: "#1A1A1A", // 二级背景
    backgroundTertiary: "#2A2A2A", // 三级背景
    // === 按钮 ===
    buttonPrimaryText: "#121212", // 主按钮文字 - 深灰
    // === Tab ===
    tabIconSelected: "#FAFAF9", // Tab 选中图标 - 纸张白
    // === 边框 ===
    border: "#2A2A2A", // 边框
    borderLight: "#1E1E1E", // 浅色边框
    // === 阅读区专用 ===
    textOriginal: "#FAFAF9", // 原文 - 纸张白
    textAnnotation: "#D67878", // 胡三省注 - 浅红（古注色）
    textTranslation: "#999999", // 译文 - 浅灰
    backgroundAnnotation: "#1A1A1A", // 注文背景
    backgroundTranslation: "#161616", // 译文背景
    // === 状态色 ===
    statusReading: "#FBBF24", // 在读 - 琥珀色
    statusRead: "#34D399", // 已读 - 翠绿
    statusUnread: "#6B7280", // 未读 - 浅灰
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -4,
  },
  displayLarge: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -2,
  },
  displayMedium: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "200" as const,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "300" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  smallMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  labelTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  stat: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "300" as const,
  },
  tiny: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "400" as const,
  },
  navLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500" as const,
  },
  // === 古籍阅读专用 ===
  original: {
    fontSize: 18,
    lineHeight: 32,
    fontWeight: "500" as const,
  },
  annotation: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  translation: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  paragraphLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500" as const,
    letterSpacing: 1,
  },
};

export type Theme = typeof Colors.light;
