import { StyleSheet } from 'react-native';
import {Spacing} from "@/constants/theme";

// 设计稿配色
export const COLORS = {
  background: 'rgb(249,247,241)',       // 温暖米色背景
  cardBg: 'rgb(255,255,255)',           // 白色卡片
  primary: 'rgb(166,49,49)',            // 深红/枣红色
  primaryLight: 'rgba(166,49,49,0.08)', // 浅红背景
  primaryBorder: 'rgba(166,49,49,0.15)', // 红色边框
  textPrimary: 'rgb(44,36,32)',         // 深褐色文字
  textSecondary: 'rgb(100,90,85)',      // 中褐色
  textMuted: 'rgb(120,110,105)',        // 浅褐色
  textHint: 'rgb(150,140,130)',         // 更浅的文字
  border: 'rgba(230,224,216,0.8)',      // 米黄色边框
  borderLight: 'rgba(230,224,216,0.5)', // 更浅的边框
  divider: 'rgba(230,224,216,1)',       // 分割线
  searchBg: 'rgba(230,224,216,0.5)',    // 搜索框背景
};

export const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.searchBg,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 12,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 16,
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 24,
  },
  tab: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 16,
    height: 4,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eraName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
  dynastyBadge: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  dynastyText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
  cardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emperorName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dot: {
    fontSize: 14,
    color: 'rgb(200,190,180)',
  },
  yearCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  cardBottom: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: COLORS.divider,
    paddingTop: 12,
  },
  yearRange: {
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textHint,
  },
  // 朝代分割线
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  sectionDividerLeft: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
    marginRight: 12,
  },
  sectionDividerRight: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 12,
  },
  sectionLabel: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 4,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
});
