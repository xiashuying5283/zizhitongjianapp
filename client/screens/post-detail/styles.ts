import { StyleSheet, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
      marginBottom: Spacing.lg,
    },
    contentText: {
      lineHeight: 26,
      marginBottom: Spacing.md,
    },
    singleImage: {
      width: '100%',
      height: 200,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
    },
    grid2: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: Spacing.md,
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
      marginTop: Spacing.md,
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
    deleteCommentButton: {
      padding: Spacing.xs,
    },
    highlightedComment: {
      backgroundColor: theme.accent + '15', // 半透明背景
      borderWidth: 1.5,
      borderColor: theme.accent,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      minWidth: 200,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    menuItemDestructive: {
      borderBottomWidth: 0,
    },
    imageModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageModalClose: {
      position: 'absolute',
      top: 50,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    imageModalContent: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    },
    imageScrollContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageTouchable: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullscreenImage: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT * 0.8,
    },
    imageIndicator: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
  });
};
