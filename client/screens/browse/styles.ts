import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing.xl,
    },
    title: {
      marginBottom: Spacing.sm,
    },
    subtitle: {
      lineHeight: 22,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xs,
      marginBottom: Spacing.xl,
    },
    tab: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: theme.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
    },
    activeTabText: {
      color: theme.buttonPrimaryText,
    },
    inactiveTabText: {
      color: theme.textSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
    },
    loadingText: {
      marginTop: Spacing.md,
      color: theme.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing['3xl'],
    },
    emptyText: {
      color: theme.textMuted,
    },
    // 按帝王浏览
    emperorSection: {
      marginBottom: Spacing.xl,
    },
    emperorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    emperorIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    emperorInfo: {
      flex: 1,
    },
    emperorName: {
      fontWeight: '600',
      marginBottom: Spacing.xs,
    },
    emperorMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emperorYear: {
      fontSize: 12,
      color: theme.textMuted,
    },
    volumeCount: {
      fontSize: 12,
      color: theme.primary,
      marginLeft: Spacing.sm,
    },
    volumeList: {
      marginLeft: Spacing.xl + Spacing.md,
    },
    volumeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    volumeNumber: {
      width: 40,
      fontSize: 13,
      color: theme.textMuted,
    },
    volumeName: {
      flex: 1,
      fontSize: 14,
      color: theme.textPrimary,
    },
    volumeYear: {
      fontSize: 12,
      color: theme.textMuted,
    },
    // 按时间轴浏览
    timelineContainer: {
      paddingLeft: Spacing.xl,
    },
    timelineItem: {
      position: 'relative',
      paddingBottom: Spacing.xl,
      borderLeftWidth: 2,
      borderLeftColor: theme.border,
      marginLeft: Spacing.lg,
      paddingLeft: Spacing.lg,
    },
    timelineLastItem: {
      borderLeftWidth: 0,
    },
    timelineDot: {
      position: 'absolute',
      left: -7,
      top: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.backgroundRoot,
    },
    timelineYear: {
      fontWeight: '600',
      marginBottom: Spacing.xs,
    },
    timelineContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    timelineEmperor: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    timelineDivider: {
      marginHorizontal: Spacing.sm,
      color: theme.textMuted,
    },
    timelineVolume: {
      fontSize: 13,
      color: theme.primary,
    },
    // 按事件浏览
    eventCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    },
    eventTitle: {
      flex: 1,
      fontWeight: '600',
      marginRight: Spacing.sm,
    },
    eventYear: {
      fontSize: 12,
      color: theme.primary,
      backgroundColor: theme.backgroundTertiary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    eventMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    eventEmperor: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    eventContent: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },
  });
};
