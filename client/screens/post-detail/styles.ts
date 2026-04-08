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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing["5xl"],
    },
    postContainer: {
      padding: Spacing["2xl"],
      borderBottomWidth: Spacing.md,
      borderBottomColor: theme.backgroundTertiary,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    smallAvatar: {
      width: 32,
      height: 32,
    },
    postMeta: {
      flex: 1,
      marginLeft: Spacing.sm,
    },
    postTitle: {
      marginBottom: Spacing.md,
    },
    postContent: {
      lineHeight: 26,
      marginBottom: Spacing.lg,
    },
    postActions: {
      flexDirection: 'row',
      gap: Spacing.xl,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    commentsSection: {
      padding: Spacing["2xl"],
    },
    commentsTitle: {
      marginBottom: Spacing.lg,
    },
    emptyComments: {
      paddingVertical: Spacing["3xl"],
      alignItems: 'center',
    },
    commentItem: {
      marginBottom: Spacing.lg,
      padding: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
    },
    replyItem: {
      marginLeft: Spacing["3xl"],
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
    },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    commentMeta: {
      marginLeft: Spacing.sm,
      flex: 1,
    },
    commentContent: {
      lineHeight: 22,
      marginBottom: Spacing.sm,
    },
    commentActions: {
      flexDirection: 'row',
      gap: Spacing.lg,
    },
    repliesContainer: {
      marginTop: Spacing.sm,
    },
    commentInputContainer: {
      padding: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    replyingTo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.sm,
    },
    commentInput: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.sm,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      padding: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      fontSize: 16,
      color: theme.textPrimary,
    },
    submitButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
    },
    submitButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
    },
  });
};
