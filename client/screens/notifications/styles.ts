import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    markReadButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      flexGrow: 1,
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: Spacing["2xl"],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.backgroundDefault,
    },
    unreadItem: {
      backgroundColor: theme.backgroundTertiary,
    },
    notificationIcon: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    notificationContent: {
      flex: 1,
    },
    postTitle: {
      marginTop: Spacing.xs,
    },
    preview: {
      marginTop: Spacing.xs,
      fontStyle: 'italic',
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
      marginTop: Spacing.sm,
    },
  });
};
