import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing["2xl"],
      paddingTop: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing.lg,
      backgroundColor: theme.backgroundRoot,
    },
    createButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryContainer: {
      flexDirection: 'row',
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundRoot,
      gap: Spacing.sm,
    },
    categoryTab: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    categoryTabActive: {
      backgroundColor: theme.primary,
    },
    myPostsContainer: {
      paddingHorizontal: Spacing["2xl"],
      marginBottom: Spacing.md,
    },
    myPostsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      alignSelf: 'flex-start',
    },
    myPostsButtonActive: {
      backgroundColor: theme.primary,
    },
    myPostsButtonText: {
      fontSize: 14,
    },
    listContent: {
      paddingHorizontal: Spacing["2xl"],
      paddingTop: Spacing.md,
      paddingBottom: Spacing["5xl"],
    },
    postCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    postMeta: {
      flex: 1,
      marginLeft: Spacing.sm,
    },
    pinnedTag: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.xs,
      backgroundColor: theme.error,
    },
    postTitle: {
      marginBottom: Spacing.xs,
    },
    postContent: {
      lineHeight: 22,
      marginBottom: Spacing.md,
    },
    postFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    categoryTag: {
      marginLeft: 'auto',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.xs,
      backgroundColor: theme.backgroundTertiary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing["6xl"],
    },
    emptyText: {
      marginTop: Spacing.lg,
    },
  });
};
