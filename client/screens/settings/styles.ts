import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    section: {
      marginBottom: Spacing["2xl"],
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    // Font Size
    fontSizePreview: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    fontSizeOptions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    fontSizeButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      marginHorizontal: Spacing.xs,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      alignItems: 'center',
    },
    fontSizeButtonActive: {
      borderWidth: 2,
    },
    fontSizeSlider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
    },
    // Settings
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    settingInfoWithDesc: {
      flex: 1,
    },
    settingIcon: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Reset
    resetButton: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
    },
  });
};
