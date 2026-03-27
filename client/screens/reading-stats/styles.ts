import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing['3xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRight: {
      width: 40,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    summaryCard: {
      width: `47%`,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
    },
    summaryValue: {
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    section: {
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.md,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundDefault,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    periodItem: {
      flex: 1,
      alignItems: 'center',
    },
    periodDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.border,
    },
    achievementsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    achievementCard: {
      width: `48%`,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      position: 'relative',
    },
    achievementCardLocked: {
      opacity: 0.6,
    },
    achievementIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    achievementTitle: {
      marginBottom: 2,
    },
    achievementDesc: {
      lineHeight: 16,
    },
    unlockedIcon: {
      position: 'absolute',
      top: Spacing.sm,
      right: Spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    dailyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    dailyDate: {
      width: 60,
    },
    dailyStats: {
      flexDirection: 'row',
      gap: Spacing.lg,
    },
    dailyStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
  });
};
