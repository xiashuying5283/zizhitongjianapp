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
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    publishButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
    },
    publishButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
    },
    scrollContent: {
      flexGrow: 1,
      padding: Spacing["2xl"],
    },
    categorySection: {
      marginBottom: Spacing.xl,
    },
    label: {
      marginBottom: Spacing.sm,
    },
    categoryOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
    },
    categoryOptionActive: {
      backgroundColor: theme.primary,
    },
    inputSection: {
      marginBottom: Spacing.xl,
    },
    titleInput: {
      padding: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    charCount: {
      textAlign: 'right',
      marginTop: Spacing.xs,
    },
    contentInput: {
      padding: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      fontSize: 16,
      lineHeight: 24,
      minHeight: 200,
      color: theme.textPrimary,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    imageWrapper: {
      width: 80,
      height: 80,
      position: 'relative',
    },
    previewImage: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.md,
    },
    removeImageButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.error,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    imageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
    },
  });
};
