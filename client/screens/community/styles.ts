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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    myPostsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    myPostsButtonActive: {
      backgroundColor: theme.primary,
    },
    notificationButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.error,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    postActions: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
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
      marginBottom: Spacing.sm,
    },
    singleImage: {
      width: '100%',
      height: 200,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.md,
    },
    grid2: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginBottom: Spacing.md,
    },
    gridImage2: {
      flex: 1,
      height: 120,
      borderRadius: BorderRadius.md,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.md,
    },
    gridItem: {
      width: '32%',
      aspectRatio: 1,
      position: 'relative',
    },
    gridImage: {
      width: '100%',
      height: '100%',
      borderRadius: BorderRadius.md,
    },
    moreImagesOverlay: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
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
    loadingMore: {
      paddingVertical: Spacing.lg,
      alignItems: 'center',
    },
  });
};
