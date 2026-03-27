import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundRoot,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      alignItems: 'center',
    },
    resetButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
    },
    eraContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
      backgroundColor: theme.backgroundRoot,
    },
    eraChip: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    eraChipActive: {
      backgroundColor: theme.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedInfo: {
      position: 'absolute',
      bottom: 100,
      left: Spacing.lg,
      right: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    selectedInfoContent: {
      flex: 1,
    },
    selectedInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedAvatar: {
      width: 52,
      height: 52,
      borderRadius: BorderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    selectedInfoText: {
      flex: 1,
    },
    selectedInfoMeta: {
      flexDirection: 'row',
      marginTop: 2,
    },
    actionButtons: {
      flexDirection: 'row',
      marginTop: Spacing.md,
      gap: Spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
      gap: Spacing.sm,
    },
    secondaryButton: {
      backgroundColor: theme.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    closeButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
    },
  });
};
