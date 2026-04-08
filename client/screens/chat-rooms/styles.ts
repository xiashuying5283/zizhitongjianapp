import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing["5xl"],
    },
    container: {
      flex: 1,
    },
    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing["2xl"],
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    // 新建按钮
    newButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      gap: Spacing.xs,
    },
    newButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    // 空状态
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing["5xl"],
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: Spacing.md,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    emptyButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    emptyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    // 群聊列表
    listContainer: {
      paddingHorizontal: Spacing["2xl"],
    },
    dateGroup: {
      marginBottom: Spacing.lg,
    },
    dateTitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: Spacing.sm,
      fontWeight: '600',
    },
    roomCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    roomHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    },
    roomTitle: {
      flex: 1,
    },
    roomTitleText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: Spacing.xs,
    },
    roomMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    roomMetaText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    deleteButton: {
      padding: Spacing.xs,
    },
    roomFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    roomCharacters: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    characterAvatars: {
      flexDirection: 'row',
    },
    characterAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -8,
      borderWidth: 2,
      borderColor: theme.backgroundSecondary,
    },
    characterAvatarText: {
      fontSize: 12,
      textAlign: 'center',
    },
    moreCharacters: {
      fontSize: 11,
      color: theme.textMuted,
      marginLeft: Spacing.xs,
    },
    roomStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    statText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    // 状态标签
    statusBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
    },
    statusActive: {
      backgroundColor: theme.primary + '20',
    },
    statusEnded: {
      backgroundColor: theme.backgroundTertiary,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
};
