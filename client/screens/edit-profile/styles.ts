import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: BorderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraIcon: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.backgroundRoot,
    },
    changeAvatarText: {
      marginTop: Spacing.md,
    },
    section: {
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    fieldItem: {
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    fieldLabel: {
      marginBottom: Spacing.sm,
    },
    fieldInput: {
      fontSize: 16,
      color: theme.textPrimary,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
    },
    fieldHint: {
      marginTop: Spacing.xs,
    },
    tipsSection: {
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    tipsText: {
      lineHeight: 22,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
      backgroundColor: theme.backgroundRoot,
    },
    saveButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
  });
};
